import React, { useState, useEffect } from 'react';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { s3Client, S3_BUCKET_NAME } from '../config/aws';
import { storeEventData, getUserEvents } from '../config/eventdb';
import { Video, Upload as UploadIcon } from 'lucide-react';

interface EventVideosProps {
  eventId: string;
}

interface VideoItem {
  url: string;
  name: string;
  uploadDate: string;
}

const EventVideos = ({ eventId }: EventVideosProps) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchEventVideos();
  }, [eventId]);

  const fetchEventVideos = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) throw new Error('User not authenticated');

      const listCommand = new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: `events/shared/${eventId}/videos/`
      });

      const result = await s3Client.send(listCommand);
      if (!result.Contents) return;

      const videoItems = result.Contents
        .filter(item => item.Key && item.Key.match(/\.(mp4|mov|avi|wmv)$/i))
        .map(item => ({
          url: `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${item.Key}`,
          name: item.Key?.split('/').pop() || 'Untitled',
          uploadDate: item.LastModified?.toLocaleDateString() || ''
        }));

      setVideos(videoItems);
    } catch (error) {
      console.error('Error fetching event videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) throw new Error('User not authenticated');

    setUploading(true);
    setUploadProgress(0);

    try {
      const key = `events/shared/${eventId}/videos/${file.name}`;

      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: S3_BUCKET_NAME,
          Key: key,
          Body: file,
          ContentType: file.type,
        },
      });

      upload.on('httpUploadProgress', (progress) => {
        const percentage = Math.round((progress.loaded || 0) * 100 / (progress.total || 1));
        setUploadProgress(percentage);
      });

      await upload.done();
      
      // Update event video count
      const userEvents = await getUserEvents(userEmail);
      const currentEvent = userEvents.find(event => event.id === eventId);
      
      if (currentEvent) {
        const updatedEvent = {
          ...currentEvent,
          videoCount: (currentEvent.videoCount || 0) + 1,
          updatedAt: new Date().toISOString()
        };
        await storeEventData(updatedEvent);
      }
      
      await fetchEventVideos();
    } catch (error) {
      console.error('Error uploading video:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return <div>Loading videos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Event Videos</h2>
        <label className="cursor-pointer bg-primary text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-secondary transition-colors duration-200 flex items-center text-sm sm:text-base whitespace-nowrap w-full sm:w-auto justify-center">
          <UploadIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Upload Video
          <input
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {uploading && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
        {videos.map((video, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
            <video
              className="w-full aspect-video object-cover"
              src={video.url}
              controls
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800 truncate">{video.name}</h3>
              <p className="text-sm text-gray-600">{video.uploadDate}</p>
            </div>
          </div>
        ))}
      </div>

      {videos.length === 0 && (
        <div className="text-center py-8">
          <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No videos uploaded yet</p>
        </div>
      )}
    </div>
  );
};

export default EventVideos;