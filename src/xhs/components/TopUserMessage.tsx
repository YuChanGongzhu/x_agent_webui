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
    flex: 1,
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

  // 统计区域样式
  statsSection: {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    width: "15%",
    justifyContent: "space-between",
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

const TopUserMessage = React.memo(
  () => {
    // const { email, isAdmin, userProfile } = useUser();
    const { email, isAdmin, userProfile } = useUserStore();
    const [tasks, setTasks] = useState<number>(0);
    const [runningTasks, setRunningTasks] = useState<number>(0);
    const displayname = userProfile?.display_name || email?.split("@")[0] || "User";
    const [successFailedTasks, setSuccessFailedTasks] = useState(0); //任务进度要成功/失败
    const AvatorIcon = (
      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayname}`} alt="User" />
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
        handleRunningTasks(response.dag_runs);
        //筛选出成功失败
        const successFailedData = response.dag_runs.filter(
          (task: any) =>
            (task.state === "success" && task.note !== "paused") || task.state === "failed"
        );
        setSuccessFailedTasks(successFailedData.length);
        setTasks(response.total_entries);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };
    //筛选出正在运行的任务数量
    const handleRunningTasks = (data: any[]) => {
      const runningTasks = data.filter((task) => task.state === "running");
      setRunningTasks(runningTasks.length);
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
        </div>
        {/* 总任务量统计 任务进度统计 */}
        <div style={styles.statsSection}>
          <div style={styles.statsItem}>
            <span style={styles.statsLabel}>总任务量</span>
            <span style={styles.statsValue}>{tasks ? tasks : "--"}</span>
          </div>
          <div style={styles.statsItem}>
            <span style={styles.statsLabel}>任务进度</span>
            <span style={styles.statsValue}>
              {runningTasks ? runningTasks : "--"}
              <span style={styles.statsValueSmall}>
                /{successFailedTasks ? successFailedTasks : "--"}
              </span>
            </span>
          </div>
        </div>
        {/* 控制区域 */}
        {/* <div style={styles.controlSection}>
          <span style={styles.statsLabel}>总任务控制</span>
          <Button
            type="primary"
            style={styles.gradientButton}
            onMouseEnter={handleButtonHover}
            onMouseLeave={handleButtonLeave}
          >
            开始/暂停
          </Button>
        </div> */}
      </div>
    );
  },
  () => {
    // TopUserMessage 没有 props，阻止重新渲染
    return true;
  }
);

export default TopUserMessage;
