import React from 'react';
import { Camera, Image, Upload, Search, Cloud, Lock } from 'lucide-react';



const Features = () => {
  return (
    <div id="features" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <div className="flex flex-col items-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Sell photos to event participants</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl text-center">
              You can sell photos to event guests to generate revenue for your event
            </p>
            <div className="mt-6 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <h3 className="text-xl font-semibold mb-4">Liveliness Detection</h3>
                  <p className="text-gray-600">Advanced security features to ensure authentic photo uploads</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg mt-4">
                  <h3 className="text-xl font-semibold mb-4">Website Integration</h3>
                  <p className="text-gray-600">Seamlessly integrate photo galleries into your website</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg mt-4">
                  <h3 className="text-xl font-semibold mb-4">Branding & Promotions</h3>
                  <p className="text-gray-600">Customize your gallery with your brand elements</p>
                </div>
              </div>
              <div className="flex-1 relative">
                
                  <div className="space-y-4">
                    
                      <img src="/Sell photos to event participants.jpeg" alt="Photo" className="w-[1000px] h-[400px] object-cover rounded-2xl" />
                    </div>
                    
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        
      
    
  );
};
       
                  

export default Features;