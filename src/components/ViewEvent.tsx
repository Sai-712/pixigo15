import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { s3Client, S3_BUCKET_NAME, rekognitionClient } from '../config/aws';
import { Camera, X, ArrowLeft, Download, Trash2, Upload as UploadIcon, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  IndexFacesCommand,
  SearchFacesByImageCommand,
  CreateCollectionCommand,
  ListCollectionsCommand
} from '@aws-sdk/client-rekognition';
import { Link, useNavigate } from 'react-router-dom';

interface ViewEventProps {
  eventId: string;
  selectedEvent?: string;
  onEventSelect?: (eventId: string) => void;
}

interface EventImage {
  url: string;
  key: string;
}

interface FaceGroups {
  [key: string]: EventImage[];
}

const ViewEvent: React.FC<ViewEventProps> = ({ eventId, selectedEvent, onEventSelect }) => {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState<string[]>([]);
  const [images, setImages] = useState<EventImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<EventImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [faceGroups, setFaceGroups] = useState<FaceGroups>({});

  // Ref for the QR code element.
  const qrCodeRef = useRef<SVGSVGElement>(null);

  // Ensure a Rekognition collection exists for this event.
  const ensureCollection = async (collectionId: string) => {
    try {
      const listResponse = await rekognitionClient.send(new ListCollectionsCommand({}));
      const collections = listResponse.CollectionIds || [];
      if (!collections.includes(collectionId)) {
        await rekognitionClient.send(new CreateCollectionCommand({ CollectionId: collectionId }));
      }
    } catch (error) {
      console.error('Error ensuring collection:', error);
    }
  };

  // Memoized delete handler.
  const handleDelete = useCallback(async (image: EventImage) => {
    try {
      setDeleting(prev => [...prev, image.key]);
      const deleteCommand = new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: image.key
      });
      await s3Client.send(deleteCommand);
      setImages(prev => prev.filter(img => img.key !== image.key));
      setFaceGroups(prev => {
        const newGroups = { ...prev };
        for (const [groupId, imgs] of Object.entries(newGroups)) {
          newGroups[groupId] = imgs.filter(img => img.key !== image.key);
        }
        return newGroups;
      });
    } catch (error) {
      console.error('Error deleting image:', error);
    } finally {
      setDeleting(prev => prev.filter(key => key !== image.key));
    }
  }, []);

  /**
   * For each image, we search for similar faces and index them concurrently.
   * Then we group images by their assigned ExternalImageId (group ID).
   */
  const detectAndGroupFaces = async (images: EventImage[]) => {
    const collectionId = eventId; // Use eventId as the collection identifier.
    await ensureCollection(collectionId);

    // Process images in parallel.
    const results = await Promise.all(
      images.map(async (image) => {
        let groupId = '';
        try {
          const searchCommand = new SearchFacesByImageCommand({
            CollectionId: collectionId,
            Image: {
              S3Object: {
                Bucket: S3_BUCKET_NAME,
                Name: image.key
              }
            },
            FaceMatchThreshold: 80,
            MaxFaces: 10
          });
          const searchResponse = await rekognitionClient.send(searchCommand);
          if (searchResponse.FaceMatches && searchResponse.FaceMatches.length > 0) {
            const match = searchResponse.FaceMatches.find(
              (m) => m.Face && m.Face.ExternalImageId && m.Face.ExternalImageId !== image.key
            );
            if (match) {
              groupId = match.Face.ExternalImageId;
            }
          }
        } catch (error) {
          console.error(`SearchFacesByImage error for image ${image.key}:`, error);
        }

        // If no match was found, generate a new group ID.
        if (!groupId) {
          groupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        }

        try {
          const indexCommand = new IndexFacesCommand({
            CollectionId: collectionId,
            Image: {
              S3Object: {
                Bucket: S3_BUCKET_NAME,
                Name: image.key
              }
            },
            ExternalImageId: groupId,
            DetectionAttributes: []
          });
          await rekognitionClient.send(indexCommand);
        } catch (error) {
          console.error(`Error indexing image ${image.key}:`, error);
        }

        return { key: image.key, groupId };
      })
    );

    // Build groups from the results.
    const groups: FaceGroups = {};
    for (const image of images) {
      const result = results.find(r => r.key === image.key);
      const gid = result ? result.groupId : 'unknown';
      if (!groups[gid]) groups[gid] = [];
      groups[gid].push(image);
    }
    setFaceGroups(groups);
  };

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('upload_selfie') || path.includes('upload-selfie')) {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        setError('Authentication required. Please log in.');
        return;
      }
      // Ensure consistent URL format.
      if (path !== `/upload-selfie/${eventId}`) {
        navigate(`/upload-selfie/${eventId}`, { state: { eventId }, replace: true });
        return;
      }
    }
  }, [eventId, navigate]);

  useEffect(() => {
    fetchEventImages();
    if (selectedEvent && onEventSelect) {
      onEventSelect(selectedEvent);
    }
  }, [eventId, selectedEvent]);

  const fetchEventImages = async () => {
    try {
      const eventToUse = selectedEvent || eventId;
      const prefixes = [`events/shared/${eventToUse}/images`];
      let allImages: EventImage[] = [];
      let fetchError: any = null;
      for (const prefix of prefixes) {
        try {
          const listCommand = new ListObjectsV2Command({
            Bucket: S3_BUCKET_NAME,
            Prefix: prefix
          });
          const result = await s3Client.send(listCommand);
          if (result.Contents) {
            const imageItems = result.Contents
              .filter(item => item.Key && item.Key.match(/\.(jpg|jpeg|png)$/i))
              .map(item => ({
                url: `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${item.Key}`,
                key: item.Key || ''
              }));
            allImages = [...allImages, ...imageItems];
          }
        } catch (error) {
          fetchError = error;
          console.error(`Error fetching from path ${prefix}:`, error);
          continue;
        }
      }
      if (allImages.length > 0) {
        setImages(allImages);
        await detectAndGroupFaces(allImages);
        setError(null);
      } else if (fetchError) {
        throw fetchError;
      } else {
        setError('No images found for this event.');
      }
    } catch (error: any) {
      console.error('Error fetching event images:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Memoized handler for file input changes.
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) throw new Error('User not authenticated');
    setUploading(true);
    const files = Array.from(e.target.files);
    try {
      // Process each file sequentially or in parallel as needed.
      await Promise.all(files.map(async (file) => {
        const key = `events/shared/${eventId}/images/${Date.now()}-${file.name}`;
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        const upload = new Upload({
          client: s3Client,
          params: {
            Bucket: S3_BUCKET_NAME,
            Key: key,
            Body: uint8Array,
            ContentType: file.type,
            Metadata: {
              'event-id': eventId,
              'session-id': localStorage.getItem('sessionId') || '',
              'upload-date': new Date().toISOString()
            }
          },
          partSize: 5 * 1024 * 1024,
          leavePartsOnError: false
        });
        upload.on('httpUploadProgress', (progress) => {
          const percentage = Math.round((progress.loaded || 0) * 100 / (progress.total || 1));
          setUploadProgress(percentage);
        });
        await upload.done();
      }));
      // Instead of re-fetching all images, you might merge new images into state.
      await fetchEventImages();
      // Re-run face grouping after new uploads.
      await detectAndGroupFaces(images);
    } catch (error: any) {
      console.error('Error uploading images:', error);
      setError(error.message || 'Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [eventId, images]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-blue-600">Loading event images...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="text-blue-500 mb-4">⚠️</div>
          <p className="text-gray-800">{error}</p>
          <Link to="/upload" className="mt-4 inline-flex items-center text-primary hover:text-secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Click to Upload images
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-4 sm:py-8 flex-grow">
        {/* Header and controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-8 mb-4 sm:mb-8">
          <Link to="/events" className="flex items-center text-gray-600 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Back to Events
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Event Gallery</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => setShowQRModal(true)}
                  className="bg-blue-200 text-black py-2 px-3 sm:px-4 rounded-lg hover:bg-secondary transition-colors duration-200 flex items-center text-sm sm:text-base"
                >
                  <QRCodeSVG
                    ref={qrCodeRef}
                    value={`${window.location.origin}/upload-selfie/${eventId}?source=qr`}
                    size={24}
                    level="H"
                    includeMargin={true}
                  />
                  <span className="ml-2">Show QR Code</span>
                </button>
              </div>
              {showQRModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                  <div className="bg-blue-200 rounded-lg p-4 sm:p-6 max-w-[90vw] sm:max-w-sm w-full">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold">Scan QR Code</h3>
                      <button onClick={() => setShowQRModal(false)} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="flex flex-col items-center space-y-4">
                      <QRCodeSVG
                        value={`${window.location.origin}/upload-selfie/${eventId}?source=qr`}
                        size={200}
                        level="H"
                        includeMargin={true}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                      <div className="flex flex-col sm:flex-row gap-2 w-full">
                        <button
                          onClick={() => {
                            if (!qrCodeRef.current) return;
                            const canvas = document.createElement('canvas');
                            const svgData = new XMLSerializer().serializeToString(qrCodeRef.current);
                            const img = new Image();
                            img.onload = () => {
                              canvas.width = img.width;
                              canvas.height = img.height;
                              const ctx = canvas.getContext('2d');
                              ctx!.drawImage(img, 0, 0);
                              canvas.toBlob((blob) => {
                                const url = URL.createObjectURL(blob!);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `selfie-upload-qr-${eventId}.png`;
                                a.click();
                                URL.revokeObjectURL(url);
                              });
                            };
                            img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                          }}
                          className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-secondary transition-colors duration-200 flex items-center justify-center"
                        >
                          <Download className="w-5 h-5 mr-2" />
                          Download QR
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/upload-selfie/${eventId}?source=share`);
                            setShowCopySuccess(true);
                            setTimeout(() => setShowCopySuccess(false), 2000);
                          }}
                          className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-secondary transition-colors duration-200 flex items-center justify-center"
                        >
                          <Copy className="w-5 h-5 mr-2" />
                          {showCopySuccess ? 'Copied!' : 'Share Link'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {images.length > 0 && (
              <button
                onClick={() => {
                  images.forEach((image, index) => {
                    setTimeout(() => {
                      const a = document.createElement('a');
                      a.href = image.url;
                      a.download = image.key.split('/').pop() || `image-${index}`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }, index * 500);
                  });
                }}
                className="bg-blue-200 text-black py-2 px-3 sm:px-4 rounded-lg hover:bg-secondary transition-colors duration-200 flex items-center text-sm sm:text-base whitespace-nowrap"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Download All
              </button>
            )}
            <label className="cursor-pointer bg-blue-200 text-black py-2 px-3 sm:px-4 rounded-lg hover:bg-secondary transition-colors duration-200 flex items-center text-sm sm:text-base whitespace-nowrap">
              <UploadIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Upload Images
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
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

        <div className="space-y-8">
          {Object.entries(faceGroups).map(([groupId, groupImages]) => (
            <div key={groupId} className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-700">
                  Face Group 
                  <span className="text-sm font-normal text-gray-500 ml-2">({groupImages.length} photos)</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                {groupImages.map((image, index) => (
                  <div
                    key={image.key}
                    className="relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer group"
                    onClick={() => setSelectedImage(image)}
                  >
                    <img
                      src={image.url}
                      alt={`Face ${index + 1} in group ${groupId}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const a = document.createElement('a');
                          a.href = image.url;
                          a.download = image.key.split('/').pop() || 'image';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <Download className="w-4 h-4 text-gray-800" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-700">Other Images</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {images.filter(image => !Object.values(faceGroups).flat().includes(image)).map((image, index) => (
                <div
                  key={image.key}
                  className="relative aspect-square overflow-hidden rounded-lg shadow-lg cursor-pointer transform hover:scale-105 transition-transform duration-300"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image.url}
                    alt={`Event image ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const a = document.createElement('a');
                        a.href = image.url;
                        a.download = image.key.split('/').pop() || 'image';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors duration-200"
                    >
                      <Download className="w-5 h-5 text-gray-700" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {images.length === 0 && (
          <div className="text-center py-16 bg-gray-50 rounded-lg">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">No images found for this event</p>
            <p className="text-gray-400 mt-2">Images uploaded to this event will appear here</p>
          </div>
        )}

        {selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedImage.url}
              alt="Selected event image"
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewEvent;