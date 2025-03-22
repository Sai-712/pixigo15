import React, { useState, useEffect, useCallback } from 'react';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { S3_BUCKET_NAME, s3Client, rekognitionClient } from '../config/aws';
import { CompareFacesCommand } from '@aws-sdk/client-rekognition';
import { Camera, X, Download } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { colors } from '../config/theme';

const UploadSelfie = () => {
  const navigate = useNavigate();
  const [selfie, setSelfie] = useState<File | null>(null);
  const [matchedImages, setMatchedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [eventCoverImage, setEventCoverImage] = useState<string | null>(null);

  // Helper function for building S3 paths
  const getSharedEventPath = useCallback(
    (eventId: string) => `events/shared/${eventId}`,
    []
  );

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        // Extract eventId from path, URL params or localStorage
        const pathSegments = window.location.pathname.split('/');
        const uploadSelfieIndex = pathSegments.findIndex(segment => segment === 'upload-selfie');
        let urlEventId = uploadSelfieIndex !== -1 ? pathSegments[uploadSelfieIndex + 1] : null;
        if (!urlEventId) {
          const searchParams = new URLSearchParams(window.location.search);
          urlEventId = searchParams.get('eventId');
        }
        if (!urlEventId) {
          const storedEventId = localStorage.getItem('currentEventId');
          if (storedEventId) urlEventId = storedEventId;
        }

        if (!urlEventId) {
          throw new Error('Event ID is missing. Please ensure you have a valid event link.');
        }

        // Validate eventId format (UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(urlEventId)) {
          throw new Error('Invalid event ID format. Please check your event link.');
        }

        // Set event and session information
        setSelectedEvent(urlEventId);
        localStorage.setItem('currentEventId', urlEventId);
        if (!localStorage.getItem('userEmail')) {
          localStorage.setItem('sessionId', urlEventId);
          localStorage.setItem('isSharedAccess', 'true');
        }

        setIsInitialized(true);
        await fetchEventCoverImage(urlEventId);
      } catch (error: any) {
        setUploadError(error.message);
        console.error('Initialization error:', error);
        if (localStorage.getItem('isSharedAccess') === 'true') {
          setIsInitialized(true);
          return;
        }
        if (!error.message.includes('Please log in')) {
          navigate('/events');
        }
      }
    };
    initializeComponent();
  }, [navigate]);

  // Fetch event cover image from S3
  const fetchEventCoverImage = useCallback(async (eventId: string) => {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: `events/shared/${eventId}/cover-`
      });
      const response = await s3Client.send(listCommand);
      if (response.Contents && response.Contents.length > 0) {
        const coverImageKey = response.Contents[0].Key;
        if (coverImageKey) {
          setEventCoverImage(`https://${S3_BUCKET_NAME}.s3.amazonaws.com/${coverImageKey}`);
        }
      }
    } catch (error) {
      console.error('Error fetching event cover image:', error);
    }
  }, []);

  // Validate image file type and size
  const validateImage = useCallback((file: File) => {
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      throw new Error('Only JPEG and PNG images are supported');
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('Image size must be less than 20MB');
    }
    return true;
  }, []);

  // Handle file input change
  const handleSelfieChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        validateImage(file);
        setSelfie(file);
        setPreviewUrl(URL.createObjectURL(file));
        setUploadError(null);
      } catch (error: any) {
        setUploadError(error.message);
      }
    }
  }, [validateImage]);

  // Compare faces using Promise.all for concurrent processing
  const compareFaces = useCallback(
    async (selfieFileName: string) => {
      try {
        const eventId = selectedEvent || localStorage.getItem('currentEventId');
        if (!eventId) throw new Error('Event ID is required for uploading a selfie.');

        const sharedEventPath = getSharedEventPath(eventId);
        const selfiePath = `${sharedEventPath}/selfies/${selfieFileName}`;
        const imagesPath = `${sharedEventPath}/images/`;

        // List all target images in S3
        const listCommand = new ListObjectsV2Command({
          Bucket: S3_BUCKET_NAME,
          Prefix: imagesPath,
          MaxKeys: 1000
        });
        const listResponse = await s3Client.send(listCommand);
        if (!listResponse.Contents || listResponse.Contents.length === 0) {
          throw new Error('No images found in this event. Please ensure images are uploaded before attempting face comparison.');
        }
        const uploadKeys = listResponse.Contents
          .filter(item => item.Key && /\.(jpg|jpeg|png)$/i.test(item.Key))
          .map(item => item.Key!);
        if (uploadKeys.length === 0) {
          throw new Error('No valid images found in this event. Please upload some JPEG or PNG images first.');
        }

        // Process all images concurrently using Promise.all
        const promises = uploadKeys.map(async (key, index) => {
          try {
            console.log(`Processing image ${index + 1}/${uploadKeys.length}: ${key}`);
            const compareCommand = new CompareFacesCommand({
              SourceImage: {
                S3Object: { Bucket: S3_BUCKET_NAME, Name: selfiePath },
              },
              TargetImage: {
                S3Object: { Bucket: S3_BUCKET_NAME, Name: key },
              },
              SimilarityThreshold: 80,
              QualityFilter: "HIGH"
            });

            // Set a timeout for each face comparison
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Face comparison timed out')), 30000)
            );

            const compareResponse = await Promise.race([
              rekognitionClient.send(compareCommand),
              timeoutPromise
            ]);

            if (compareResponse.FaceMatches && compareResponse.FaceMatches.length > 0) {
              const bestMatch = compareResponse.FaceMatches.reduce((prev, current) =>
                (prev.Similarity || 0) > (current.Similarity || 0) ? prev : current
              );
              console.log(`Found face match in ${key} with similarity: ${bestMatch.Similarity}%`);
              return { url: `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${key}`, similarity: bestMatch.Similarity || 0 };
            } else {
              console.log(`No face matches found in image: ${key}`);
              return null;
            }
          } catch (error) {
            console.error(`Error processing image ${key}:`, error);
            return null;
          }
        });

        const results = await Promise.all(promises);
        const matchedResults = results.filter(
          (result): result is { url: string; similarity: number } =>
            result !== null && result.similarity >= 70
        );
        const sortedMatches = matchedResults.sort((a, b) => b.similarity - a.similarity);
        if (sortedMatches.length === 0) {
          throw new Error('No matching faces found in your uploaded images.');
        }
        return {
          matchedUrls: sortedMatches.map(match => match.url),
          message: `Found ${sortedMatches.length} matches out of ${uploadKeys.length} images processed.`
        };
      } catch (error: any) {
        console.error('Error in face comparison process:', error);
        throw error;
      }
    },
    [selectedEvent, getSharedEventPath]
  );

  // Clear the selected selfie and preview URL
  const clearSelfie = useCallback(() => {
    setSelfie(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  }, [previewUrl]);

  // Upload selfie to S3 and then run face comparison
  const handleUpload = useCallback(async () => {
    if (!selfie) {
      setUploadError('Please select a selfie image first.');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setMatchedImages([]);

    try {
      // Generate a unique filename
      const fileName = `selfie-${Date.now()}-${selfie.name}`;
      await uploadToS3(selfie, fileName);
      const result = await compareFaces(fileName);
      if (result.matchedUrls && result.matchedUrls.length > 0) {
        setMatchedImages(result.matchedUrls);
      } else {
        setUploadError('No matching faces found in your uploaded images.');
      }
      if (result.message) {
        console.log(result.message);
      }
    } catch (error: any) {
      console.error('Error during upload process:', error);
      setUploadError(error.message || 'Error uploading selfie. Please try again.');
      setMatchedImages([]);
    } finally {
      setIsUploading(false);
    }
  }, [selfie, compareFaces]);

  // Upload file to S3 using AWS SDK's multipart upload
  const uploadToS3 = useCallback(async (file: File, fileName: string) => {
    try {
      if (!selectedEvent) throw new Error('Event ID is required for uploading a selfie.');
      const isSharedLink = !localStorage.getItem('userEmail');
      const sessionId = localStorage.getItem('sessionId');
      const folderPath = `${getSharedEventPath(selectedEvent)}/selfies/${fileName}`;
      const uploadParams = {
        Bucket: S3_BUCKET_NAME,
        Key: folderPath,
        Body: file,
        ContentType: file.type,
        Metadata: {
          'event-id': selectedEvent,
          'session-id': sessionId || '',
          'upload-date': new Date().toISOString()
        }
      };

      const uploadInstance = new Upload({
        client: s3Client,
        params: uploadParams,
        partSize: 5 * 1024 * 1024,
        leavePartsOnError: false,
      });

      await uploadInstance.done();
      return fileName;
    } catch (error) {
      console.error(`Error uploading to path ${selectedEvent}:`, error);
      throw new Error('Failed to upload selfie. Please try again.');
    }
  }, [selectedEvent, getSharedEventPath]);

  // Download a single image given its URL
  const handleDownload = useCallback(async (url: string) => {
    try {
      const response = await fetch(url, {
        mode: 'cors',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('image/')) {
        throw new Error('Invalid image format received');
      }
      const blob = await response.blob();
      const fileName = decodeURIComponent(url.split('/').pop() || 'image.jpg');
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  }, []);

  // Download all matched images sequentially with a small delay
  const handleDownloadAll = useCallback(async () => {
    let successCount = 0;
    const failedUrls: string[] = [];
    for (const url of matchedImages) {
      try {
        await handleDownload(url);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`Failed to download image from ${url}:`, error);
        failedUrls.push(url);
      }
    }
    if (failedUrls.length === 0) {
      alert(`Successfully downloaded all ${successCount} images!`);
    } else {
      alert(`Downloaded ${successCount} images. Failed to download ${failedUrls.length} images. Please try again later.`);
    }
  }, [matchedImages, handleDownload]);

  if (!isInitialized) {
    return (
      <div className="relative min-h-screen bg-blue-100">
        {eventCoverImage ? (
          <div className="fixed top-0 left-0 w-full h-64 bg-black">
            <img
              src={eventCoverImage}
              alt="Event Cover"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-50"></div>
          </div>
        ) : (
          <div className="w-full h-full bg-blue-100"></div>
        )}
        <div className="flex items-center justify-center min-h-screen bg-champagne bg-opacity-50 relative z-10">
          <div className="text-center p-8 bg-blue-100 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-turquoise mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-blue-100">
      <div className="container mx-auto px-4 py-6 sm:py-8 relative z-10">
        <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-800">Upload Selfie</h1>
        </div>

        {/* Video Background */}
        <video autoPlay loop muted className="fixed top-0 left-0 w-full h-full object-cover opacity-100">
          <source src="tiny.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Main Content */}
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto bg-black p-8 rounded-lg shadow-md border-2 border-aquamarine">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-aquamarine">Upload Selfie</h2>
              <Link to="/" className="flex items-center text-gray-600 hover:text-gray-800"></Link>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-lg">
                {uploadError}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="selfie-upload"
                  className="w-full flex flex-col items-center px-4 py-6 bg-blue-100 rounded-lg border-2 border-turquoise border-dashed cursor-pointer hover:border-aquamarine hover:bg-champagne transition-colors duration-200"
                >
                  <div className="flex flex-col items-center">
                    <Camera className="w-8 h-8 text-black-400" />
                    <p className="mt-2 text-sm text-blue-500">
                      <span className="font-semibold">Click to upload or drag and drop</span>
                    </p>
                    <p className="text-xs text-blue-500 mt-1">Take a clear selfie for best results</p>
                    <p className="text-xs text-blue-500 mt-1">JPEG or PNG up to 5MB</p>
                  </div>
                  <input
                    id="selfie-upload"
                    type="file"
                    className="hidden"
                    onChange={handleSelfieChange}
                    accept="image/jpeg,image/png"
                  />
                </label>
              </div>

              {previewUrl && (
                <div className="relative w-32 h-32 mx-auto">
                  <img
                    src={previewUrl}
                    alt="Selfie preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={clearSelfie}
                    className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={isUploading || !selfie}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUploading ? 'Processing...' : 'Upload Selfie'}
              </button>
            </div>

            {matchedImages.length > 0 && (
              <div className="mt-8 p-4 bg-blue-200 rounded-lg">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    Found {matchedImages.length} matching images!
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                    {matchedImages.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Match ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg shadow-sm"
                          onClick={() => setSelectedImage(url)}
                        />
                        <button
                          onClick={() => handleDownload(url)}
                          className="absolute bottom-2 right-2 bg-turquoise text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Download image"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {matchedImages.length > 1 && (
                    <button
                      onClick={handleDownloadAll}
                      className="mt-4 px-6 py-2 bg-blue-100 text-black rounded-md hover:bg-blue-600 hover:text-gray-800 transition-colors duration-200 flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download All Matched Images
                    </button>
                  )}
                </div>
              </div>
            )}

            {selectedImage && (
              <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                <div className="relative max-w-4xl w-full">
                  <img
                    src={selectedImage}
                    alt="Selected match"
                    className="w-full h-auto rounded-lg"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-4 right-4 p-2 bg-blue-100 rounded-full shadow-lg"
                  >
                    <X className="w-6 h-6 text-gray-800" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadSelfie;