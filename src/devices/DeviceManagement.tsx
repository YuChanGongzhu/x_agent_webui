import React, { useState, useEffect } from 'react';

interface Device {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  lastActive: string;
  ip: string;
  model: string;
  osVersion: string;
}

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceModel, setNewDeviceModel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 模拟加载设备数据
  useEffect(() => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      const mockDevices: Device[] = [
        {
          id: 'dev-001',
          name: '设备A',
          status: 'online',
          lastActive: '2023-08-15T08:30:00Z',
          ip: '192.168.1.101',
          model: 'iPhone 12',
          osVersion: 'iOS 16.2'
        },
        {
          id: 'dev-002',
          name: '设备B',
          status: 'busy',
          lastActive: '2023-08-15T09:45:00Z',
          ip: '192.168.1.102',
          model: 'Samsung Galaxy S22',
          osVersion: 'Android 13'
        },
        {
          id: 'dev-003',
          name: '设备C',
          status: 'offline',
          lastActive: '2023-08-14T18:20:00Z',
          ip: '192.168.1.103',
          model: 'Xiaomi 12',
          osVersion: 'Android 12'
        }
      ];
      setDevices(mockDevices);
      setLoading(false);
    }, 1000);
  }, []);

  // 添加新设备
  const handleAddDevice = () => {
    if (!newDeviceName.trim() || !newDeviceModel.trim()) return;
    
    const newDevice: Device = {
      id: `dev-${Date.now()}`,
      name: newDeviceName,
      status: 'offline',
      lastActive: new Date().toISOString(),
      ip: '待分配',
      model: newDeviceModel,
      osVersion: '待配置'
    };
    
    setDevices([...devices, newDevice]);
    setNewDeviceName('');
    setNewDeviceModel('');
  };

  // 移除设备
  const handleRemoveDevice = (deviceId: string) => {
    setDevices(devices.filter(device => device.id !== deviceId));
  };

  // 重启设备
  const handleRestartDevice = (deviceId: string) => {
    // 模拟设备重启操作
    setDevices(devices.map(device => 
      device.id === deviceId 
        ? { ...device, status: 'offline' as const } 
        : device
    ));
    
    // 模拟设备重启后恢复在线
    setTimeout(() => {
      setDevices(devices.map(device => 
        device.id === deviceId 
          ? { ...device, status: 'online' as const, lastActive: new Date().toISOString() } 
          : device
      ));
    }, 3000);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  // 获取状态的中文名称和样式
  const getStatusInfo = (status: Device['status']) => {
    switch (status) {
      case 'online':
        return { text: '在线', color: 'text-green-600 bg-green-100' };
      case 'offline':
        return { text: '离线', color: 'text-gray-600 bg-gray-100' };
      case 'busy':
        return { text: '忙碌中', color: 'text-yellow-600 bg-yellow-100' };
      default:
        return { text: '未知', color: 'text-gray-600 bg-gray-100' };
    }
  };

  // 过滤设备列表
  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.ip.includes(searchTerm)
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">设备管理</h1>
      
      {/* 添加新设备部分 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">添加新设备</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">设备名称</label>
            <input
              type="text"
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="输入设备名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">设备型号</label>
            <input
              type="text"
              value={newDeviceModel}
              onChange={(e) => setNewDeviceModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="输入设备型号"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddDevice}
              disabled={!newDeviceName.trim() || !newDeviceModel.trim()}
              className="w-full px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              添加设备
            </button>
          </div>
        </div>
      </div>
      
      {/* 设备搜索 */}
      <div className="mb-6">
        <div className="max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="搜索设备名称、型号或IP"
            />
          </div>
        </div>
      </div>
      
      {/* 设备列表部分 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">设备列表</h2>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            {searchTerm ? '未找到匹配的设备' : '暂无设备数据，请添加新设备'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    设备名称
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最后活动时间
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP地址
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    设备型号
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    系统版本
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDevices.map((device) => {
                  const statusInfo = getStatusInfo(device.status);
                  return (
                    <tr key={device.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{device.name}</div>
                        <div className="text-xs text-gray-500">{device.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(device.lastActive)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {device.ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {device.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {device.osVersion}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRestartDevice(device.id)}
                            disabled={device.status === 'offline'}
                            className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            重启
                          </button>
                          <button
                            onClick={() => handleRemoveDevice(device.id)}
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

export default DeviceManagement; 