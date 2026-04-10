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

const DEFAULT_ALLOWED_ORIGINS = [
  SITE_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
);

const RATE_LIMIT_RULES = {
  registerIp: { windowMs: 60 * 60 * 1000, maxRequests: 12, blockMs: 60 * 60 * 1000 },
  registerIdentity: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 3, blockMs: 24 * 60 * 60 * 1000 },
  loginIp: { windowMs: 15 * 60 * 1000, maxRequests: 40, blockMs: 30 * 60 * 1000 },
  loginIdentity: { windowMs: 15 * 60 * 1000, maxRequests: 8, blockMs: 30 * 60 * 1000 },
  forgotPasswordIp: { windowMs: 30 * 60 * 1000, maxRequests: 10, blockMs: 30 * 60 * 1000 },
  forgotPasswordIdentity: { windowMs: 60 * 60 * 1000, maxRequests: 5, blockMs: 60 * 60 * 1000 },
  createPasswordIp: { windowMs: 30 * 60 * 1000, maxRequests: 20, blockMs: 30 * 60 * 1000 },
  createPasswordIdentity: { windowMs: 30 * 60 * 1000, maxRequests: 6, blockMs: 60 * 60 * 1000 },
};

const rateLimitStore = new Map();

/* ── AWS clients ── */
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const ses = new SESClient({ region: REGION });

/* ── Helpers ── */
function getRequestOrigin(event) {
  return event?.headers?.origin || event?.headers?.Origin || null;
}

function normalizeOrigin(origin) {
  return origin ? origin.trim().replace(/\/$/, '') : null;
}

function getAllowedOrigin(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return null;
  return ALLOWED_ORIGINS.has(normalizedOrigin) ? normalizedOrigin : null;
}

function buildHeaders(origin, extraHeaders = {}) {
  const allowedOrigin = getAllowedOrigin(origin);

  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Vary': 'Origin',
    ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {}),
    ...extraHeaders,
  };
}

function respond(statusCode, body, options = {}) {
  const { origin = null, extraHeaders = {} } = options;
  return { statusCode, headers: buildHeaders(origin, extraHeaders), body: JSON.stringify(body) };
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getClientIp(event) {
  return (
    event?.requestContext?.http?.sourceIp ||
    event?.requestContext?.identity?.sourceIp ||
    event?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const [localPart, domain] = email.trim().toLowerCase().split('@');
  if (!localPart || !domain) return null;
  if (localPart.length <= 2) return `${localPart[0] || '*'}*@${domain}`;
  return `${localPart.slice(0, 2)}***@${domain}`;
}

function takeRateLimit(key, rule) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (existing?.blockedUntil && existing.blockedUntil > now) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.blockedUntil - now) / 1000)),
    };
  }

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + rule.windowMs, blockedUntil: null });
    return { limited: false };
  }

  existing.count += 1;
  if (existing.count > rule.maxRequests) {
    existing.blockedUntil = now + rule.blockMs;
    rateLimitStore.set(key, existing);
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil(rule.blockMs / 1000)),
    };
  }

  rateLimitStore.set(key, existing);
  return { limited: false };
}

function enforceRateLimits(event, path, body, origin) {
  const clientIp = getClientIp(event);
  const normalizedEmail = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : null;

  const checks = [];
  if (path.includes('/register')) {
    checks.push({ key: `register:ip:${clientIp}`, rule: RATE_LIMIT_RULES.registerIp });
    if (normalizedEmail) {
      checks.push({ key: `register:email:${normalizedEmail}`, rule: RATE_LIMIT_RULES.registerIdentity });
    }
  }

  if (path.includes('/login')) {
    checks.push({ key: `login:ip:${clientIp}`, rule: RATE_LIMIT_RULES.loginIp });
    if (normalizedEmail) {
      checks.push({ key: `login:identity:${clientIp}:${normalizedEmail}`, rule: RATE_LIMIT_RULES.loginIdentity });
    }
  }

  if (path.includes('/forgot-password')) {
    checks.push({ key: `forgot-password:ip:${clientIp}`, rule: RATE_LIMIT_RULES.forgotPasswordIp });
    if (normalizedEmail) {
      checks.push({ key: `forgot-password:identity:${normalizedEmail}`, rule: RATE_LIMIT_RULES.forgotPasswordIdentity });
    }
  }

  if (path.includes('/create-password')) {
    checks.push({ key: `create-password:ip:${clientIp}`, rule: RATE_LIMIT_RULES.createPasswordIp });
    if (normalizedEmail) {
      checks.push({ key: `create-password:identity:${clientIp}:${normalizedEmail}`, rule: RATE_LIMIT_RULES.createPasswordIdentity });
    }
  }

  for (const check of checks) {
    const result = takeRateLimit(check.key, check.rule);
    if (result.limited) {
      return respond(
        429,
        { error: 'Too many attempts. Please wait and try again.' },
        {
          origin,
          extraHeaders: { 'Retry-After': String(result.retryAfterSeconds) },
        }
      );
    }
  }

  return null;
}

function logRequest(event, path, method, body) {
  console.log('Auth request', JSON.stringify({
    path,
    method,
    origin: normalizeOrigin(getRequestOrigin(event)),
    sourceIp: getClientIp(event),
    email: maskEmail(body?.email),
    bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
  }));
}

/* ── Route handlers ── */

async function handleRegister(body, origin) {
  const { firstName, lastName, email, phone, professional } = body;
  if (!firstName || !lastName || !email || !professional) {
    return respond(400, { error: 'Missing required fields' }, { origin });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check for existing user
  const existing = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
  }));

  if (existing.Item?.passwordHash) {
    return respond(409, { error: 'An account with this email already exists. Please log in.' }, { origin });
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

  return respond(200, { message: 'Registration successful. Check your email to set your password.' }, { origin });
}

async function handleCreatePassword(body, origin) {
  const { email, token, password } = body;
  if (!email || !token || !password) {
    return respond(400, { error: 'Missing required fields' }, { origin });
  }
  if (password.length < 8) {
    return respond(400, { error: 'Password must be at least 8 characters' }, { origin });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const result = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
  }));

  const user = result.Item;
  if (!user) {
    return respond(404, { error: 'Account not found' }, { origin });
  }
  if (user.setupToken !== token) {
    return respond(400, { error: 'Invalid or expired link. Please register again.' }, { origin });
  }
  if (new Date(user.setupTokenExpiry) < new Date()) {
    return respond(400, { error: 'This link has expired. Please register again.' }, { origin });
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

  return respond(
    200,
    {
      message: 'Password created successfully',
      token: authToken,
      user: jwtPayload,
    },
    { origin }
  );
}

async function handleForgotPassword(body, origin) {
  const { email } = body;
  if (!email) {
    return respond(400, { error: 'Email is required' }, { origin });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const result = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
  }));

  const user = result.Item;
  if (!user) {
    return respond(
      200,
      { message: 'If an account exists for that email, a reset link has been sent.' },
      { origin }
    );
  }

  const setupToken = generateToken();
  const setupTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
    UpdateExpression: 'SET setupToken = :token, setupTokenExpiry = :expiry',
    ExpressionAttributeValues: {
      ':token': setupToken,
      ':expiry': setupTokenExpiry,
    },
  }));

  const passwordLink = `${SITE_URL}/create-password?token=${setupToken}&email=${encodeURIComponent(normalizedEmail)}`;

  await ses.send(new SendEmailCommand({
    Source: SES_SENDER,
    Destination: { ToAddresses: [normalizedEmail] },
    Message: {
      Subject: { Data: 'OzCTA Password Reset' },
      Body: {
        Html: {
          Data: `
            <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
              <h1 style="font-size:24px;color:#312e81">Reset your OzCTA password</h1>
              <p style="color:#334155;line-height:1.6">
                Hi ${user.firstName || 'there'},<br><br>
                We received a request to reset your password. Use the link below to choose a new one:
              </p>
              <div style="text-align:center;margin:32px 0">
                <a href="${passwordLink}"
                   style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;
                          font-weight:700;text-decoration:none;border-radius:10px;font-size:15px">
                  Reset My Password
                </a>
              </div>
              <p style="color:#64748b;font-size:13px;line-height:1.5">
                This link expires in ${TOKEN_EXPIRY_HOURS} hours. If you didn't request a reset, you can safely ignore this email.
              </p>
            </div>
          `,
        },
        Text: {
          Data: `Reset your OzCTA password\n\nHi ${user.firstName || 'there'},\n\nReset your password here: ${passwordLink}\n\nThis link expires in ${TOKEN_EXPIRY_HOURS} hours.`,
        },
      },
    },
  }));

  return respond(
    200,
    { message: 'If an account exists for that email, a reset link has been sent.' },
    { origin }
  );
}

async function handleLogin(body, origin) {
  const { email, password } = body;
  if (!email || !password) {
    return respond(400, { error: 'Email and password are required' }, { origin });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const result = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
  }));

  const user = result.Item;
  if (!user || !user.passwordHash) {
    return respond(401, { error: 'Invalid email or password' }, { origin });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return respond(401, { error: 'Invalid email or password' }, { origin });
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

  return respond(
    200,
    {
      token: authToken,
      user: jwtPayload,
    },
    { origin }
  );
}

/* ── Lambda entry point ── */
export async function handler(event) {
  const method = event.httpMethod || event.requestContext?.http?.method || '';
  const path = event.path || event.rawPath || event.resource || '';
  const origin = getRequestOrigin(event);

  if (origin && !getAllowedOrigin(origin)) {
    console.warn('Blocked request from disallowed origin', JSON.stringify({ origin: normalizeOrigin(origin), path, method }));
    return respond(403, { error: 'Origin not allowed' }, { origin });
  }

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return respond(200, {}, { origin });
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET environment variable is not set');
    return respond(500, { error: 'Server configuration error' }, { origin });
  }

  let body = {};
  try {
    const rawBody = event.body || '{}';
    const decoded = event.isBase64Encoded
      ? Buffer.from(rawBody, 'base64').toString('utf-8')
      : rawBody;
    body = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
  } catch (parseErr) {
    console.error('Body parse error', parseErr);
    return respond(400, { error: 'Invalid request body' }, { origin });
  }

  logRequest(event, path, method, body);

  const rateLimitResponse = enforceRateLimits(event, path, body, origin);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    if (path.includes('/register') && method === 'POST') {
      return await handleRegister(body, origin);
    }
    if (path.includes('/forgot-password') && method === 'POST') {
      return await handleForgotPassword(body, origin);
    }
    if (path.includes('/create-password') && method === 'POST') {
      return await handleCreatePassword(body, origin);
    }
    if (path.includes('/login') && method === 'POST') {
      return await handleLogin(body, origin);
    }
    return respond(404, { error: 'Not found', debug: { path, method } }, { origin });
  } catch (err) {
    console.error('Unhandled error:', err);
    return respond(500, { error: 'Internal server error' }, { origin });
  }
}
