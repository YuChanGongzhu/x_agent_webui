import React, { useEffect, useState } from "react";
import { Avatar, Button } from "antd";
import { useUser } from "../../context/UserContext";
import { getDagRuns } from "../../api/airflow";
import { supabase } from "../../auth/supabaseConfig";
import { useUserStore } from "../../store/userStore";
// 样式系统
const styles = {
  // 主容器样式
  container: {
    display: "flex",
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    backgroundColor: "#fff",
    minHeight: "80px",
    width: "100%",
    boxSizing: "border-box" as const,
  },

  // 头像区域样式
  avatarSection: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: "16px",
  },

  // 用户信息区域样式
  userInfoSection: {
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    flex: 1,
    paddingLeft: "20px",
    minWidth: "200px",
  },

  // 账户信息样式
  accountInfo: {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    marginBottom: "0.625rem",
  },

  // 标签样式
  accountLabel: {
    display: "inline-block",
    height: "auto",
    fontSize: "1.375rem",
    color: "#333",
  },

  // 邮箱样式
  emailText: {
    display: "inline-block",
    height: "auto",
    fontSize: "1.125rem",
    color: "#333",
  },

  // 统计区域样式
  statsSection: {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    minWidth: "200px",
    justifyContent: "space-between",
    gap: "20px",
  },

  // 统计项样式
  statsItem: {
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    alignItems: "flex-end",
  },

  // 统计标签样式
  statsLabel: {
    fontSize: "0.875rem",
    color: "#999999",
    marginBottom: "0.3125rem",
  },

  // 统计数值样式
  statsValue: {
    fontSize: "1.375rem",
    color: "#333",
  },

  // 统计数值小号样式
  statsValueSmall: {
    fontSize: "0.875rem",
    color: "#333",
  },

  // 控制区域样式
  controlSection: {
    display: "flex",
    flexDirection: "column" as const,
    minWidth: "120px",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: "8px",
  },

  // 渐变按钮样式
  gradientButton: {
    border: "1px solid #8389FC",
    borderRadius: "0.125rem",
    padding: "0.25rem 0.9375rem",
    background: "linear-gradient(135deg, #8389FC, #D477E1)",
    borderColor: "transparent",
    transition: "all 0.3s ease",
    position: "relative" as const,
    overflow: "hidden" as const,
  },

  // 响应式容器样式（小屏幕）
  containerMobile: {
    flexDirection: "column" as const,
    alignItems: "stretch",
    padding: "12px",
    gap: "12px",
    minHeight: "auto",
  },

  // 响应式统计区域（小屏幕）
  statsSectionMobile: {
    justifyContent: "space-around",
    minWidth: "auto",
    width: "100%",
  },

  // 响应式控制区域（小屏幕）
  controlSectionMobile: {
    alignItems: "center",
    minWidth: "auto",
    width: "100%",
  },
};

const ContentTopUserMessage = React.memo(() => {
  const { email, isAdmin, userProfile, isLoading, initialize } = useUserStore();
  const [tasks, setTasks] = useState<number>(0);
  const [runningTasks, setRunningTasks] = useState<number>(0);
  const [successFailedTasks, setSuccessFailedTasks] = useState(0); //任务进度要成功/失败
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const displayname = userProfile?.display_name || email?.split("@")[0] || "用户";
  const AvatorIcon = (
    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayname}`} alt="User" />
  );

  // 响应式监听
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 确保用户数据已初始化
  useEffect(() => {
    if (!email && !isLoading) {
      console.log("ContentTopUserMessage: 初始化用户数据");
      initialize();
    }
  }, [email, isLoading, initialize]);

  useEffect(() => {
    fetchTasks();
  }, [email, isAdmin]);
  // 按钮悬停效果处理
  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "linear-gradient(135deg, #D477E1, #8389FC)";
  };

  const handleButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "linear-gradient(135deg, #8389FC, #D477E1)";
  };
  const fetchTasks = async () => {
    try {
      const response = await getDagRuns("xhs_auto_progress", 200, "-start_date");
      handleRunningTasks(response.dag_runs);
      //筛选出成功失败
      const successFailedData = response.dag_runs.filter(
        (task: any) =>
          (task.state === "success" && task.note !== "paused") || task.state === "failed"
      );
      //如果不是管理员，筛选账号的任务数量，如果是，直接总数
      if (!isAdmin && email) {
        const userTasks = response.dag_runs.filter((tasks: any) => {
          return tasks.conf.email === email;
        });
        setTasks(userTasks.length);
      } else {
        setTasks(response.dag_runs.length);
      }
      setSuccessFailedTasks(successFailedData.length);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };
  //筛选出正在运行的任务数量
  const handleRunningTasks = (data: any[]) => {
    const runningTasks = data.filter((task) => task.state === "running");
    setRunningTasks(runningTasks.length);
  };

  // 显示加载状态
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div
          style={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "center" }}
        >
          <span style={{ color: "#999" }}>加载用户信息中...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.container,
        ...(isMobile ? styles.containerMobile : {}),
      }}
    >
      <div style={styles.avatarSection}>
        <Avatar size={{ xs: 32, sm: 40, md: 48, lg: 56, xl: 64, xxl: 72 }} icon={AvatorIcon} />
      </div>

      {/* 用户信息区域 */}
      <div style={styles.userInfoSection}>
        <div style={styles.accountInfo}>
          <span style={styles.accountLabel}>账户：</span>
          <span style={styles.emailText}>{email || "未登录"}</span>
        </div>
      </div>

      {/* 总任务量统计 任务进度统计 */}
      <div
        style={{
          ...styles.statsSection,
          ...(isMobile ? styles.statsSectionMobile : {}),
        }}
      >
        <div style={styles.statsItem}>
          <span style={styles.statsLabel}>总任务量</span>
          <span style={styles.statsValue}>{tasks || "--"}</span>
        </div>
        <div style={styles.statsItem}>
          <span style={styles.statsLabel}>任务进度</span>
          <span style={styles.statsValue}>
            {runningTasks || "--"}
            <span style={styles.statsValueSmall}>/{successFailedTasks || "--"}</span>
          </span>
        </div>
      </div>

      {/* 控制区域 */}
      <div
        style={{
          ...styles.controlSection,
          ...(isMobile ? styles.controlSectionMobile : {}),
        }}
      >
        <span style={styles.statsLabel}>总任务控制</span>
        <Button
          type="primary"
          style={styles.gradientButton}
          onMouseEnter={handleButtonHover}
          onMouseLeave={handleButtonLeave}
        >
          开始/暂停
        </Button>
      </div>
    </div>
  );
});

export default ContentTopUserMessage;
