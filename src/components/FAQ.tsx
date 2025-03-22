import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'How does the AI categorization work?',
    answer:
      'Our AI analyzes your photos to identify people, places, objects, and events. It uses machine learning to recognize patterns and categorize your images automatically, making them easily searchable without you having to manually tag them.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. We use end-to-end encryption to ensure your photos are only accessible to you and those you choose to share them with. Your privacy is our top priority, and we never use your photos for training our AI without explicit permission.',
  },
  {
    question: 'Can I access my photos offline?',
    answer:
      'Yes, you can mark specific albums or photos as "Available Offline" in the mobile app. These will be stored locally on your device so you can access them even without an internet connection.',
  },
  {
    question: 'How do I share my photos with friends and family?',
    answer:
      'Pixigo makes sharing simple. You can create shareable links for individual photos or entire albums, set permissions for who can view or edit, and even collaborate on shared albums with family members.',
  },
  {
    question: 'What happens if I exceed my storage limit?',
    answer:
      "If you approach your storage limit, we'll notify you and provide options to upgrade to a plan with more storage. Your existing photos will remain safe and accessible even if you exceed your limit temporarily.",
  },
  {
    question: 'Can I cancel my subscription at any time?',
    answer:
      "Yes, you can cancel your subscription at any time. If you cancel, you'll continue to have access to your premium features until the end of your billing cycle. After that, you'll be downgraded to the Basic plan but will still have access to all your photos.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div id="faq" className="bg-gradient-to-b from-white to-blue-50 py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600">FAQ</h2>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Frequently Asked Questions
          </p>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-8 text-gray-600">
            Common questions about our service and how it works
          </p>
        </div>
        <div className="mx-auto mt-8 sm:mt-16 max-w-2xl divide-y divide-gray-900/10">
          {faqs.map((faq, index) => (
            <div key={index} className="py-4 sm:py-6">
              <button
                onClick={() => toggleFaq(index)}
                className="flex w-full items-start justify-between text-left py-2 sm:py-3 focus:outline-none"
              >
                <span className="text-sm sm:text-base font-semibold leading-7 text-gray-900">{faq.question}</span>
                <span className="ml-6 flex h-7 items-center">
                  <svg
                    className={`h-5 w-5 sm:h-6 sm:w-6 transform ${openIndex === index ? 'rotate-180' : 'rotate-0'} transition-transform duration-200 ease-in-out`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              <div className={`mt-2 pr-6 sm:pr-12 ${openIndex === index ? 'block' : 'hidden'}`}>
                <p className="text-sm sm:text-base leading-7 text-gray-600">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQ;