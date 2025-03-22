import React from 'react';

const HowItWorks = () => {
  const steps = [
    {
      title: 'Create Event & Invite guests',
      description: 'Create an event, upload photos and invite all guests',
      image: '/create event.jpeg '
    },
    {
      title: 'Click a Selfie to find photos',
      description: 'Guest opens the link & clicks a selfie to find their photos',
      image: '/Click a Selfie to find photos1.jpeg'
    },
    {
      title: 'Get your photos',
      description: 'Guests can view, buy, download & share photos',
      image: '/Get your photos .jpeg '
    }
  ];

  return (
    <div className="bg-blue-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How it works. Easy & Fast
          </h2>
          <p className="mt-2 text-lg leading-8 text-gray-600">
            World's fastest & easiest solution for Photo Sharing and Sales
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-x-8 gap-y-16 sm:mt-20 sm:max-w-none sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="mb-6 rounded-2xl flex items-center justify-center rounded-2xl bg-blue-100 p-4 shadow-lg ring-1 ring-gray-900/10">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="absolute -left-4 -top-4 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
                  {index + 1}
                </div>
              </div>
              <h3 className="mt-6 text-lg font-semibold leading-8 text-gray-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-gray-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;