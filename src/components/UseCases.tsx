import React from 'react';

const UseCases = () => {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Boost your or sponsor's brand
          </h2>
          <p className="mt-2 text-lg leading-8 text-gray-600">
            Best in class analytics to measure social reach and ROI
          </p>
        </div>

        <div className="mt-16 lg:grid lg:grid-cols-2 lg:gap-12">
          <div className="lg:col-span-1">
            <h3 className="text-2xl font-semibold mb-6">Use photos to amplify your event and brand's reach</h3>
            
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="flex items-center gap-x-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <span className="text-2xl font-bold text-red-500">120x</span>
                </div>
                <p className="text-sm text-gray-600">Social reach</p>
              </div>
              <div className="flex items-center gap-x-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <span className="text-2xl font-bold text-red-500">10x</span>
                </div>
                <p className="text-sm text-gray-600">ROI</p>
              </div>
            </div>

            <div className="mt-8">
              <a
                href="#"
                className="rounded-md bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                Create New Event
              </a>
            </div>
          </div>

          <div className="mt-12 lg:mt-0 lg:col-span-1">
            <div className="relative bg-white rounded-xl shadow-lg p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">25k photos uploaded</span>
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">17k selfies</span>
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">9k social media shares</span>
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">1.2Million Brand impressions</span>
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseCases;