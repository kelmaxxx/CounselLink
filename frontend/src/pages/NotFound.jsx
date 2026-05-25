// src/pages/NotFound.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-maroon-600 mb-4">404</h1>
        <h2 className="text-4xl font-semibold text-gray-900 mb-2">Oops! Page Not Found</h2>
        <p className="text-lg text-gray-600 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block bg-maroon-500 text-white px-8 py-3 rounded-lg hover:bg-maroon-600 transition font-semibold"
        >
          Go Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
