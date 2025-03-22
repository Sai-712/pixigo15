import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EventImages from './EventImages';
import EventVideos from './EventVideos';
import { getUserEvents, EventData } from '../config/eventdb';

interface EventDetailProps {
  eventId: string;
}

const EventDetail = ({ eventId }: EventDetailProps) => {
  const [event, setEvent] = useState<EventData | null>(null);

  useEffect(() => {
    const loadEventDetails = async () => {
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        const events = await getUserEvents(userEmail);
        const currentEvent = events.find(e => e.id === eventId);
        if (currentEvent) {
          setEvent(currentEvent);
        }
      }
    };
    loadEventDetails();
  }, [eventId]);

  if (!event) {
    return <div>Loading event details...</div>;
  }



  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{event.name}</h1>
        <p className="text-gray-600">{event.description}</p>
        <p className="text-gray-500 mt-2">Date: {new Date(event.date).toLocaleDateString()}</p>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Event Images</h2>
          <div className="flex gap-4">
            <Link
              to={`/view-event/${eventId}`}
              className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors duration-200"
            >
              View Gallery
            </Link>
            <Link
              to="/upload"
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition-colors duration-200"
              state={{ eventId }}
            >
              Upload Images
            </Link>
          </div>
        </div>
          <EventImages eventId={eventId} />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <EventVideos eventId={eventId} />
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
