import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircleIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  PauseIcon,
} from "@heroicons/react/24/outline";
import { Button, message, Image, Input } from "antd";
import VirtualList from "rc-virtual-list";
import CreateTaskModal from "./CreateTaskModal";
import { getDagRuns } from "../../api/airflow";
import { useUser } from "../../context/UserContext";
import stopIcon from "../../img/stop.svg";
import refreshIcon from "../../img/refresh.svg";
import { pauseDag, setNote, getDagRunDetail } from "../../api/airflow";
import notifi from "../../utils/notification";
const { Search } = Input;

// Define the status types
type TaskStatus = "running" | "success" | "failed" | "queued";

// Define the task interface
interface Task {
  dag_run_id: string;
  state: TaskStatus;
  start_date: string;
  end_date: string;
  note: string;
  conf: string;
  // Parsed conf fields for display
  email?: string;
  keyword?: string;
  max_notes?: number;
  max_comments?: number;
  note_type?: string;
  time_range?: string;
  search_scope?: string;
  sort_by?: string;
  profile_sentence?: string;
  template_ids?: number[];
  intent_type?: string[];
}

// Props for the TaskBoard component
interface TaskBoardProps {
  tasks: Task[];
  onViewTask?: (task: Task) => void;
  onAddTask?: () => void;
  onRefresh?: (skipStatusRecordUpdate?: boolean) => void;
  loading?: boolean;
  searchTasks: (value: string) => void;
}

// Helper function to get status icon and color
const getStatusInfo = (state: string, note: string) => {
  const status = state.toLowerCase();
  switch (status) {
    case "running":
      return {
        icon: <ArrowPathIcon className="h-4 w-4 text-green-500 animate-spin" />,
        textColor: "text-green-500",
        dotColor: "bg-green-500",
      };
    case "success":
      if (note === "paused") {
        return {
          icon: <PauseIcon className="h-4 w-4 text-yellow-500 " />,
          textColor: "text-yellow-500",
          dotColor: "bg-yellow-500",
        };
      }
      return {
        icon: <CheckCircleIcon className="h-4 w-4 text-green-500" />,
        textColor: "text-green-500",
        dotColor: "bg-green-500",
      };
    case "failed":
      return {
        icon: <ChatBubbleLeftRightIcon className="h-4 w-4 text-red-500" />,
        textColor: "text-red-500",
        dotColor: "bg-red-500",
      };
    case "queued":
      return {
        icon: <ClockIcon className="h-4 w-4 text-blue-400" />,
        textColor: "text-blue-400",
        dotColor: "bg-blue-400",
      };
    default:
      return {
        icon: <ClockIcon className="h-4 w-4 text-gray-400" />,
        textColor: "text-gray-400",
        dotColor: "bg-gray-400",
      };
  }
};

// Format date for display
const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("zh-CN");
};

// TaskRow component for each task item
const TaskRow: React.FC<{
  task: Task;
  isHighlighted?: boolean;
  onViewTask?: (task: Task) => void;
  onRefresh?: (skipStatusRecordUpdate?: boolean) => void;
}> = ({ task, isHighlighted = false, onViewTask, onRefresh }) => {
  const statusInfo = getStatusInfo(task.state, task.note);
  const [isPausing, setIsPausing] = useState(false);

  const stopRunningTask = async (dagRunId: string) => {
    if (isPausing) return; // 防止重复点击
    try {
      setIsPausing(true);
      message.loading({ content: "正在暂停任务...", key: "pauseTask" });
      await Promise.all([
        pauseDag("xhs_auto_progress", dagRunId),
        setNote("xhs_auto_progress", dagRunId, "paused"),
      ]);
      // 获取任务详情确认状态
      await getDagRunDetail("xhs_auto_progress", dagRunId);

      console.log(`手动暂停任务: ${dagRunId}, keyword: ${task.keyword}`);

      // 刷新任务列表但不更新状态记录，让长轮询检测状态变化并发送通知
      onRefresh && (await onRefresh(true)); // 传入true跳过状态记录更新

      // 延迟2秒后再次检查状态，确保API状态已更新
      setTimeout(async () => {
        try {
          console.log(`延迟检查任务状态: ${dagRunId}`);
          onRefresh && (await onRefresh(true));
        } catch (error) {
          console.error("延迟状态检查失败:", error);
        }
      }, 2000);

      message.success({ content: "任务已成功暂停", key: "pauseTask" });
    } catch (err) {
      message.error({ content: "暂停任务失败，请重试", key: "pauseTask" });
    } finally {
      setIsPausing(false);
    }
  };

  return (
    <div
      className={`flex items-center px-4 py-5 border-b border-gray-100 ${
        isHighlighted ? "bg-indigo-50" : "bg-white"
      }`}
    >
      <div style={{ width: "33.3%" }}>
        <span className="text-gray-700">{task.keyword || "未知关键词"}</span>
      </div>
      <div style={{ width: "33.3%" }}>
        <span className="text-gray-700">{task.max_notes ? `${task.max_notes}篇笔记` : "-"}</span>
      </div>
      <div style={{ width: "33.3%" }}>
        <span className="text-gray-700">{task.note_type || "图文"}</span>
      </div>
      <div className=" flex items-center" style={{ width: "33.3%" }}>
        <div className={`h-2 w-2 rounded-full ${statusInfo.dotColor} mr-2`}></div>
        <span className={`${statusInfo.textColor} text-sm flex items-center`}>
          {statusInfo.icon}
          <span className="ml-1">
            {task.state === "success" && task.note === "paused" ? "paused" : task.state}
          </span>
        </span>
      </div>
      <div
        className={`flex items-center justify-center cursor-pointer rounded-full p-1 transition-colors`}
        style={{ width: "10%" }}
        onClick={() => {
          if (!isPausing && task.state === "running") {
            stopRunningTask(task.dag_run_id);
          }
        }}
      >
        {task.state === "running" && (
          <>
            {isPausing ? (
              <div className="flex items-center justify-center">
                <ArrowPathIcon className="h-5 w-5 text-gray-500 animate-spin" />
              </div>
            ) : (
              <Image src={stopIcon} alt="stop" width={20} height={20} preview={false} />
            )}
          </>
        )}
      </div>
      <div className="flex items-center justify-between" style={{ width: "53.3%" }}>
        <span className="text-gray-500 text-sm ml-3">{formatDate(task.start_date)}</span>
        <Button
          onClick={() => onViewTask && onViewTask(task)}
          size="small"
          style={{
            border: "1px solid #8389fc",
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.color = "#8389fc";
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.color = "#000";
          }}
        >
          查看
        </Button>
      </div>
    </div>
  );
};

