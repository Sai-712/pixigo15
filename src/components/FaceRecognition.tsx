import React from 'react';

const FaceRecognition = () => {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-5">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Face Recognition powered Sharing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Click a Selfie to find your photos instantly
            </p>
            <p className="mt-2 text-lg text-gray-600">
              New way to distribute Photos - Easy, Private and Fast.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-x-6">
              <div className="flex items-center gap-x-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">99.3%</p>
                  <p className="text-sm text-gray-600">Accuracy</p>
                </div>
              </div>
              <div className="flex items-center gap-x-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">100%</p>
                  <p className="text-sm text-gray-600">Secure</p>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <a
                href="#"
                className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Create New Event
              </a>
            </div>
          </div>

          <div className="mt-16 sm:mt-24 lg:col-span-7 lg:mt-0">
            <div className="relative">
              <div className="relative overflow-hidden rounded-xl shadow-xl ring-1 ring-gray-400/10 bg-gray-50">
                <img
                  src="/face-recognition-demo.svg"
                  alt="Face Recognition Demo"
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent">
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">Face Match</span>
                        <span className="text-sm font-bold text-primary">99.3%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: '99.3%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg transform hover:scale-105 transition-transform duration-300">
                AI Powered
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;
