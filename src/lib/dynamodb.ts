import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const REGION = 'us-west-2';
const IDENTITY_POOL_ID = 'us-west-2:caa155b9-a03c-4acc-8849-211c0679f28b';
const TABLE_NAME = 'ozcta-users';

const client = new DynamoDBClient({
  region: REGION,
  credentials: fromCognitoIdentityPool({
    identityPoolId: IDENTITY_POOL_ID,
    clientConfig: { region: REGION },
  }),
});

const docClient = DynamoDBDocumentClient.from(client);

export type RegistrationRecord = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  professional: string;
};

/** Save a new registration to DynamoDB */
export async function saveRegistration(data: RegistrationRecord): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...data,
        registeredAt: new Date().toISOString(),
      },
    }),
  );
}

/** Look up an existing registration by email */
export async function getRegistration(email: string): Promise<RegistrationRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { email },
    }),
  );
  return (result.Item as RegistrationRecord) ?? null;
}