// Main TaskBoard component
const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  onViewTask,
  onAddTask,
  onRefresh,
  loading = false,
  searchTasks,
}) => {
  const navigate = useNavigate();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const handleOpenCreateModal = () => {
    setIsCreateModalVisible(true);
    onAddTask && onAddTask();
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalVisible(false);
  };

  const handleFinishCreateTask = (values: any) => {
    console.log("Task created with values:", values);
    setIsCreateModalVisible(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <h2 className="text-lg font-medium text-gray-800">任务</h2>
        <div className="flex space-x-2">
          <Search
            placeholder="请输入任务关键字"
            loading={false}
            enterButton={true}
            onSearch={(value) => searchTasks(value)}
          />
          <Button
            onClick={() => navigate("/xhs/dashboard/modules")}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md flex items-center"
          >
            任务模板
          </Button>

          <Button
            type="primary"
            onClick={handleOpenCreateModal}
            icon={<span>+</span>}
            style={{
              border: "1px solid #8389FC",
              background: "linear-gradient(135deg, #8389FC, #D477E1)",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #D477E1, #8389FC)";
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #8389FC, #D477E1)";
            }}
          >
            添加任务
          </Button>
          <Button
            onClick={() => onRefresh && onRefresh()}
            loading={loading}
            style={{
              border: "none",
              backgroundColor: "transparent",
            }}
          >
            {!loading && (
              <Image src={refreshIcon} alt="refresh" width={26} height={26} preview={false} />
            )}
          </Button>
        </div>
      </div>

      {/* Task List */}
      <div>
        {tasks.length > 0 ? (
          <VirtualList
            data={tasks}
            height={840}
            itemHeight={70}
            itemKey={(task: Task) => task.dag_run_id}
            style={{ paddingRight: "12px" }}
          >
            {(task: Task, index: number) => (
              <TaskRow
                key={task.dag_run_id}
                task={task}
                isHighlighted={index === 0}
                onViewTask={onViewTask}
                onRefresh={onRefresh}
              />
            )}
          </VirtualList>
        ) : (
          <div className="p-4 text-center text-gray-500">
            {loading ? "加载中..." : "暂无任务数据"}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        onRefresh={onRefresh}
        visible={isCreateModalVisible}
        onClose={handleCloseCreateModal}
        onFinish={handleFinishCreateTask}
      />
    </div>
  );
};

// Example usage with real data
const ExampleTaskBoard: React.FC = () => {
  const { isAdmin, email } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const originalTasksRef = useRef<Task[]>([]);
  const navigate = useNavigate();
  // Parse conf object from task
  const parseTaskConf = useCallback((tasks: Task[]): Task[] => {
    return tasks.map((task) => {
      try {
        if (task.conf) {
          const conf = JSON.parse(task.conf);
          return {
            ...task,
            email: conf.email,
            keyword: conf.keyword,
            max_notes: parseInt(conf.max_notes || "10"),
            max_comments: parseInt(conf.max_comments || "10"),
            note_type: conf.note_type || "图文",
            time_range: conf.time_range || "",
            search_scope: conf.search_scope || "",
            sort_by: conf.sort_by || "综合",
            profile_sentence: conf.profile_sentence || "",
            template_ids: conf.template_ids || [],
            intent_type: conf.intent_type || [],
          };
        }
        return task;
      } catch (error) {
        console.error("Error parsing task conf:", error);
        return task;
      }
    });
  }, []);

  // 公共的任务获取和处理逻辑
  const processTasksData = useCallback(async (): Promise<Task[]> => {
    const response = await getDagRuns("xhs_auto_progress", 200, "-start_date");

    if (!response || !response.dag_runs) {
      return [];
    }

    let allTasks = response.dag_runs.map((run: any) => ({
      dag_run_id: run.dag_run_id,
      state: run.state as TaskStatus,
      start_date: run.start_date,
      end_date: run.end_date || "",
      note: run.note || "",
      conf: JSON.stringify(run.conf),
    }));

    // Filter tasks by email if not admin
    if (!isAdmin && email) {
      allTasks = allTasks.filter((task: Task) => {
        try {
          const conf = JSON.parse(task.conf);
          return conf.email === email;
        } catch (error) {
          console.error("Error parsing task conf:", error);
          return false;
        }
      });
    }

    // Parse conf for display
    return parseTaskConf(allTasks);
  }, [isAdmin, email, parseTaskConf]);

  // Fetch tasks from Airflow API
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const parsedTasks = await processTasksData();

      console.log("获取任务数据:", parsedTasks.length, parsedTasks);

      originalTasksRef.current = parsedTasks;
      setTasks(parsedTasks);
      setLoading(false);

      return parsedTasks;
    } catch (err) {
      console.error("Error fetching tasks:", err);
      message.error("获取任务列表失败");
      setTasks([]);
      setLoading(false);
      throw err;
    }
  }, [processTasksData]);

  // Fetch tasks on component mount
  useEffect(() => {
    if (email || isAdmin) {
      fetchTasks();
    }
  }, [email, isAdmin, fetchTasks]);

  const handleViewTask = (task: Task) => {
    navigate({
      pathname: "/xhs/dashboard/taskview",
      search: `?keyword=${task.keyword}&state=${task.state}`,
    });
  };

  const handleAddTask = () => {
    console.log("Adding new task");
  };

  const searchTask = useCallback((value: string) => {
    if (value === "" || !value.trim()) {
      setTasks(originalTasksRef.current);
    } else {
      const filteredTasks = originalTasksRef.current.filter((item) =>
        item.keyword?.includes(value)
      );
      setTasks(filteredTasks);
    }
  }, []);

  // 用于存储上一次的任务状态，用于对比
  const previousTasksRef = useRef<Map<string, string>>(new Map());
  // 长轮询定时器
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 恢复轮询定时器
  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 是否正在轮询
  const isPollingRef = useRef<boolean>(false);
  // 轮询失败重试次数
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;

  // 长轮询监控任务状态变化
  const startTaskStatusPolling = useCallback(() => {
    if (isPollingRef.current) return; // 防止重复启动

    const pollTasks = async () => {
      try {
        const parsedTasks = await processTasksData();

        // 检查状态变化并发送通知
        parsedTasks.forEach((task) => {
          const previousState = previousTasksRef.current.get(task.dag_run_id);
          const currentState = task.state;
          const previousNote = previousTasksRef.current.get(`${task.dag_run_id}_note`);
          const currentNote = task.note;

          // 检查从running到其他状态的变化
          if (previousState === "running") {
            const keyword = task.keyword || "未知任务";
            const startTime = task.start_date ? formatDate(task.start_date) : "";

            console.log(
              `检测到任务状态变化: ${
                task.dag_run_id
              } (${keyword}) 从 ${previousState} 变为 ${currentState}${
                currentNote ? ` (${currentNote})` : ""
              }`
            );

            if (currentState === "success" && currentNote === "paused") {
              // running -> success + paused
              console.log(`发送暂停通知: ${keyword}`);
              notifi(`⏸️ 任务 "${keyword}" 已结束`, "warning");
            } else if (currentState === "success") {
              // running -> success
              console.log(`发送完成通知: ${keyword}`);
              notifi(`🎉 任务 "${keyword}" 已完成`, "success");
            } else if (currentState === "failed") {
              // running -> failed
              console.log(`发送失败通知: ${keyword}`);
              notifi(`❌ 任务 "${keyword}" 执行失败`, "error");
            }
          }

          // 更新状态记录（包括note）
          previousTasksRef.current.set(task.dag_run_id, currentState);
          previousTasksRef.current.set(`${task.dag_run_id}_note`, currentNote);
        });

        // 更新任务列表
        originalTasksRef.current = parsedTasks;
        setTasks(parsedTasks);

        // 清理不存在的任务状态记录，防止内存泄漏
        const currentTaskIds = new Set(parsedTasks.map((task) => task.dag_run_id));
        const storedTaskIds = Array.from(previousTasksRef.current.keys()).filter(
          (key) => !key.includes("_note")
        );

        storedTaskIds.forEach((taskId) => {
          if (!currentTaskIds.has(taskId)) {
            previousTasksRef.current.delete(taskId);
            previousTasksRef.current.delete(`${taskId}_note`);
          }
        });

        // 重置重试计数（成功时）
        retryCountRef.current = 0;
      } catch (err) {
        console.error("轮询任务失败:", err);
        retryCountRef.current++;

        // 检查是否是网络错误
        const isNetworkError = err instanceof TypeError && err.message.includes("fetch");
        const errorMessage = isNetworkError ? "网络连接失败" : "服务器错误";

        // 如果重试次数超过最大值，暂时停止轮询
        if (retryCountRef.current >= maxRetries) {
          console.warn(`轮询失败次数过多(${maxRetries}次)，暂停轮询。错误类型: ${errorMessage}`);
          stopTaskStatusPolling();

          // 显示用户友好的错误提示
          message.warning(`任务状态监控暂时停止，将在5分钟后自动重试`);

          // 5分钟后重新尝试
          recoveryTimerRef.current = setTimeout(() => {
            retryCountRef.current = 0;
            if (email || isAdmin) {
              console.log("重新启动任务状态监控");
              startTaskStatusPolling();
            }
          }, 5 * 60 * 1000);
        } else {
          // 还有重试机会，显示重试信息
          console.log(`轮询失败，将重试 (${retryCountRef.current}/${maxRetries})`);
        }
      }
    };

    // 启动轮询
    isPollingRef.current = true;
    retryCountRef.current = 0; // 重置重试计数
    console.log("开始任务状态长轮询监控");
    pollTasks(); // 立即执行一次

    // 设置定时轮询，每30秒检查一次
    pollingTimerRef.current = setInterval(() => {
      // 只在页面可见时轮询
      if (!document.hidden) {
        pollTasks();
      }
    }, 30000);
  }, [isAdmin, email, processTasksData]);

  // 停止长轮询
  const stopTaskStatusPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
      console.log("停止任务状态长轮询监控");
    }

    // 清理恢复定时器
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
      console.log("清理轮询恢复定时器");
    }

    isPollingRef.current = false;
  }, []);

  // 在组件挂载时启动轮询，卸载时停止轮询
  useEffect(() => {
    if (email || isAdmin) {
      fetchTasks();
    }

    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      if (!document.hidden && isPollingRef.current) {
        // 页面重新可见时立即检查一次任务状态
        console.log("页面重新可见，立即检查任务状态");
        // 立即执行一次轮询检查
        processTasksData()
          .then((parsedTasks) => {
            // 检查状态变化并发送通知
            parsedTasks.forEach((task) => {
              const previousState = previousTasksRef.current.get(task.dag_run_id);
              const currentState = task.state;
              const previousNote = previousTasksRef.current.get(`${task.dag_run_id}_note`);
              const currentNote = task.note;

              // 检查从running到其他状态的变化
              if (previousState === "running" && currentState !== "running") {
                const keyword = task.keyword || "未知任务";

                if (currentState === "success" && currentNote === "paused") {
                  notifi(`⏸️ 任务 "${keyword}" 已暂停`, "warning");
                } else if (currentState === "success") {
                  notifi(`🎉 任务 "${keyword}" 已完成`, "success");
                } else if (currentState === "failed") {
                  notifi(`❌ 任务 "${keyword}" 执行失败`, "error");
                }

                console.log(
                  `页面重新可见时发现任务状态变化: ${
                    task.dag_run_id
                  } 从 ${previousState} 变为 ${currentState}${
                    currentNote ? ` (${currentNote})` : ""
                  }`
                );
              }

              // 更新状态记录
              previousTasksRef.current.set(task.dag_run_id, currentState);
              previousTasksRef.current.set(`${task.dag_run_id}_note`, currentNote);
            });

            // 更新任务列表
            originalTasksRef.current = parsedTasks;
            setTasks(parsedTasks);
          })
          .catch((err) => {
            console.error("页面可见性变化时获取任务失败:", err);
          });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 清理函数：组件卸载时停止轮询
    return () => {
      stopTaskStatusPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [email, isAdmin]);

  // 当tasks更新时，初始化状态记录并启动轮询
  useEffect(() => {
    if (tasks.length > 0 && !isPollingRef.current) {
      // 初始化状态记录（包括note）
      tasks.forEach((task) => {
        previousTasksRef.current.set(task.dag_run_id, task.state);
        previousTasksRef.current.set(`${task.dag_run_id}_note`, task.note);
      });
      // 启动长轮询
      startTaskStatusPolling();
    }
  }, [tasks, startTaskStatusPolling]);

  // 手动刷新时也要更新状态记录和重启轮询
  const handleRefresh = useCallback(
    async (skipStatusRecordUpdate = false) => {
      try {
        // 先停止当前轮询
        stopTaskStatusPolling();

        // 重新获取任务数据
        const refreshedTasks = await fetchTasks();

        // 重置重试计数
        retryCountRef.current = 0;

        // 只有在非跳过模式下才更新状态记录
        if (!skipStatusRecordUpdate) {
          // 更新状态记录（使用返回的最新数据）
          refreshedTasks.forEach((task) => {
            previousTasksRef.current.set(task.dag_run_id, task.state);
            previousTasksRef.current.set(`${task.dag_run_id}_note`, task.note);
          });
        }

        // 重新启动轮询
        if (refreshedTasks.length > 0) {
          startTaskStatusPolling();
        }
      } catch (error) {
        console.error("刷新任务失败:", error);
        message.error("刷新任务失败");
      }
    },
    [fetchTasks, stopTaskStatusPolling, startTaskStatusPolling]
  );
  return (
    <TaskBoard
      tasks={tasks}
      onViewTask={handleViewTask}
      onAddTask={handleAddTask}
      onRefresh={handleRefresh}
      loading={loading}
      searchTasks={searchTask}
    />
  );
};

export default TaskBoard;
export { ExampleTaskBoard, TaskRow };
