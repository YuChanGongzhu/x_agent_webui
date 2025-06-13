import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './navBar/navBar';
import Login from './login/Login';
import Register from './login/Register';
import ProtectedRoute from './components/ProtectedRoute';
import ManagementPage from './management/ManagementPage';
import { UserProvider } from './context/UserContext';
import { KeywordProvider } from './context/KeywordContext';
import XHSAutomation from './xhs/XHSAutomation';
import DataCollect from './xhs/pages/DataCollect';
import DataFilter from './xhs/pages/DataFilter';
import DataAnalyze from './xhs/pages/DataAnalyze';
import GenerateMsg from './xhs/pages/GenerateMsg';
import TemplateManager from './xhs/pages/TemplateManager';
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
                <KeywordProvider>
                  <div className="flex w-full h-full">
                    <NavBar />
                    <main className="flex-1 overflow-y-auto bg-white rounded-lg shadow-lg p-4" style={{ margin: '1rem', height: 'calc(100vh - 2rem)' }}>
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/manage" element={<ManagementPage />} />
                        <Route path="/xhs" element={<XHSAutomation />} />
                        <Route path="/xhs/collect" element={<DataCollect />} />
                        <Route path="/xhs/filter" element={<DataFilter />} />
                        <Route path="/xhs/analyze" element={<DataAnalyze />} />
                        <Route path="/xhs/generate" element={<GenerateMsg />} />
                        <Route path="/xhs/templates" element={<TemplateManager />} />
                        <Route path="/devices" element={<DeviceManagement />} />
                      </Routes>
                    </main>
                  </div>
                </KeywordProvider>
              </UserProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
