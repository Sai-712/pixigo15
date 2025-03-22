import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Image, Video, Users, Plus, X, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { storeEventData, getEventStatistics, getUserEvents, EventData, deleteEvent } from '../config/localEventStorage';
import { s3Client, S3_BUCKET_NAME } from '../config/aws';
import { Upload } from '@aws-sdk/lib-storage';

interface Event {
    id: string;
    name: string;
    date: string;
    description?: string;
    coverImage?: File;
}

interface StatsCardProps {
    icon: React.ReactNode;
    title: string;
    count: number;
    bgColor: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, title, count, bgColor }) => (
    <div className={`${bgColor} p-6 rounded-lg shadow-md flex items-center space-x-4`}>
        <div className="p-3 bg-white rounded-full">{icon}</div>
        <div>
            <h3 className="text-xl font-semibold text-blue-900">{title}</h3>
            <p className="text-2xl font-bold text-blue-900">{count}</p>
        </div>
    </div>
);

interface EventDashboardProps {
    setShowNavbar: (show: boolean) => void;
}

const EventDashboard = (props: EventDashboardProps) => {
    const navigate = useNavigate();
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean; eventId: string}>({isOpen: false, eventId: ''});

    const [  ] = useState([])

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEvent, setNewEvent] = useState<Event>({ id: '', name: '', date: '' });
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

    const [stats, setStats] = useState({ eventCount: 0, photoCount: 0, videoCount: 0, guestCount: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [events, setEvents] = useState<EventData[]>([]);
    const [showAllEvents, setShowAllEvents] = useState(false);

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            const userEmail = localStorage.getItem('userEmail');
            if (!userEmail) {
                console.error('User email not found');
                return;
            }
            const userEvents = await getUserEvents(userEmail);
            if (Array.isArray(userEvents)) {
                setEvents(userEvents);
                // Update statistics after loading events
                await loadEventStatistics();
            } else {
                console.error('Invalid events data received');
            }
        } catch (error) {
            console.error('Error loading events:', error);
        }
    };

    useEffect(() => {
        loadEventStatistics();
    }, []);

    const loadEventStatistics = async () => {
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail) {
            const statistics = await getEventStatistics(userEmail);
            setStats(statistics);
        }
    };



    const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // No size limit for cover images
            setNewEvent(prev => ({ ...prev, coverImage: file }));
            setCoverImagePreview(URL.createObjectURL(file));
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEvent.name || !newEvent.date) {
            alert('Please fill in all required fields');
            return;
        }

        setIsLoading(true);
        props.setShowNavbar(false);

        try {
            const userEmail = localStorage.getItem('userEmail');
            if (!userEmail) {
                throw new Error('User not authenticated');
            }

            const eventId = uuidv4();


            let coverImageUrl = '';
            if (newEvent.coverImage) {
                const coverImageKey = `events/shared/${eventId}/cover.jpg`;
                const uploadCoverImage = new Upload({
                    client: s3Client,
                    params: {
                        Bucket: S3_BUCKET_NAME,
                        Key: coverImageKey,
                        Body: newEvent.coverImage,
                        ContentType: newEvent.coverImage.type
                    },
                    partSize: 1024 * 1024 * 5
                });
                await uploadCoverImage.done();
                coverImageUrl = `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${coverImageKey}`;
            }

            const eventData: EventData = {
                id: eventId,
                name: newEvent.name,
                date: newEvent.date,
                coverImage: coverImageUrl,
                photoCount: 0,
                videoCount: 0,
                guestCount: 0,
                userEmail,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Create event folder structure
            const eventFolderKey = `events/shared/${eventId}/`;
            const folderPaths = [
                eventFolderKey,
                `${eventFolderKey}images/`,
                `${eventFolderKey}selfies/`,
                `${eventFolderKey}videos/`
            ];

            // Create folders
            for (const folderPath of folderPaths) {
                try {
                    const upload = new Upload({
                        client: s3Client,
                        params: {
                            Bucket: S3_BUCKET_NAME,
                            Key: folderPath,
                            Body: '',
                            ContentType: 'application/x-directory'
                        },
                        queueSize: 4,
                        partSize: 1024 * 1024 * 5,
                        leavePartsOnError: false
                    });
                    await upload.done();
                } catch (uploadError: any) {
                    console.error(`Error creating folder ${folderPath}:`, uploadError);
                    if (uploadError.name === 'SignatureDoesNotMatch') {
                        alert('AWS authentication failed. Please check your credentials.');
                    } else {
                        alert('Failed to create event folders. Please try again.');
                    }
                    setIsLoading(false);
                    return;
                }
            }

            const success = await storeEventData(eventData);
            if (success) {
                await loadEventStatistics();
                await loadEvents();
                setIsModalOpen(false);
                setNewEvent({ id: '', name: '', date: '', description: '' });
                setCoverImagePreview(null);

                props.setShowNavbar(true);
                navigate(`/view-event/${eventId}`);
            } else {
                alert('Failed to store event data. Please try again.');
            }
        } catch (error: any) {
            console.error('Error creating event:', error);
            alert(error.message || 'Failed to create event. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-blue-45">
            <div className="relative z-10 container mx-auto px-4 py-8">
                <div className="mb-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-blue-900">Event Dashboard</h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center bg-blue-300 text-white-700 py-2 px-4 rounded-lg hover:bg-secondary transition-colors duration-200"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Create Event
                    </button>
                </div>

                {/* Create Event Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-max-w-2xl mx-auto bg-black p-8 rounded-lg shadow-md border-2 border-aquamarine rounded-lg p-8 max-w-md w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-blue-400">Create New Event</h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-red-100 hover:text-gray-700"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateEvent} className="space-y-4">
                                {coverImagePreview && (
                                    <div className="relative w-full h-40 mb-4">
                                        <img
                                            src={coverImagePreview}
                                            alt="Cover preview"
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCoverImagePreview(null);
                                                setNewEvent(prev => ({ ...prev, coverImage: undefined }));
                                            }}
                                            className="absolute top-2 right-2 p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                <div className="mb-4">
                                    <label className="block text-blue-200 mb-2" htmlFor="coverImage">
                                        Cover Image
                                    </label>
                                    <input
                                        type="file"
                                        id="coverImage"
                                        accept="image/*"
                                        onChange={handleCoverImageChange}
                                        className="w-full text-blue-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-blue-200 mb-2" htmlFor="eventName">
                                        Event Name
                                    </label>
                                    <input
                                        type="text"
                                        id="eventName"
                                        value={newEvent.name}
                                        onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                                        className="w-full border border-blue-300 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-blue-200 mb-2" htmlFor="eventDate">
                                        Event Date
                                    </label>
                                    <input
                                        type="date"
                                        id="eventDate"
                                        value={newEvent.date}
                                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                        className="w-full border border-blue-300 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                        required
                                    />
                                </div>


                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-blue-300 text-black py-2 px-4 rounded-lg hover:bg-secondary transition-colors duration-200 disabled:opacity-50"
                                >
                                    {isLoading ? 'Creating Event...' : 'Create Event'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    {/* Stats Cards */}
                    <div onClick={() => setShowAllEvents(!showAllEvents)} className="cursor-pointer">
                        <StatsCard
                            icon={<Image className="w-6 h-6 text-blue-900" />}
                            title="Total Events"
                            count={stats.eventCount}
                            bgColor="bg-blue-200"
                        />
                    </div>
                    <StatsCard
                        icon={<Camera className="w-6 h-6 text-blue-900" />}
                        title="Total Photos"
                        count={stats.photoCount}
                        bgColor="bg-blue-300"
                    />
                    <StatsCard
                        icon={<Video className="w-6 h-6 text-blue-900" />}
                        title="Total Videos"
                        count={stats.videoCount}
                        bgColor="bg-blue-200"
                    />
                </div>

                <div className="text-center mb-8"></div>

                {/* Delete Confirmation Modal */}
                {deleteConfirmation.isOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Delete</h3>
                            <p className="text-gray-600 mb-6">Are you sure you want to delete this event? This action cannot be undone.</p>
                            <div className="flex justify-end space-x-4">
                                <button
                                    onClick={() => setDeleteConfirmation({isOpen: false, eventId: ''})}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        const success = await deleteEvent(deleteConfirmation.eventId);
                                        if (success) {
                                            await loadEvents();
                                            await loadEventStatistics();
                                        }
                                        setDeleteConfirmation({isOpen: false, eventId: ''});
                                    }}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showAllEvents && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-bold text-blue-900 mb-6">All Events</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.isArray(events) && events.map((event) => (
                                <div key={event.id} className="bg-blue-100 rounded-lg shadow-md overflow-hidden">
                                    <div className="w-full h-48 bg-black flex items-center justify-center">
                                        {event.coverImage ? (
                                            <img src={event.coverImage} alt={event.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera className="w-12 h-12 text-blue-700" />
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-xl font-semibold text-black-800 mb-2">{event.name}</h3>
                                        <p className="text-black-600 mb-2">{new Date(event.date).toLocaleDateString()}</p>
                                        <p className="text-black-500 mb-4 line-clamp-2">{event.description}</p>
                                        <div className="flex justify-between items-center">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"></div>
                                            <div className="mt-4 flex justify-end space-x-4">
                                                <Link
                                                    to={`/view-event/${event.id}`}
                                                    className="bg-blue-300 text-black px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                                                >
                                                    View Event
                                                </Link>
                                                <button
                                                    onClick={() => setDeleteConfirmation({isOpen: true, eventId: event.id})}
                                                    className="bg-blue-500 text-blue px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventDashboard;