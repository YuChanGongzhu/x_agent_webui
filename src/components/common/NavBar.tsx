import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NavBar: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-purple-800' : '';
  };

  return (
    <nav className="bg-purple-700 text-white">
      {/* Desktop navbar */}
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold">Crawler Frontend</span>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              <Link 
                to="/" 
                className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-800 ${isActive('/')}`}
              >
                Dashboard
              </Link>
              <Link 
                to="/jobs" 
                className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-800 ${isActive('/jobs')}`}
              >
                Crawler Jobs
              </Link>
              <Link 
                to="/data" 
                className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-800 ${isActive('/data')}`}
              >
                Data Viewer
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-purple-200 hover:text-white hover:bg-purple-800 focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded="false"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {!isMobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      {isMobileMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/') ? 'bg-purple-800 text-white' : 'text-purple-200 hover:bg-purple-800'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              to="/jobs"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/jobs') ? 'bg-purple-800 text-white' : 'text-purple-200 hover:bg-purple-800'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Crawler Jobs
            </Link>
            <Link
              to="/data"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/data') ? 'bg-purple-800 text-white' : 'text-purple-200 hover:bg-purple-800'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Data Viewer
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
