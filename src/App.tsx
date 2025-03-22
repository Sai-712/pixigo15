import React from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, Navigate } from 'react-router-dom';
import PhotoGallery from './components/PhotoGallery';
import FaceRecognition from './components/FaceRecognition';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import Pricing from './components/Pricing';
import UploadImage from './components/UploadImage';
import UploadSelfie from './components/UploadSelfie';
import EventDashboard from './components/EventDashboard';
import EventDetail from './components/EventDetail';
import ViewEvent from './components/ViewEvent';
import { GoogleAuthConfig } from './config/GoogleAuthConfig';

const App = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showNavbar, setShowNavbar] = React.useState(true);
  return (
    <GoogleAuthConfig>
      <Router>
        <div className="min-h-screen bg-white">
          <Navbar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
          <Routes>
            <Route path="/" element={
              <div className="animate-slideIn">
                <Hero />
                <PhotoGallery />
                <FaceRecognition />
                <HowItWorks />
                <Features />
                <Pricing />
                <FAQ />
              </div>
            } />
            <Route path="/events" element={<div className="animate-slideIn"><EventDashboard setShowNavbar={setShowNavbar} /></div>} />
            <Route path="/event/:eventId" element={<div className="animate-slideIn"><EventDetail eventId={useParams().eventId || ''} /></div>} />
            <Route path="/upload" element={<div className="animate-slideIn"><UploadImage /></div>} />
            <Route path="/upload-image" element={<div className="animate-slideIn"><UploadImage /></div>} />
            <Route path="/upload-selfie/:eventId" element={<div className="animate-slideIn"><UploadSelfie /></div>} />
            <Route path="/upload-selfie" element={<div className="animate-slideIn"><UploadSelfie /></div>} />
            <Route path="/view-event/:eventId" element={<div className="animate-slideIn"><ViewEventWrapper /></div>} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </GoogleAuthConfig>
  );
};

const ViewEventWrapper = () => {
  const { eventId } = useParams();
  return <ViewEvent eventId={eventId || ''} />;
};

export default App;