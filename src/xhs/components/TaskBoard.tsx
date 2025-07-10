import React, { useState, useEffect } from "react";
import {
  CheckCircleIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Button, message, Image } from "antd";
import CreateTaskModal from "./CreateTaskModal";
import { getDagRuns } from "../../api/airflow";
import { useUser } from "../../context/UserContext";
import stopIcon from "../../img/stop.svg";
import refreshIcon from "../../img/refresh.svg";
// Define the status types
type TaskStatus = "running" | "success" | "failed" | "queued";

// Define the task interface
interface Task {
  dag_run_id: string;
  state: string;
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
  onViewTask?: (taskId: string) => void;
  onAddTask?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

// Helper function to get status icon and color
const getStatusInfo = (state: string) => {
  const status = state.toLowerCase();
  switch (status) {
    case "running":
      return {
        icon: <ArrowPathIcon className="h-4 w-4 text-green-500 animate-spin" />,
        textColor: "text-green-500",
        dotColor: "bg-green-500",
      };
    case "success":
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
  onViewTask?: (taskId: string) => void;
}> = ({ task, isHighlighted = false, onViewTask }) => {
  const statusInfo = getStatusInfo(task.state);

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
          <span className="ml-1">{task.state}</span>
        </span>
      </div>
      <div
        className="flex items-center justify-center"
        style={{ width: "10%" }}
        onClick={() => {
          console.log("暂停方法位置");
        }}
      >
        <Image src={stopIcon} alt="stop" width={20} height={20} preview={false} />
      </div>
      <div className="flex items-center justify-between" style={{ width: "53.3%" }}>
        <span className="text-gray-500 text-sm ml-3">{formatDate(task.start_date)}</span>
        <Button
          onClick={() => onViewTask && onViewTask(task.dag_run_id)}
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
}) => {
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
          <Button
            style={{
              border: "1px solid #999999",
              color: "#333333",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.color = "#8389fc";
              e.currentTarget.style.borderColor = "#8389fc";
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.color = "#333333";
              e.currentTarget.style.borderColor = "#999999";
            }}
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
            onClick={onRefresh}
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
          tasks.map((task, index) => (
            <TaskRow
              key={task.dag_run_id}
              task={task}
              isHighlighted={index === 0}
              onViewTask={onViewTask}
            />
          ))
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

  // Parse conf object from task
  const parseTaskConf = (tasks: Task[]): Task[] => {
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
  };

  // Fetch tasks from Airflow API
  const fetchTasks = async () => {
    try {
      setLoading(true);

      const response = await getDagRuns("xhs_auto_progress", 200, "-start_date");

      console.log("前200条airflow自动化任务", response);

      if (response && response.dag_runs) {
        let allTasks = response.dag_runs.map((run: any) => ({
          dag_run_id: run.dag_run_id,
          state: run.state,
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
          console.log(`隔离任务邮箱 ${email}:`, allTasks.length, allTasks);
        }

        // Parse conf for display
        const parsedTasks = parseTaskConf(allTasks);
        setTasks(parsedTasks);
      } else {
        setTasks([]);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      message.error("获取任务列表失败");
      setTasks([]);
      setLoading(false);
    }
  };

  // Fetch tasks on component mount
  useEffect(() => {
    if (email || isAdmin) {
      fetchTasks();
    }
  }, [email, isAdmin]);

  const handleViewTask = (taskId: string) => {
    console.log(`Viewing task ${taskId}`);
  };

  const handleAddTask = () => {
    console.log("Adding new task");
  };

  const handleRefresh = () => {
    console.log("Refreshing tasks");
    fetchTasks();
  };

  return (
    <TaskBoard
      tasks={tasks}
      onViewTask={handleViewTask}
      onAddTask={handleAddTask}
      onRefresh={handleRefresh}
      loading={loading}
    />
  );
};

export default TaskBoard;
export { ExampleTaskBoard, TaskRow };
