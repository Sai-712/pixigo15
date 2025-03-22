import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { s3Client, S3_BUCKET_NAME, rekognitionClient } from '../config/aws';
import { Camera, X, ArrowLeft, Download, Upload as UploadIcon, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  IndexFacesCommand,
  SearchFacesCommand,
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

interface FaceRecordWithImage {
  faceId: string;
  boundingBox?: { [key: string]: number };
  image: EventImage;
}

interface FaceGroups {
  [groupId: string]: FaceRecordWithImage[];
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

  // We'll store face grouping differently now:
  //  - "faceIdToGroupId" maps each Rekognition FaceId to a "group ID" we define.
  //  - "faceGroups" is the final grouping of faces by groupId.
  const [faceGroups, setFaceGroups] = useState<FaceGroups>({});

  // This holds all face records from Phase 1:
  const [allFaceRecords, setAllFaceRecords] = useState<FaceRecordWithImage[]>([]);

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
      // Also remove any face records belonging to this image from faceGroups:
      setFaceGroups(prev => {
        const newGroups: FaceGroups = {};
        for (const [groupId, faceRecs] of Object.entries(prev)) {
          newGroups[groupId] = faceRecs.filter(fr => fr.image.key !== image.key);
        }
        // You might also want to remove empty groups:
        for (const groupId of Object.keys(newGroups)) {
          if (newGroups[groupId].length === 0) {
            delete newGroups[groupId];
          }
        }
        return newGroups;
      });
      // Also remove from allFaceRecords:
      setAllFaceRecords(prev => prev.filter(fr => fr.image.key !== image.key));
    } catch (error) {
      console.error('Error deleting image:', error);
    } finally {
      setDeleting(prev => prev.filter(key => key !== image.key));
    }
  }, []);

  /**
   * detectAndGroupFaces: two-phase approach
   *
   * PHASE 1: Index each image. If multiple faces exist, Rekognition returns multiple FaceRecords.
   *          We store them in "allFaceRecords".
   *
   * PHASE 2: For each faceRecord, call SearchFaces by faceId to see if it matches existing faces.
   *          If matched, reuse groupId; if not, create a new groupId. Then build "faceGroups".
   */
  const detectAndGroupFaces = async (imagesToProcess: EventImage[]) => {
    const collectionId = eventId;
    await ensureCollection(collectionId);

    // Temporary array to store all face records from indexing:
    const tempFaceRecords: FaceRecordWithImage[] = [];

    // ---- PHASE 1: INDEX ALL IMAGES ----
    // Concurrency: Index all images in parallel.
    await Promise.all(
      imagesToProcess.map(async (image) => {
        try {
          // We can pass a placeholder ExternalImageId or omit it.
          // If multiple faces are found, they'll all share the same ExternalImageId.
          // We'll do the grouping ourselves with FaceId, so it's fine.
          const indexResponse = await rekognitionClient.send(
            new IndexFacesCommand({
              CollectionId: collectionId,
              Image: {
                S3Object: {
                  Bucket: S3_BUCKET_NAME,
                  Name: image.key
                }
              },
              DetectionAttributes: [],
              // Provide a placeholder or sanitized ID:
              ExternalImageId: 'placeholder'
            })
          );

          if (indexResponse.FaceRecords) {
            // For each face in this image, store the faceId & bounding box with the image reference.
            for (const rec of indexResponse.FaceRecords) {
              if (rec.Face?.FaceId) {
                tempFaceRecords.push({
                  faceId: rec.Face.FaceId,
                  boundingBox: rec.Face.BoundingBox,
                  image
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error indexing image ${image.key}:`, error);
        }
      })
    );

    // Store them in state for reference if needed:
    setAllFaceRecords(tempFaceRecords);

    // ---- PHASE 2: SEARCH & GROUP ----
    // We'll keep a local map: faceId -> groupId
    const faceIdToGroupId: Record<string, string> = {};
    // We'll keep track of groupId increments:
    let groupCount = 0;

    // Concurrency: For each faceRecord, we do a search by faceId.
    await Promise.all(
      tempFaceRecords.map(async (faceRec) => {
        try {
          const searchResponse = await rekognitionClient.send(
            new SearchFacesCommand({
              CollectionId: collectionId,
              FaceId: faceRec.faceId,
              MaxFaces: 5,
              FaceMatchThreshold: 80
            })
          );
          if (searchResponse.FaceMatches && searchResponse.FaceMatches.length > 0) {
            // We found matches, see if any matched faceId is already in faceIdToGroupId
            const matchedGroupIds = searchResponse.FaceMatches
              .map((m) => m.Face?.FaceId)
              .filter((id): id is string => !!id)
              .map((id) => faceIdToGroupId[id]) // might be undefined if we haven't assigned it yet
              .filter((gid): gid is string => !!gid);

            if (matchedGroupIds.length > 0) {
              // Use the first matched group ID
              faceIdToGroupId[faceRec.faceId] = matchedGroupIds[0];
            } else {
              // No matched faceId is in our map yet, so we create a new group ID
              groupCount += 1;
              faceIdToGroupId[faceRec.faceId] = `group_${groupCount}`;
            }
          } else {
            // No matches found => new group
            groupCount += 1;
            faceIdToGroupId[faceRec.faceId] = `group_${groupCount}`;
          }
        } catch (err) {
          console.error(`SearchFaces error for faceId ${faceRec.faceId}:`, err);
          // fallback group
          groupCount += 1;
          faceIdToGroupId[faceRec.faceId] = `group_${groupCount}`;
        }
      })
    );

    // Now build the final FaceGroups structure from faceIdToGroupId
    const newGroups: FaceGroups = {};
    for (const faceRec of tempFaceRecords) {
      const gid = faceIdToGroupId[faceRec.faceId];
      if (!newGroups[gid]) {
        newGroups[gid] = [];
      }
      newGroups[gid].push(faceRec);
    }

    setFaceGroups(newGroups);
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
        // Once we have the images, do the detection & grouping:
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
      // Upload each file concurrently
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

      // Refresh the images & re-run face grouping
      await fetchEventImages();
    } catch (error: any) {
      console.error('Error uploading images:', error);
      setError(error.message || 'Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [eventId]);

  // ---------- RENDERING ----------
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
                                if (!blob) return;
                                const url = URL.createObjectURL(blob);
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

        {/* 
          Now we display face groups. Each group can have multiple faces from multiple images.
          If multiple people appear in the same image, you'll see them in separate face groups
          because each face has a unique FaceId => group mapping.
        */}
        <div className="space-y-8">
          {Object.entries(faceGroups).map(([groupId, faceRecs]) => {
            // We'll gather unique images for this group.
            // If you want to show face bounding boxes or thumbnails, you'd do so here.
            const uniqueImages = Array.from(
              new Set(faceRecs.map(fr => fr.image.key))
            ).map(key => images.find(img => img.key === key));

            return (
              <div key={groupId} className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-700">
                    Face Group {groupId}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({faceRecs.length} face record{faceRecs.length !== 1 ? 's' : ''})
                    </span>
                  </h3>
                </div>
                <p className="text-gray-500 text-sm">
                  Found in {uniqueImages.filter(Boolean).length} image(s).
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {uniqueImages.map((img, idx) => {
                    if (!img) return null;
                    return (
                      <div
                        key={img.key}
                        className="relative aspect-square overflow-hidden rounded-lg shadow-md cursor-pointer transform hover:scale-105 transition-transform duration-300"
                        onClick={() => setSelectedImage(img)}
                      >
                        <img
                          src={img.url}
                          alt={`Group ${groupId}, image ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* If no images, show empty state */}
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
