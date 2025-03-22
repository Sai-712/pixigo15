import { S3Client } from '@aws-sdk/client-s3';
import { RekognitionClient } from '@aws-sdk/client-rekognition';

export const region = import.meta.env.VITE_AWS_REGION || 'us-east-1';

// Development mode check
export const isDevelopment = import.meta.env.DEV || false;

// Validate required environment variables
const validateEnvVariables = () => {
    const requiredVars = {
        'AWS Access Key ID': import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        'AWS Secret Access Key': import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
        'S3 Bucket Name': import.meta.env.VITE_S3_BUCKET_NAME
    };

    const missingVars = Object.entries(requiredVars)
        .filter(([_, value]) => !value)
        .map(([name]) => name);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    return {
        accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
        bucketName: import.meta.env.VITE_S3_BUCKET_NAME
    };
};

// Get validated credentials
const { accessKeyId, secretAccessKey, bucketName } = validateEnvVariables();

// Initialize S3 client with proper error handling
export const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
    forcePathStyle: true,
    maxAttempts: 3,
    retryMode: 'adaptive',
    useAccelerateEndpoint: false,
    endpoint: undefined,
    tls: true,
    customUserAgent: 'PixigoApp/1.0',
    requestHandler: undefined,
    // Configure fetch options for CORS
    fetchOptions: {
        mode: 'cors',
        credentials: 'include',
        headers: {
            'Access-Control-Allow-Origin': isDevelopment ? 'http://127.0.0.1:5173' : '*',
            'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Expose-Headers': 'ETag, x-amz-server-side-encryption, x-amz-request-id, x-amz-id-2',
            'Access-Control-Max-Age': '3000'
        }
    }
});

// Initialize Rekognition client with proper error handling
export const rekognitionClient = new RekognitionClient({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
    maxAttempts: 3,
    retryMode: 'adaptive',
    requestHandler: undefined,
    // Configure fetch options for Rekognition requests
    fetchOptions: {
        mode: 'cors',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'Access-Control-Allow-Origin': isDevelopment ? 'http://127.0.0.1:5173' : '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': '*'
        }
    }
});

export const S3_BUCKET_NAME = bucketName;