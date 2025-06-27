import React from 'react';
import { CheckCircleIcon, ClockIcon, ChatBubbleLeftRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from 'antd';

// Define the status types
type TaskStatus = '采集中' | '成功' | '评论中' | '等待中';

// Define the task interface
interface Task {
  id: string;
  keyword: string;
  articleCount: string;
  contentType: string;
  status: TaskStatus;
  timestamp: string;
}

// Props for the TaskBoard component
interface TaskBoardProps {
  tasks: Task[];
  onViewTask?: (taskId: string) => void;
  onAddTask?: () => void;
  onRefresh?: () => void;
}

// Helper function to get status icon and color
const getStatusInfo = (status: TaskStatus) => {
  switch (status) {
    case '采集中':
      return {
        icon: <ArrowPathIcon className="h-4 w-4 text-green-500 animate-spin" />,
        textColor: 'text-green-500',
        dotColor: 'bg-green-500'
      };
    case '成功':
      return {
        icon: <CheckCircleIcon className="h-4 w-4 text-green-500" />,
        textColor: 'text-green-500',
        dotColor: 'bg-green-500'
      };
    case '评论中':
      return {
        icon: <ChatBubbleLeftRightIcon className="h-4 w-4 text-green-500" />,
        textColor: 'text-green-500',
        dotColor: 'bg-green-500'
      };
    case '等待中':
      return {
        icon: <ClockIcon className="h-4 w-4 text-blue-400" />,
        textColor: 'text-blue-400',
        dotColor: 'bg-blue-400'
      };
    default:
      return {
        icon: <ClockIcon className="h-4 w-4 text-gray-400" />,
        textColor: 'text-gray-400',
        dotColor: 'bg-gray-400'
      };
  }
};

// TaskRow component for each task item
const TaskRow: React.FC<{
  task: Task;
  isHighlighted?: boolean;
  onViewTask?: (taskId: string) => void;
}> = ({ task, isHighlighted = false, onViewTask }) => {
  const statusInfo = getStatusInfo(task.status);
  
  return (
    <div 
      className={`flex items-center px-4 py-5 border-b border-gray-100 ${
        isHighlighted ? 'bg-indigo-50' : 'bg-white'
      }`}
    >
      <div className="w-1/5">
        <span className="text-gray-700">{task.keyword}</span>
      </div>
      <div className="w-1/5">
        <span className="text-gray-700">{task.articleCount}</span>
      </div>
      <div className="w-1/5">
        <span className="text-gray-700">{task.contentType}</span>
      </div>
      <div className="w-1/5 flex items-center">
        <div className={`h-2 w-2 rounded-full ${statusInfo.dotColor} mr-2`}></div>
        <span className={`${statusInfo.textColor} text-sm flex items-center`}>
          {statusInfo.icon}
          <span className="ml-1">{task.status}</span>
        </span>
      </div>
      <div className="w-1/5 flex items-center justify-between">
        <span className="text-gray-500 text-sm">{task.timestamp}</span>
        <Button
          onClick={() => onViewTask && onViewTask(task.id)}
          size="small"
          className="text-sm"
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
  onRefresh
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <h2 className="text-lg font-medium text-gray-800">任务</h2>
        <div className="flex space-x-2">
          <Button
            onClick={onRefresh}
          >
            任务模板
          </Button>
          <Button
            type="primary"
            onClick={onAddTask}
            icon={<span>+</span>}
          >
            添加任务
          </Button>
        </div>
      </div>

      {/* Task List */}
      <div>
        {tasks.map((task, index) => (
          <TaskRow
            key={task.id}
            task={task}
            isHighlighted={index === 0}
            onViewTask={onViewTask}
          />
        ))}
      </div>
    </div>
  );
};

// Example usage with sample data
const ExampleTaskBoard: React.FC = () => {
  const sampleTasks: Task[] = [
    {
      id: '1',
      keyword: '关键词1',
      articleCount: '50篇笔记',
      contentType: '图文',
      status: '采集中',
      timestamp: '2025/6/25 10:20:15'
    },
    {
      id: '2',
      keyword: '关键词1',
      articleCount: '50篇笔记',
      contentType: '图文',
      status: '成功',
      timestamp: '2025/6/25 10:20:15'
    },
    {
      id: '3',
      keyword: '关键词1',
      articleCount: '50篇笔记',
      contentType: '图文',
      status: '评论中',
      timestamp: '2025/6/25 10:20:15'
    },
    {
      id: '4',
      keyword: '关键词1',
      articleCount: '50篇笔记',
      contentType: '图文',
      status: '等待中',
      timestamp: '2025/6/25 10:20:15'
    },
    {
      id: '5',
      keyword: '关键词1',
      articleCount: '50篇笔记',
      contentType: '图文',
      status: '等待中',
      timestamp: '2025/6/25 10:20:15'
    }
  ];

  const handleViewTask = (taskId: string) => {
    console.log(`Viewing task ${taskId}`);
  };

  const handleAddTask = () => {
    console.log('Adding new task');
  };

  const handleRefresh = () => {
    console.log('Refreshing tasks');
  };

  return (
    <TaskBoard
      tasks={sampleTasks}
      onViewTask={handleViewTask}
      onAddTask={handleAddTask}
      onRefresh={handleRefresh}
    />
  );
};

export default TaskBoard;
export { ExampleTaskBoard, TaskRow };
