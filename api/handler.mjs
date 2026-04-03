import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

/* ── Environment ── */
const TABLE_NAME  = process.env.TABLE_NAME  || 'ozcta-users';
const JWT_SECRET  = process.env.JWT_SECRET;          // REQUIRED – set in Lambda config
const SITE_URL    = process.env.SITE_URL    || 'https://www.ozcta.com';
const SES_SENDER  = process.env.SES_SENDER  || 'noreply@ozcta.com';
const REGION      = process.env.AWS_REGION  || 'us-west-2';
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY_HOURS = 48;
const JWT_EXPIRY = '30d';

/* ── AWS clients ── */
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const ses = new SESClient({ region: REGION });

/* ── Helpers ── */
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function respond(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/* ── Route handlers ── */

async function handleRegister(body) {
  const { firstName, lastName, email, phone, professional } = body;
  if (!firstName || !lastName || !email || !professional) {
    return respond(400, { error: 'Missing required fields' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check for existing user
  const existing = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
  }));

  if (existing.Item?.passwordHash) {
    return respond(409, { error: 'An account with this email already exists. Please log in.' });
  }

  // Generate a setup token for the create-password link
  const setupToken = generateToken();
  const setupTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  await ddb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      email: normalizedEmail,
      firstName,
      lastName,
      phone: phone || '',
      professional,
      registeredAt: new Date().toISOString(),
      setupToken,
      setupTokenExpiry,
      status: 'pending',          // pending → active once password is set
    },
  }));

  // Send welcome email with password-creation link
  const passwordLink = `${SITE_URL}/create-password?token=${setupToken}&email=${encodeURIComponent(normalizedEmail)}`;

  await ses.send(new SendEmailCommand({
    Source: SES_SENDER,
    Destination: { ToAddresses: [normalizedEmail] },
    Message: {
      Subject: { Data: 'Welcome to The OzCTA System – Set Your Password' },
      Body: {
        Html: {
          Data: `
            <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
              <h1 style="font-size:24px;color:#312e81">Welcome to The OzCTA System!</h1>
              <p style="color:#334155;line-height:1.6">
                Hi ${firstName},<br><br>
                Thanks for registering. To complete your account setup and get full access
                to all strategies, scanners, and trade tracking — please create your password:
              </p>
              <div style="text-align:center;margin:32px 0">
                <a href="${passwordLink}"
                   style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;
                          font-weight:700;text-decoration:none;border-radius:10px;font-size:15px">
                  Create My Password
                </a>
              </div>
              <p style="color:#64748b;font-size:13px;line-height:1.5">
                This link expires in ${TOKEN_EXPIRY_HOURS} hours. If you didn't register, you can safely ignore this email.
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
              <p style="color:#94a3b8;font-size:12px">
                The OzCTA System &mdash; Systematic Trading Tools &amp; Analytics<br>
                <a href="https://x.com/OzCTA" style="color:#6366f1">@OzCTA</a>
              </p>
            </div>
          `,
        },
        Text: {
          Data: `Welcome to The OzCTA System!\n\nHi ${firstName},\n\nCreate your password here: ${passwordLink}\n\nThis link expires in ${TOKEN_EXPIRY_HOURS} hours.\n\n— @OzCTA`,
        },
      },
    },
  }));

  return respond(200, { message: 'Registration successful. Check your email to set your password.' });
}

async function handleCreatePassword(body) {
  const { email, token, password } = body;
  if (!email || !token || !password) {
    return respond(400, { error: 'Missing required fields' });
  }
  if (password.length < 8) {
    return respond(400, { error: 'Password must be at least 8 characters' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const result = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
  }));

  const user = result.Item;
  if (!user) {
    return respond(404, { error: 'Account not found' });
  }
  if (user.setupToken !== token) {
    return respond(400, { error: 'Invalid or expired link. Please register again.' });
  }
  if (new Date(user.setupTokenExpiry) < new Date()) {
    return respond(400, { error: 'This link has expired. Please register again.' });
  }

  // Hash the password (bcrypt includes salt automatically)
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
    UpdateExpression: 'SET passwordHash = :hash, #s = :status REMOVE setupToken, setupTokenExpiry',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':hash': passwordHash,
      ':status': 'active',
    },
  }));

  // Return a JWT so the user is logged in immediately
  const jwtPayload = {
    email: normalizedEmail,
    firstName: user.firstName,
    lastName: user.lastName,
  };
  const authToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

  return respond(200, {
    message: 'Password created successfully',
    token: authToken,
    user: jwtPayload,
  });
}

async function handleLogin(body) {
  const { email, password } = body;
  if (!email || !password) {
    return respond(400, { error: 'Email and password are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const result = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
  }));

  const user = result.Item;
  if (!user || !user.passwordHash) {
    return respond(401, { error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return respond(401, { error: 'Invalid email or password' });
  }

  // Update last login
  await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
    UpdateExpression: 'SET lastLoginAt = :now',
    ExpressionAttributeValues: { ':now': new Date().toISOString() },
  }));

  const jwtPayload = {
    email: normalizedEmail,
    firstName: user.firstName,
    lastName: user.lastName,
  };
  const authToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

  return respond(200, {
    token: authToken,
    user: jwtPayload,
  });
}

/* ── Lambda entry point ── */
export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return respond(200, {});
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET environment variable is not set');
    return respond(500, { error: 'Server configuration error' });
  }

  const path = event.path || event.rawPath || '';
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};

  try {
    if (path.endsWith('/register') && event.httpMethod === 'POST') {
      return await handleRegister(body);
    }
    if (path.endsWith('/create-password') && event.httpMethod === 'POST') {
      return await handleCreatePassword(body);
    }
    if (path.endsWith('/login') && event.httpMethod === 'POST') {
      return await handleLogin(body);
    }
    return respond(404, { error: 'Not found' });
  } catch (err) {
    console.error('Unhandled error:', err);
    return respond(500, { error: 'Internal server error' });
  }
}
