import React from 'react';

const testimonials = [
  {
    body: 'Pixigo has completely transformed how I manage my photos. The AI categorization is incredibly accurate, and I can find any photo in seconds.',
    author: {
      name: 'Emma Thompson',
      handle: 'Professional Photographer',
      imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
  },
  {
    body: 'As a parent, I take thousands of photos of my kids. Pixigo helps me keep everything organized and easily share moments with family members who live far away.',
    author: {
      name: 'Michael Chen',
      handle: 'Family Documentarian',
      imageUrl: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
  },
  {
    body: 'The unlimited storage is a game-changer. I no longer have to worry about deleting photos to free up space on my devices. Everything is safely stored in Pixigo.',
    author: {
      name: 'Sarah Johnson',
      handle: 'Travel Enthusiast',
      imageUrl: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
  },
  {
    body: 'I was skeptical about another photo app, but Pixigo exceeded my expectations. The interface is intuitive, and the search functionality is incredibly powerful.',
    author: {
      name: 'David Rodriguez',
      handle: 'Tech Reviewer',
      imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
  },
  {
    body: "As someone who values privacy, I appreciate Pixigo's commitment to security. Knowing my personal photos are protected gives me peace of mind.",
    author: {
      name: 'Olivia Williams',
      handle: 'Privacy Advocate',
      imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
  },
  {
    body: "The automatic backup feature saved me when I lost my phone. All my photos were safely stored in Pixigo, and I didn't lose a single memory.", // Fixed by using double quotes
    author: {
      name: 'James Wilson',
      handle: 'Digital Nomad',
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
  },
];

const Testimonials = () => {
  return (
    <div id="testimonials" className="bg-gradient-to-b from-white to-blue-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600">Testimonials</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Loved by photographers and families alike
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Don't just take our word for it. Here's what our users have to say about Pixigo.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mt-20 lg:max-w-none lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="flex flex-col bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100">
              <div className="flex-1">
                <p className="text-base leading-7 text-gray-600">{testimonial.body}</p>
              </div>
              <div className="mt-6 flex items-center">
                <img className="h-12 w-12 rounded-full" src={testimonial.author.imageUrl} alt="" />
                <div className="ml-4">
                  <div className="text-base font-semibold text-gray-900">{testimonial.author.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.author.handle}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
