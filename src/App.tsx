import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./navBar/navBar";
import Login from "./login/Login";
import Register from "./login/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import ManagementPage from "./management/ManagementPage";
import { UserProvider } from "./context/UserContext";
import { KeywordProvider } from "./context/KeywordContext";
import DataCollect from "./xhs/pages/DataCollect";
import DataFilter from "./xhs/pages/DataFilter";
import DataAnalyze from "./xhs/pages/DataAnalyze";
import Dashboard from "./xhs/pages/Dashboard";
import GenerateMsg from "./xhs/pages/GenerateMsg";
import TemplateManager from "./xhs/pages/TemplateManager";
import DeviceManagement from "./devices/DeviceManagement";
import ModuleBoard from "./xhs/components/ModuleBoard";
import { ConfigProvider } from "antd";
import config from "./themeConfig/config";
import BasePermission from "./components/BaseComponents/BasePermission";
import DashTaskVeiw from "./xhs/pages/DashTaskView";
import zhCN from "antd/es/locale/zh_CN"; // 中文
import enUS from "antd/es/locale/en_US";
// 自定义排序文本
const customLocale = {
  ...zhCN,
  Table: {
    ...zhCN.Table,
    sortTitle: "点击排序",
    cancelSort: "取消排序",
    triggerDesc: "点击降序",
    triggerAsc: "点击升序",
  },
};
function App() {
  return (
    <ConfigProvider theme={config} locale={customLocale}>
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
                      <main
                        className="flex-1 overflow-y-auto bg-white rounded-lg shadow-lg p-4"
                        style={{ margin: "1rem", height: "calc(100vh - 2rem)" }}
                      >
                        <Routes>
                          <Route path="/" element={<Navigate to="/xhs/collect" replace />} />
                          <Route
                            path="/manage"
                            element={
                              <BasePermission>
                                <ManagementPage />
                              </BasePermission>
                            }
                          />
                          <Route path="/xhs/collect" element={<DataCollect />} />
                          {/* <Route path="/xhs/filter" element={<DataFilter />} /> */}
                          <Route path="/xhs/analyze" element={<DataAnalyze />} />
                          <Route path="/xhs/generate" element={<GenerateMsg />} />
                          <Route path="/xhs/dashboard" element={<Dashboard />} />
                          <Route
                            path="/xhs/dashboard/taskview"
                            element={<DashTaskVeiw />}
                          />
                          {/* <Route path="/xhs/templates" element={<TemplateManager />} /> */}
                          <Route path="/xhs/dashboard/modules" element={<ModuleBoard />} />
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
    </ConfigProvider>
  );
}

export default App;
