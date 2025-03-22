import React, { useState, useEffect, useCallback } from 'react';
import { Upload } from '@aws-sdk/lib-storage';
import { S3_BUCKET_NAME, s3Client } from '../config/aws';
import { Upload as UploadIcon, X, Download, ArrowLeft, Copy, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserEvents } from '../config/localEventStorage';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const UploadImage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [images, setImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [eventId, setEventId] = useState<string>('');
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;

      try {
        const userEvents = await getUserEvents(userEmail);
        const eventsList = userEvents.map(event => ({
          id: event.id,
          name: event.name,
        }));
        setEvents(eventsList);

        if (location.state?.eventId) {
          setEventId(location.state.eventId);
          setSelectedEvent(location.state.eventId);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [location]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Filter out selfie images.
      const nonSelfieFiles = files.filter(file => {
        const fileName = file.name.toLowerCase();
        return !fileName.includes('selfie') && !fileName.includes('self');
      });
      setImages(nonSelfieFiles);
      if (files.length !== nonSelfieFiles.length) {
        alert('Selfie images should be uploaded through the selfie upload page.');
      }
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadToS3 = useCallback(
    async (file: File, fileName: string): Promise<string> => {
      if (!selectedEvent) {
        throw new Error('Event ID is required for uploading images.');
      }
      console.log(`Uploading file: ${fileName}`);
      const sessionId = localStorage.getItem('sessionId');
      const folderPath = `events/shared/${selectedEvent}/images/${fileName}`;

      const uploadParams = {
        Bucket: S3_BUCKET_NAME,
        Key: folderPath,
        Body: file,
        ContentType: file.type,
        Metadata: {
          'event-id': selectedEvent,
          'session-id': sessionId || '',
          'upload-date': new Date().toISOString(),
        },
      };

      const uploadInstance = new Upload({
        client: s3Client,
        params: uploadParams,
        partSize: 5 * 1024 * 1024,
        leavePartsOnError: false,
      });

      await uploadInstance.done();
      return folderPath;
    },
    [selectedEvent]
  );

  const handleUpload = useCallback(async () => {
    if (images.length === 0) {
      alert('Please select at least one image to upload.');
      return;
    }
    if (!selectedEvent) {
      alert('Please select or create an event before uploading images.');
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      const uploadPromises = images.map(async (image) => {
        if (!image.type.startsWith('image/')) {
          throw new Error(`${image.name} is not a valid image file`);
        }
        if (image.size > MAX_FILE_SIZE) {
          throw new Error(`${image.name} exceeds the 10MB size limit`);
        }
        const fileName = `${Date.now()}-${image.name}`;
        try {
          const imageUrl = await uploadToS3(image, fileName);
          return `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${imageUrl}`;
        } catch (error) {
          console.error(`Failed to upload ${image.name}:`, error);
          throw new Error(`Failed to upload ${image.name}. Please try again.`);
        }
      });

      const urls = await Promise.all(uploadPromises);
      console.log('Uploaded images:', urls);
      setUploadedUrls(urls);
      localStorage.setItem('currentEventId', selectedEvent);
      setEventId(selectedEvent);
      setUploadSuccess(true);
      setShowQRModal(true);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [images, selectedEvent, uploadToS3]);

  const handleDownload = useCallback(async (url: string) => {
    try {
      const response = await fetch(url, {
        mode: 'cors',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        const errorMessage = `Failed to download image (${response.status}): ${response.statusText}`;
        console.error(errorMessage);
        alert(errorMessage);
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('image/')) {
        const errorMessage = 'Invalid image format received';
        console.error(errorMessage);
        alert(errorMessage);
        throw new Error(errorMessage);
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
      console.log(`Successfully downloaded: ${fileName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while downloading the image';
      console.error('Error downloading image:', error);
      alert(errorMessage);
      throw error;
    }
  }, []);

  const handleDownloadAll = useCallback(async () => {
    const downloadPromises = uploadedUrls.map(url =>
      handleDownload(url).catch(error => ({ error, url }))
    );
    const results = await Promise.allSettled(downloadPromises);

    let successCount = 0;
    let failedUrls: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        failedUrls.push(uploadedUrls[index]);
      }
    });

    if (failedUrls.length === 0) {
      alert(`Successfully downloaded all ${successCount} images!`);
    } else {
      alert(`Downloaded ${successCount} images. Failed to download ${failedUrls.length} images. Please try again later.`);
    }
  }, [uploadedUrls, handleDownload]);

  const handleCopyLink = useCallback(() => {
    const link = `${window.location.origin}/upload-selfie?eventId=${selectedEvent}`;
    navigator.clipboard.writeText(link);
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 2000);
  }, [selectedEvent]);

  const handleDownloadQR = useCallback(() => {
    try {
      const canvas = document.createElement('canvas');
      const svg = document.querySelector('.qr-modal svg');
      if (!svg) {
        throw new Error('QR code SVG element not found');
      }
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            throw new Error('Could not create image blob');
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `selfie-upload-qr-${selectedEvent}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Failed to download QR code. Please try again.');
    }
  }, [selectedEvent]);

  return (
    <div className="relative min-h-screen bg-blue-100">
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-8 flex flex-col sm:flex-row justify-center items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-blue-600">Upload Images</h1>
        </div>
        <video autoPlay loop muted className="fixed top-0 left-0 w-full h-full object-cover opacity-100">
          <source src="tiny.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto bg-black p-8 rounded-lg shadow-md border-4 border-aquamarine">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <select
                  value={selectedEvent}
                  onChange={(e) => {
                    setSelectedEvent(e.target.value);
                    setEventId(e.target.value);
                  }}
                  className="border border-blue-300 rounded-lg px-4 py-2 min-w-[200px]"
                >
                  <option value="">Select an Event</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-6 text-aquamarine">Upload Images</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="file-upload"
                  className="w-full flex flex-col items-center px-4 py-6 bg-blue-100 rounded-lg border-2 border-turquoise border-dashed cursor-pointer hover:border-aquamarine hover:bg-champagne transition-colors duration-200"
                >
                  <div className="flex flex-col items-center">
                    <img src="/upload-placeholder.svg" alt="Upload" className="w-64 h-48 object-contain" />
                    <p className="text-xs text-blue-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleImageChange}
                    accept="image/*"
                  />
                </label>
              </div>
              {images.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-blue-600 mb-2">{images.length} file(s) selected</p>
                  <div className="flex flex-wrap gap-2">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {uploadSuccess && uploadedUrls.length > 0 && (
                <div className="mt-6 p-4 bg-blue-100 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Uploaded Images</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {uploadedUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Uploaded ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => handleDownload(url)}
                            className="p-2 bg-blue-100 rounded-full hover:bg-gray-100 transition-colors duration-200"
                            title="Download Image"
                          >
                            <Download className="h-4 w-4 text-gray-700" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {uploadedUrls.length > 1 && (
                    <button
                      onClick={handleDownloadAll}
                      className="mt-4 flex items-center justify-center w-full py-2 px-4 bg-primary text-white rounded-lg hover:bg-secondary transition-colors duration-200"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download All Images
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={handleUpload}
                disabled={isUploading || images.length === 0}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isUploading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  'Upload Images'
                )}
              </button>
            </div>
            {showQRModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-blue-300 rounded-lg p-6 max-w-sm w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Share Event</h3>
                    <button onClick={() => setShowQRModal(false)} className="text-gray-500 hover:text-gray-700">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex flex-col items-center space-y-4">
                    <p className="text-sm text-blue-700 mb-2">Share this QR code or link with others to let them find their photos</p>
                    <div className="qr-modal">
                      <QRCodeSVG
                        value={`${window.location.origin}/upload-selfie?eventId=${selectedEvent}`}
                        size={200}
                        level="H"
                        includeMargin={true}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                    </div>
                    <div className="w-full">
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/upload-selfie?eventId=${selectedEvent}`}
                          className="w-full bg-transparent text-sm"
                        />
                        <button onClick={handleCopyLink} className="px-3 py-1 bg-turquoise text-blue-300 rounded hover:bg-aquamarine transition-colors">
                          Copy
                        </button>
                      </div>
                      {showCopySuccess && <p className="text-sm text-green-600 mt-1">Link copied to clipboard!</p>}
                    </div>
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={handleDownloadQR}
                        className="flex-1 bg-black text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download QR
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/upload-selfie/${selectedEvent}`);
                          setShowCopySuccess(true);
                          setTimeout(() => setShowCopySuccess(false), 2000);
                        }}
                        className="flex-1 bg-black text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
                      >
                        <Copy className="w-5 h-5 mr-2" />
                        {showCopySuccess ? 'Copied!' : 'Share Link'}
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowQRModal(false);
                        navigate(`/upload-selfie/${selectedEvent}`, { state: { eventId: selectedEvent } });
                      }}
                      className="w-full bg-blue-600 text-black py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors duration-200 flex items-center justify-center"
                    >
                      Continue to Selfie Upload
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadImage;