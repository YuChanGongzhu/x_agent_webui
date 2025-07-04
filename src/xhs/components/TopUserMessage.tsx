import React, { useEffect, useState } from "react";
import { Avatar, Button } from "antd";
import { useUser } from "../../context/UserContext";
import { getDagRuns } from "../../api/airflow";
import { supabase } from "../../auth/supabaseConfig";
// 样式系统
const styles = {
  // 主容器样式
  container: {
    display: "flex",
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.625rem",
    backgroundColor: "#fff",
  },

  // 头像区域样式
  avatarSection: {
    width: "5%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // 用户信息区域样式
  userInfoSection: {
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
    width: "65%",
    paddingLeft: "1.25rem",
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

  // 描述文本样式
  descriptionText: {
    fontSize: "0.875rem",
    color: "#999999",
  },

  // 统计区域样式
  statsSection: {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    width: "10%",
    justifyContent: "flex-end",
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

  // 分隔线样式
  divider: {
    backgroundColor: "#999999",
    width: "0.0625rem",
    height: "0.9375rem",
    marginLeft: "1.875rem",
  },

  // 控制区域样式
  controlSection: {
    display: "flex",
    flexDirection: "column" as const,
    width: "10%",
    justifyContent: "center",
    alignItems: "flex-end",
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
};

const TopUserMessage = () => {
  const { email, isAdmin, userProfile } = useUser();
  const [tasks, setTasks] = useState<number>(0);
  const [userData, setUserData] = useState<{ displayName: string | null; email: string | null }>({
    displayName: null,
    email: null,
  });
  useEffect(() => {
    // 订阅认证状态变化（仅用于基本登录信息）
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const user = session.user;
        setUserData({
          displayName: user.user_metadata?.name || user.email?.split("@")[0] || null,
          email: user.email || null,
        });
      } else if (event === "SIGNED_OUT") {
        setUserData({
          displayName: null,
          email: null,
        });
      }
    });

    // 初始化当前用户的基本信息（仅在上下文加载之前使用）
    const initBasicUserInfo = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserData({
          displayName: user.user_metadata?.name || user.email?.split("@")[0] || null,
          email: user.email || null,
        });
      }
    };

    initBasicUserInfo();

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (userProfile) {
      setUserData((prev) => ({
        ...prev,
        displayName: userProfile.display_name || prev.displayName,
      }));
    }
  }, [userProfile]);
  const AvatorIcon = (
    <img
      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
        userData.displayName || userData.email || "User"
      }`}
      alt="User"
    />
  );

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
      setTasks(response.dag_runs.length);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  return (
    <div style={styles.container}>
      <Avatar size={{ xs: 24, sm: 32, md: 40, lg: 64, xl: 80, xxl: 100 }} icon={AvatorIcon} />
      {/* 用户信息区域 */}
      <div style={styles.userInfoSection}>
        <div style={styles.accountInfo}>
          <span style={styles.accountLabel}>账户：</span>
          <span style={styles.emailText}>{email}</span>
        </div>
        <span style={styles.descriptionText}>
          User interaction expert | ant financial service - business group - platform department -
          technology department -UED
        </span>
      </div>
      {/* 总任务量统计 */}
      <div style={styles.statsSection}>
        <div style={styles.statsItem}>
          <span style={styles.statsLabel}>总任务量</span>
          <span style={styles.statsValue}>{tasks ? tasks : "--"}</span>
        </div>
        <div style={styles.divider} />
      </div>
      {/* 任务进度统计 */}
      <div style={styles.statsSection}>
        <div style={styles.statsItem}>
          <span style={styles.statsLabel}>任务进度</span>
          <span style={styles.statsValue}>
            8<span style={styles.statsValueSmall}>/{tasks ? tasks : "--"}</span>
          </span>
        </div>
        <div style={styles.divider} />
      </div>
      {/* 控制区域 */}
      <div style={styles.controlSection}>
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
};

export default TopUserMessage;
