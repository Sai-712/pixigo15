import React, { useState } from 'react';
import { motion } from 'framer-motion';

const Pricing = () => {
  const [customPhotoCount, setCustomPhotoCount] = useState('');
  const [customPrice, setCustomPrice] = useState<number | null>(null);

  const calculatePrice = (count: number) => {
    if (count < 5000) {
      return count * 1.5;
    } else if (count < 25000) {
      return count * 1.5;
    } else {
      return count * 1.35;
    }
  };

  const handleCustomInput = (value: string) => {
    setCustomPhotoCount(value);
    const count = parseInt(value);
    if (!isNaN(count) && count > 0) {
      const price = calculatePrice(count);
      setCustomPrice(price);
    } else {
      setCustomPrice(null);
    }
  };

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Plans as per your needs
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Select the plan that best fits your need. One-time charges, no recurring cost.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Custom Plan */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="rounded-3xl p-8 ring-1 ring-gray-200 bg-white shadow-lg"
          >
            <h3 className="text-lg font-semibold leading-8 text-gray-900 text-center">Custom</h3>
            <div className="mt-4">
              <input
                type="number"
                value={customPhotoCount}
                onChange={(e) => handleCustomInput(e.target.value)}
                placeholder="Enter Photo Count"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <p className="mt-6 text-center text-gray-600">Photos</p>
            <p className="mt-2 text-center text-gray-500">
              {customPrice ? (
                <>
                  <span className="text-2xl font-bold text-gray-900">₹{customPrice.toFixed(2)}</span>
                  <br />
                  <span className="text-sm">excl. GST</span>
                  <br />
                  <span className="text-sm">₹{(customPrice * 1.18).toFixed(2)} incl. GST</span>
                </>
              ) : (
                <span className="text-sm">Enter photos count above to view prices</span>
              )}
            </p>
            <button
              className="mt-6 w-full rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Select
            </button>
          </motion.div>

          {/* Small Plan */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="rounded-3xl p-8 ring-1 ring-gray-200 bg-white shadow-lg"
          >
            <h3 className="text-lg font-semibold leading-8 text-gray-900 text-center">Small</h3>
            <p className="mt-4 text-5xl font-bold tracking-tight text-gray-900 text-center">5,000</p>
            <p className="mt-6 text-center text-gray-600">Photos</p>
            <p className="mt-2 text-center text-gray-500">
              @ ₹1.5 per photo
              <br />
              <span className="text-2xl font-bold text-gray-900">₹7,500</span>
              <br />
              <span className="text-sm">excl. GST</span>
              <br />
              <span className="text-sm">₹8,850 incl. GST</span>
            </p>
            <button
              className="mt-6 w-full rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Select
            </button>
          </motion.div>

          {/* Medium Plan */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="rounded-3xl p-8 ring-1 ring-gray-200 bg-white shadow-lg"
          >
            <h3 className="text-lg font-semibold leading-8 text-gray-900 text-center">Medium</h3>
            <p className="mt-4 text-5xl font-bold tracking-tight text-gray-900 text-center">25,000</p>
            <p className="mt-6 text-center text-gray-600">Photos</p>
            <p className="mt-2 text-center text-gray-500">
              @ ₹1.35 per photo
              <br />
              <span className="text-2xl font-bold text-gray-900">₹33,750</span>
              <br />
              <span className="text-sm">excl. GST</span>
              <br />
              <span className="text-sm">₹39,825 incl. GST</span>
            </p>
            <button
              className="mt-6 w-full rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Select
            </button>
          </motion.div>

          {/* Bulk Plan */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="rounded-3xl p-8 ring-1 ring-gray-200 bg-white shadow-lg"
          >
            <h3 className="text-lg font-semibold leading-8 text-gray-900 text-center">Bulk</h3>
            <p className="mt-4 text-2xl font-bold tracking-tight text-gray-900 text-center">
              Contact us for<br />Bulk Pricing
            </p>
            <p className="mt-6 text-center text-gray-600">
              (recurring -<br />multi event use)
            </p>
            <button
              className="mt-6 w-full rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Contact Us
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
