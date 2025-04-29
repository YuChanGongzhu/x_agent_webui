import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
const Dashboard = () => {
  const { user } = useAuth();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Crawler Dashboard</h1>
      <p className="mb-4">Welcome to the Crawler Management System</p>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-2">User Information</h2>
        <p><span className="font-medium">Email:</span> {user?.email}</p>
        <p><span className="font-medium">Role:</span> {user?.role}</p>
        <p><span className="font-medium">Status:</span> {user?.is_active ? 'Active' : 'Inactive'}</p>
      </div>
    </div>
  );
};

const CrawlerJobs = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Crawler Jobs</h1>
    <p>Manage and monitor crawler jobs</p>
  </div>
);

const DataViewer = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Data Viewer</h1>
    <p>View and analyze crawled data</p>
  </div>
);

const Navigation = () => {
  const { user, logout, isAdmin } = useAuth();
  
  return (
    <nav className="bg-purple-700 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-xl font-bold">X-Agent WebUI</div>
        
        {user && (
          <div className="flex items-center">
            <ul className="flex space-x-4 mr-6">
              <li>
                <Link to="/" className="hover:text-purple-200">Dashboard</Link>
              </li>
              <li>
                <Link to="/jobs" className="hover:text-purple-200">Crawler Jobs</Link>
              </li>
              <li>
                <Link to="/data" className="hover:text-purple-200">Data Viewer</Link>
              </li>
              {isAdmin() && (
                <li>
                  <Link to="/admin" className="hover:text-purple-200">Admin</Link>
                </li>
              )}
            </ul>
            
            <div className="flex items-center">
              <span className="mr-3 text-sm">{user.email}</span>
              <button
                onClick={logout}
                className="px-3 py-1 text-sm bg-purple-800 rounded hover:bg-purple-900"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

const AdminPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
    <p>Admin only area</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Navigation />
          
          <div className="container mx-auto py-4">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/jobs" element={<CrawlerJobs />} />
                <Route path="/data" element={<DataViewer />} />
              </Route>
              
              {/* Admin-only routes */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
              
              {/* Catch all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
