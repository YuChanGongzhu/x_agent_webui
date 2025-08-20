import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../auth/authService";
import { useUserStore } from "../store/userStore";

interface LogoutButtonProps {
  className?: string;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ className }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();

      // 主动清理前端本地状态与缓存，避免旧会话残留
      try {
        // 清空 zustand 持久化的用户存储
        const reset = useUserStore.getState().reset;
        reset();
      } catch {}

      try {
        // 清理 localStorage 中可能残留的 supabase token 和用户存储
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (key === "user-store" || key.startsWith("sb-")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}

      // 先用路由跳转，再做一次硬跳转确保彻底卸载
      navigate("/login", { replace: true });
      setTimeout(() => {
        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
      }, 50);
    } catch (error) {
      console.error("退出登录失败", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`flex items-center justify-center ${className}`}
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? (
        <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-current rounded-full mr-2"></div>
      ) : null}
      <span>退出登录</span>
    </button>
  );
};

export default LogoutButton;
