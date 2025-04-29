import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ adminOnly = false }) => {
  const { user, loading, isAdmin } = useAuth();
  
  // If auth is still loading, show a loading indicator
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-t-purple-700 border-purple-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If route requires admin access and user is not an admin, redirect to dashboard
  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  // If user is authenticated (and is admin if required), render the outlet
  return <Outlet />;
};

export default ProtectedRoute;
