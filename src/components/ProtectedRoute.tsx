import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../auth/supabaseConfig";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true; // 防止组件卸载后的状态更新
    // 检查当前用户会话
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return; // 组件已卸载，不更新状态
        if (error) {
          setIsAuthenticated(false);
        } else {
          const hasSession = !!data.session;
          setIsAuthenticated(hasSession);
        }
      } catch (error) {
        if (!mounted) return;
        setIsAuthenticated(false);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    // 订阅认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;

      setIsAuthenticated(!!session);

      // 确保加载状态正确设置
      if (isLoading) {
        setIsLoading(false);
      }
    });

    // 清理函数
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 未认证则重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
