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
import GenerateMsg from "./xhs/pages/GenerateMsg";
import TemplateManager from "./xhs/pages/TemplateManager";
import Drafts from "./xhs/pages/contentCreationManagement/drafts";
import ReplyToComments from "./xhs/pages/ReplyToComments/ReplyToComments";
import DeviceManagement from "./devices/DeviceManagement";
import ModuleBoard from "./xhs/components/ModuleBoard";
import CustomerAcquisitionTaskManagement from "./xhs/pages/customerAcquisitionTaskManagement";
import ContentCreationManagement from "./xhs/pages/contentCreationManagement/ContentCreationManagement";
import { ConfigProvider, App as AntdApp } from "antd";
import config from "./themeConfig/config";
import BasePermission from "./components/BaseComponents/BasePermission";
import DashTaskVeiw from "./xhs/pages/DashTaskView";
import zhCN from "antd/es/locale/zh_CN"; // 中文
import enUS from "antd/es/locale/en_US";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn"; // 导入dayjs中文语言包

// 设置dayjs全局中文语言
dayjs.locale("zh-cn");

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
                    <AntdApp>
                      <div className="flex w-full h-full">
                        <NavBar />
                        <main
                          className="flex-1 bg-white rounded-lg shadow-lg p-4 overflow-y-auto"
                          style={{
                            margin: "1rem",
                            height: "calc(100vh - 2rem)",
                          }}
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
                            <Route path="/xhs/dashboard/taskview" element={<DashTaskVeiw />} />
                            {/* <Route path="/xhs/templates" element={<TemplateManager />} /> */}
                            <Route path="/xhs/dashboard/modules" element={<ModuleBoard />} />
                            <Route path="/devices" element={<DeviceManagement />} />
                            <Route
                              path="/xhs/dashboard/customerAcquisitionTaskManagement"
                              element={<CustomerAcquisitionTaskManagement />}
                            />
                            <Route
                              path="/xhs/dashboard/contentCreationManagement"
                              element={<ContentCreationManagement />}
                            />
                            <Route
                              path="/xhs/pages/contentCreationManagement/drafts"
                              element={<Drafts />}
                            />
                            <Route
                              path="/xhs/pages/ReplyToComments"
                              element={<ReplyToComments />}
                            />
                          </Routes>
                        </main>
                      </div>
                    </AntdApp>
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
