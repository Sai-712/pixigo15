import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ChatBot from './ChatBot';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();
  const [showImage, setShowImage] = useState(false);

  const handleCreateEvent = () => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      navigate('/events');
    } else {
      navigate('/events');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowImage(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-b from-white to-blue-50">
      <ChatBot />
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
          <div className="mt-24 sm:mt-32 lg:mt-16">
            <p className="text-sm font-medium text-blue-600">
              Share event photos using Face Recognition
            </p>
          </div>
          <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Most powerful photo sharing platform
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            We have a solution for all your requirements
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <button
              onClick={handleCreateEvent}
              className="rounded-md bg-blue-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Create New Event
            </button>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8">
            <div className="flex items-center gap-x-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">99.3%</p>
                <p className="text-sm text-gray-600">Accuracy</p>
              </div>
            </div>
            <div className="flex items-center gap-x-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">100%</p>
                <p className="text-sm text-gray-600">Secure</p>
              </div>
            </div>
          </div>
        </div>
        {showImage && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            className="mx-auto mt-16 sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 xl:ml-32 relative w-[320px] h-[640px] bg-black rounded-[3rem] border-[14px] border-black overflow-hidden shadow-xl"
          >
            <div className="absolute top-0 w-full h-6 bg-black z-10 flex justify-center">
              <div className="w-20 h-4 bg-black rounded-b-2xl"></div>
            </div>
            <div className="h-full w-full overflow-y-auto bg-white grid grid-cols-2 gap-2 p-2">
              {[
                { src: 'https://i0.wp.com/josiahandsteph.com/wp-content/uploads/2021/06/An-Elegant-Pen-Ryn-Estate-Wedding-in-Bensalem-PA-Sam-Lexi-0079-scaled.jpg?w=1920', title: 'Wedding Celebration' },
                { src: 'https://offloadmedia.feverup.com/secretmumbai.com/wp-content/uploads/2024/10/22180638/Birthday-ideas-Freepik-1024x683.jpg', title: 'Birthday Party' },
                { src: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_8eZYDeRpNHeeAdLukfZxHC5T9s9DVIphZQ&s', title: 'Corporate Event' },
                { src: 'https://i0.wp.com/josiahandsteph.com/wp-content/uploads/2021/06/An-Elegant-Pen-Ryn-Estate-Wedding-in-Bensalem-PA-Sam-Lexi-0079-scaled.jpg?w=1920', title: 'Wedding Celebration' },
                { src: 'https://offloadmedia.feverup.com/secretmumbai.com/wp-content/uploads/2024/10/22180638/Birthday-ideas-Freepik-1024x683.jpg', title: 'Birthday Party' },
                { src: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_8eZYDeRpNHeeAdLukfZxHC5T9s9DVIphZQ&s', title: 'Corporate Event' }
              ].map((image, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  className="relative aspect-square overflow-hidden rounded-lg shadow-md"
                >
                  <img
                    src={image.src}
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                    <p className="text-white text-xs font-medium truncate">{image.title}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Hero;
