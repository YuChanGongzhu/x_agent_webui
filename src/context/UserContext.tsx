import React, { ReactNode, useEffect } from "react";
import { UserContextType } from "./type";
import { useUserStore, userSelectors } from "../store/userStore";

// 轻量 Provider：保持组件树不变，同时把来源切换到 useUserStore
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isInitialized = useUserStore(userSelectors.isInitialized);
  const isLoading = useUserStore(userSelectors.isLoading);
  const initialize = useUserStore((s) => s.initialize);

  // 冷启动时，如果尚未初始化，则拉起一次初始化
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initialize();
    }
  }, [isInitialized, isLoading, initialize]);

  return <>{children}</>;
};

// 统一导出的 useUser：从 store 读取并返回与 UserContextType 一致的结构
export const useUser = (): UserContextType => {
  const userProfile = useUserStore(userSelectors.userProfile);
  const isAdmin = useUserStore(userSelectors.isAdmin);
  const isInitialized = useUserStore(userSelectors.isInitialized);
  const storeIsLoading = useUserStore(userSelectors.isLoading);
  const error = useUserStore(userSelectors.error);
  const email = useUserStore(userSelectors.email);
  const refreshUserProfile = useUserStore((s) => s.refreshUserProfile);
  const refreshUserDeviceList = useUserStore((s) => s.refreshUserDeviceList);
  const userDeviceNickNameList = useUserStore(userSelectors.userDeviceNickNameList);

  // 对外暴露的 isLoading：在未初始化完成前视为加载中，避免旧值闪现
  const isLoading = storeIsLoading || !isInitialized;

  return {
    userProfile,
    isAdmin,
    isLoading,
    error,
    email,
    refreshUserProfile,
    refreshUserDeviceList,
    userDeviceNickNameList,
  };
};
