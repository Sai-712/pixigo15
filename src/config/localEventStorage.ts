export interface EventData {
  id: string;
  name: string;
  date: string;
  description: string;
  photoCount: number;
  videoCount: number;
  guestCount: number;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = 'eventsDB';
const STORE_NAME = 'events';

const openDB = async (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: ['userEmail', 'id'] });
      }
    };
  });
};

export const storeEventData = async (eventData: EventData): Promise<boolean> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.put(eventData);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('Error storing event data:', request.error);
        reject(false);
      };
    });
  } catch (error) {
    console.error('Error storing event data:', error);
    return false;
  }
};

export const getUserEvents = async (userEmail: string): Promise<EventData[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const allEvents = request.result || [];
        const userEvents = allEvents.filter(event => event.userEmail === userEmail);
        resolve(userEvents);
      };

      request.onerror = () => {
        console.error('Error getting user events:', request.error);
        reject([]);
      };
    });
  } catch (error) {
    console.error('Error getting user events:', error);
    return [];
  }
};

export const getEventStatistics = async (userEmail: string) => {
  try {
    const events = await getUserEvents(userEmail);
    
    return {
      eventCount: events.length,
      photoCount: events.reduce((sum, event) => sum + (event.photoCount || 0), 0),
      videoCount: events.reduce((sum, event) => sum + (event.videoCount || 0), 0),
      guestCount: events.reduce((sum, event) => sum + (event.guestCount || 0), 0)
    };
  } catch (error) {
    console.error('Error getting event statistics:', error);
    return {
      eventCount: 0,
      photoCount: 0,
      videoCount: 0,
      guestCount: 0
    };
  }
};

export const deleteEvent = async (eventId: string): Promise<boolean> => {
  try {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) throw new Error('User not authenticated');

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete([userEmail, eventId]);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('Error deleting event:', request.error);
        reject(false);
      };
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return false;
  }
};