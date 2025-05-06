import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './navBar/navBar';
import Login from './login/Login';
import Register from './login/Register';
import ProtectedRoute from './components/ProtectedRoute';
import ManagementPage from './management/ManagementPage';
import { UserProvider } from './context/UserContext';
import XHSAutomation from './xhs/XHSAutomation';
import DeviceManagement from './devices/DeviceManagement';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <UserProvider>
                  <div className="flex">
                    <NavBar />
                    <div className="flex-1">
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/manage" element={<ManagementPage />} />
                        <Route path="/xhs" element={<XHSAutomation />} />
                        <Route path="/devices" element={<DeviceManagement />} />
                      </Routes>
                    </div>
                  </div>
              </UserProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
