import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const region = import.meta.env.VITE_AWS_REGION;
const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;

// Initialize the DynamoDB client
const client = new DynamoDBClient({
    region,
    credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || ''
    }
});

// Create a document client for easier interaction with DynamoDB
export const docClient = DynamoDBDocumentClient.from(client);

// Table name for storing user credentials
export const USERS_TABLE = 'email-credentials';

// Function to store user credentials
export const storeUserCredentials = async (userData: {
    email: string;
    name?: string;
    picture?: string;
    googleId: string;
}) => {
    const command = new PutCommand({
        TableName: USERS_TABLE,
        Item: {
            'email-cred': userData.email,
            googleId: userData.googleId,
            name: userData.name,
            picture: userData.picture,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    });

    try {
        await docClient.send(command);
        return true;
    } catch (error) {
        console.error('Error storing user credentials:', error);
        return false;
    }
};

// Function to get user credentials
export const getUserCredentials = async (email: string) => {
    const command = new GetCommand({
        TableName: USERS_TABLE,
        Key: {
            'email-cred': email
        }
    });

    try {
        const response = await docClient.send(command);
        return response.Item;
    } catch (error) {
        console.error('Error getting user credentials:', error);
        return null;
    }
};