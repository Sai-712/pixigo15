import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './dynamodb';

// Table name for storing events
export const EVENTS_TABLE = 'events';

// Interface for event data
export interface EventData {
    id: string;
    name: string;
    date: string;
    description?: string;
    photoCount: number;
    videoCount: number;
    guestCount: number;
    userEmail: string;
    createdAt: string;
    updatedAt: string;
    coverImage?: string;
}

// Function to store event data
export const storeEventData = async (eventData: Omit<EventData, 'createdAt' | 'updatedAt'>) => {
    const timestamp = new Date().toISOString();
    const command = new PutCommand({
        TableName: EVENTS_TABLE,
        Item: {
            ...eventData,
            createdAt: timestamp,
            updatedAt: timestamp
        }
    });

    try {
        await docClient.send(command);
        return true;
    } catch (error) {
        console.error('Error storing event data:', error);
        return false;
    }
};

// Function to get user's events
export const getUserEvents = async (userEmail: string) => {
    const command = new QueryCommand({
        TableName: EVENTS_TABLE,
        KeyConditionExpression: 'userEmail = :userEmail',
        ExpressionAttributeValues: {
            ':userEmail': userEmail
        }
    });

    try {
        const response = await docClient.send(command);
        return response.Items as EventData[];
    } catch (error) {
        console.error('Error getting user events:', error);
        return [];
    }
};

// Function to get event statistics
export const getEventStatistics = async (userEmail: string) => {
    const events = await getUserEvents(userEmail);
    return events.reduce((stats, event) => ({
        eventCount: stats.eventCount + 1,
        photoCount: stats.photoCount + (event.photoCount || 0),
        videoCount: stats.videoCount + (event.videoCount || 0),
        guestCount: stats.guestCount + (event.guestCount || 0)
    }), {
        eventCount: 0,
        photoCount: 0,
        videoCount: 0,
        guestCount: 0
    });
};