/** @jsxImportSource react */
import { GoogleOAuthProvider } from "@react-oauth/google";
import React, { useEffect } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const ALLOWED_ORIGINS = [
  'https://3dprinting.space',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://main.d2egbkasraqmnr.amplifyapp.com',
  'https://main.dlyhbjyn2h6lw.amplifyapp.com'
];

// Allow all origins in development mode
if (import.meta.env.DEV) {
  ALLOWED_ORIGINS.push(window.location.origin);
}

export const GoogleAuthConfig: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Verify current origin is allowed and construct redirect URI
    const currentOrigin = window.location.origin;
    const redirectUri = `${currentOrigin}/auth/google/callback`;
    
    if (!ALLOWED_ORIGINS.includes(currentOrigin)) {
      console.error(`Error: Current origin ${currentOrigin} is not in the allowed list for Google OAuth. Please ensure this redirect URI is configured in Google Cloud Console: ${redirectUri}`);
      return;
    }

    // Handle potential Google Sign-In errors gracefully
    const originalError = console.error;
    console.error = (...args) => {
      // Filter out known Google Sign-In errors in development
      if (
        args[0] && 
        typeof args[0] === 'string' && 
        (args[0].includes('GSI_LOGGER') || 
         args[0].includes('Failed to execute \'postMessage\'') ||
         args[0].includes('Error retrieving a token'))
      ) {
        // Log warning instead of error in development
        if (import.meta.env.DEV) {
          console.warn('Google Sign-In development warning:', args[0]);
          return;
        }
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    console.warn("Google Client ID is missing. OAuth features will be disabled.");
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider 
      clientId={GOOGLE_CLIENT_ID}
      onScriptLoadError={() => {
        console.error("Google Sign-In script failed to load");
      }}
      onError={(error:any) => {
        console.error("Google OAuth Error:", error);
        if (error.type === "redirect_uri_mismatch") {
          console.error(`Please verify the redirect URI in Google Cloud Console matches: ${window.location.origin}/auth/google/callback`);
        }
      }}
    >
      {children}
    </GoogleOAuthProvider>
  );
};