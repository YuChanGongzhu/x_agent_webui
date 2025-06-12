import React, { useState, useEffect } from 'react';

interface Task {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  progress: number;
  device?: string;
  account?: string;
}

const XHSAutomation: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [devices, setDevices] = useState<string[]>(['设备1', '设备2', '设备3']); // 模拟数据
  const [accounts, setAccounts] = useState<string[]>(['账号1', '账号2', '账号3']); // 模拟数据

  // 模拟加载任务数据
  useEffect(() => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      const mockTasks: Task[] = [
        {
          id: '1',
          name: '自动点赞任务',
          status: 'running',
          createdAt: '2023-07-15T08:30:00Z',
          progress: 45,
          device: '设备1',
          account: '账号1'
        },
        {
          id: '2',
          name: '自动关注任务',
          status: 'completed',
          createdAt: '2023-07-10T14:20:00Z',
          completedAt: '2023-07-10T18:45:00Z',
          progress: 100,
          device: '设备2',
          account: '账号2'
        },
        {
          id: '3',
          name: '内容发布任务',
          status: 'failed',
          createdAt: '2023-07-12T09:15:00Z',
          completedAt: '2023-07-12T10:30:00Z',
          progress: 30,
          device: '设备3',
          account: '账号3'
        }
      ];
      setTasks(mockTasks);
      setLoading(false);
    }, 1000);
  }, []);

  // 创建新任务
  const handleCreateTask = () => {
    if (!newTaskName.trim() || !selectedDevice || !selectedAccount) return;
    
    const newTask: Task = {
      id: `task_${Date.now()}`,
      name: newTaskName,
      status: 'running',
      createdAt: new Date().toISOString(),
      progress: 0,
      device: selectedDevice,
      account: selectedAccount
    };
    
    setTasks([newTask, ...tasks]);
    setNewTaskName('');
    setSelectedDevice('');
    setSelectedAccount('');
  };

  // 停止任务
  const handleStopTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: 'stopped' } : task
    ));
  };

  // 继续任务
  const handleResumeTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: 'running' } : task
    ));
  };

  // 删除任务
  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  // 获取状态的中文名称和样式
  const getStatusInfo = (status: Task['status']) => {
    switch (status) {
      case 'running':
        return { text: '运行中', color: 'text-blue-600 bg-blue-100' };
      case 'stopped':
        return { text: '已停止', color: 'text-yellow-600 bg-yellow-100' };
      case 'completed':
        return { text: '已完成', color: 'text-green-600 bg-green-100' };
      case 'failed':
        return { text: '失败', color: 'text-red-600 bg-red-100' };
      default:
        return { text: '未知', color: 'text-gray-600 bg-gray-100' };
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 h-screen">
      <h1 className="text-2xl font-bold mb-6">小红书自动化</h1>
      
      {/* 创建新任务部分 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">创建新任务</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务名称</label>
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="输入任务名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择设备</label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            >
              <option value="">请选择设备</option>
              {devices.map(device => (
                <option key={device} value={device}>{device}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择账号</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            >
              <option value="">请选择账号</option>
              {accounts.map(account => (
                <option key={account} value={account}>{account}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCreateTask}
              disabled={!newTaskName.trim() || !selectedDevice || !selectedAccount}
              className="w-full px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建任务
            </button>
          </div>
        </div>
      </div>
      
      {/* 任务列表部分 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">任务列表</h2>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            暂无任务数据，请创建新任务
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    任务名称
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    进度
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    设备
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    账号
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => {
                  const statusInfo = getStatusInfo(task.status);
                  return (
                    <tr key={task.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{task.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(task.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-primary h-2.5 rounded-full" 
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{task.progress}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.device || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.account || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {task.status === 'running' ? (
                            <button 
                              onClick={() => handleStopTask(task.id)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              停止
                            </button>
                          ) : task.status === 'stopped' ? (
                            <button 
                              onClick={() => handleResumeTask(task.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              继续
                            </button>
                          ) : null}
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default XHSAutomation; 