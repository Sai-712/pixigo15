import React from 'react';
import { GoogleLogin as GoogleLoginButton } from '@react-oauth/google';
import { storeUserCredentials } from '../config/dynamodb';
import { jwtDecode as jwt_decode } from 'jwt-decode';

interface GoogleLoginProps {
  onSuccess: (credentialResponse: any) => void;
  onError: () => void;
}

interface GoogleUserData {
  email: string;
  name: string;
  picture: string;
  sub: string;
}

const GoogleLogin: React.FC<GoogleLoginProps> = ({ onSuccess, onError }) => {
  const handleSuccess = async (credentialResponse: any) => {
    try {
      const decoded: GoogleUserData = jwt_decode(credentialResponse.credential);
      
      // Store user data in DynamoDB
      await storeUserCredentials({
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        googleId: decoded.sub
      });

      // Call the original onSuccess callback
      onSuccess(credentialResponse);
    } catch (error) {
      console.error('Error processing Google login:', error);
      onError();
    }
  };

  return (
    <div className="flex justify-center p-2 rounded-lg hover:bg-blue-50 transition-all duration-300">
      <div className="w-full max-w-xs bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-blue-100">
      <GoogleLoginButton
        onSuccess={handleSuccess}
        onError={onError}
        useOneTap={false}
        type="standard"
        theme="outline"
        text="signin_with"
        shape="rectangular"
        logo_alignment="left"
      />
    </div>
    </div>
  );
};

export default GoogleLogin;