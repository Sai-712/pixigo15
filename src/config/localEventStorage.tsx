import { EventData } from './eventdb';

const EVENTS_STORAGE_KEY = 'local_events';

// Function to get all events from local storage
export const getLocalEvents = (): EventData[] => {
    const eventsJson = localStorage.getItem(EVENTS_STORAGE_KEY);
    return eventsJson ? JSON.parse(eventsJson) : [];
};

// Function to store event data locally
export const storeLocalEventData = (eventData: Omit<EventData, 'createdAt' | 'updatedAt'>): boolean => {
    try {
        const timestamp = new Date().toISOString();
        const newEvent: EventData = {
            ...eventData,
            createdAt: timestamp,
            updatedAt: timestamp
        };

        const events = getLocalEvents();
        events.push(newEvent);
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
        return true;
    } catch (error) {
        console.error('Error storing event data locally:', error);
        return false;
    }
};

// Function to get user's events
export const getLocalUserEvents = (userEmail: string): EventData[] => {
    const events = getLocalEvents();
    return events.filter(event => event.userEmail === userEmail);
};

// Function to get event statistics
export const getLocalEventStatistics = (userEmail: string) => {
    const events = getLocalUserEvents(userEmail);
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