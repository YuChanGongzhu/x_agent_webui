import React, { useState, useEffect } from 'react';
import { getVariable, setVariable, triggerDagRun, getDagRunDetail } from '../api/airflow';
import { message, Spin, Button, Modal, Form, Input, InputNumber, Space, Table, Tag, Card, Popconfirm, Tooltip, Typography, Badge } from 'antd';
import { useIsAdmin } from '../context/userHooks';
import { useUserEmail } from '../context/userHooks';
import { ReloadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface Device {
  email: string;
  device_ip: string;
  username: string;
  password: string;
  port: number;
  phone_device_list: string[];
  available_appium_ports: number[];
  appium_port_num: number;
  phone_device_num: number;
  update_time: string;
}

// 定义新设备表单接口
interface DeviceFormData {
  email: string;
  device_ip: string;
  username: string;
  password: string;
  port: number;
}

const VARIABLE_NAME = 'XHS_DEVICE_INFO_LIST';

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [deviceForm] = Form.useForm();
  const { isAdmin, isLoading: isLoadingAdmin } = useIsAdmin();
  const { email: userEmail, isLoading: isLoadingEmail } = useUserEmail();

  // 获取设备列表数据
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await getVariable(VARIABLE_NAME);
      const deviceList = JSON.parse(response.value) as Device[];
      setDevices(deviceList);
    } catch (error) {
      console.error('获取设备列表失败:', error);
      message.error('获取设备列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 过滤设备列表，根据用户权限显示
  useEffect(() => {
    if (isLoadingAdmin || isLoadingEmail) return;
    
    if (isAdmin) {
      // 管理员可以查看所有设备
      setFilteredDevices(devices);
    } else if (userEmail) {
      // 普通用户只能查看自己的设备
      setFilteredDevices(devices.filter(device => device.email === userEmail));
    } else {
      // 未登录或无邮箱的用户不能查看任何设备
      setFilteredDevices([]);
    }
  }, [devices, isAdmin, userEmail, isLoadingAdmin, isLoadingEmail]);

  // 初始化加载数据
  useEffect(() => {
    fetchDevices();
  }, []);

  // 存储当前运行的DAG ID
  const [currentDagRunId, setCurrentDagRunId] = useState<string | null>(null);
  
  // 检查DAG运行状态的函数
  const checkDagRunStatus = async (dagRunId: string) => {
    try {
      const response = await getDagRunDetail('update_device_list', dagRunId);
      console.log('DAG运行状态:', response);
      
      // 根据DAG状态更新refreshing
      if (response && response.state) {
        // 如果DAG状态为'running'或'queued'，则继续刷新状态
        if (['running', 'queued'].includes(response.state)) {
          setRefreshing(true);
          
          // 继续轮询检查状态
          setTimeout(() => {
            checkDagRunStatus(dagRunId);
          }, 2000);
        } else {
          // DAG已完成或失败
          setRefreshing(false);
          fetchDevices(); // 获取最新设备列表
          setCurrentDagRunId(null);
          
          // 根据状态显示相应消息
          if (response.state === 'success') {
            message.success('设备列表已成功刷新');
          } else if (response.state === 'failed') {
            message.error('设备列表刷新失败');
          }
        }
      }
    } catch (error) {
      console.error('检查DAG状态失败:', error);
      setRefreshing(false);
      setCurrentDagRunId(null);
    }
  };

  // 刷新设备列表（触发DAG）
  const handleRefreshDevices = async () => {
    try {
      setRefreshing(true);
      const response = await triggerDagRun('update_device_list');
      
      if (response && response.dag_run_id) {
        message.success('设备刷新任务已触发，请稍后查看更新结果');
        setCurrentDagRunId(response.dag_run_id);
        
        // 开始轮询检查DAG状态
        checkDagRunStatus(response.dag_run_id);
      } else {
        message.warning('设备刷新任务触发成功，但未返回DAG运行ID');
        // 退回到原有逻辑
        setTimeout(() => {
          fetchDevices();
          setRefreshing(false);
        }, 5000);
      }
    } catch (error) {
      console.error('刷新设备列表失败:', error);
      message.error('刷新设备列表失败');
      setRefreshing(false);
    }
  };

  // 添加新设备
  const handleAddDevice = async (formData: DeviceFormData) => {
    try {
      // 如果不是管理员，只能添加自己的设备
      if (!isAdmin && formData.email !== userEmail) {
        message.error('您只能添加使用自己邮箱的设备');
        return;
      }

      // 获取当前的设备列表
      const response = await getVariable(VARIABLE_NAME);
      const currentDevices = JSON.parse(response.value) as Device[];
      
      // 检查是否已存在相同IP和端口的设备
      if (currentDevices.some(device => 
        device.device_ip === formData.device_ip && device.port === formData.port
      )) {
        message.error('该IP地址和端口的设备已存在，请检查后重试');
        return;
      }
      
      // 创建新设备对象
      const newDevice: Device = {
        ...formData,
        phone_device_list: [],
        available_appium_ports: [],
        appium_port_num: 0,
        phone_device_num: 0,
        update_time: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      
      // 更新设备列表
      const updatedDevices = [...currentDevices, newDevice];
      await setVariable(VARIABLE_NAME, JSON.stringify(updatedDevices));
      
      // 刷新设备列表并关闭模态框
      message.success('设备添加成功');
      fetchDevices();
      setIsAddModalVisible(false);
      deviceForm.resetFields();
      
    } catch (error) {
      console.error('添加设备失败:', error);
      message.error('添加设备失败，请稍后重试');
    }
  };

  // 删除设备
  const handleDeleteDevice = async (deviceIp: string, deviceEmail: string) => {
    try {
      // 如果不是管理员，只能删除自己的设备
      if (!isAdmin && deviceEmail !== userEmail) {
        message.error('您只能删除自己的设备');
        return;
      }

      // 获取当前的设备列表
      const response = await getVariable(VARIABLE_NAME);
      const currentDevices = JSON.parse(response.value) as Device[];
      
      // 需要获取要删除的设备的完整信息（包括IP和端口）
      // 在表格中我们只有IP和邮箱，需要找到完全匹配的记录
      const deviceToDelete = currentDevices.find(device => 
        device.device_ip === deviceIp && device.email === deviceEmail
      );
      
      if (!deviceToDelete) {
        message.error('未找到要删除的设备');
        return;
      }
      
      // 过滤掉要删除的特定设备（匹配IP和端口）
      const updatedDevices = currentDevices.filter(device => 
        !(device.device_ip === deviceIp && 
          device.port === deviceToDelete.port && 
          device.email === deviceEmail)
      );
      
      // 更新Airflow变量
      await setVariable(VARIABLE_NAME, JSON.stringify(updatedDevices));
      
      // 刷新设备列表
      message.success('设备删除成功');
      fetchDevices();
      
    } catch (error) {
      console.error('删除设备失败:', error);
      message.error('删除设备失败，请稍后重试');
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  // 获取设备状态
  const getDeviceStatus = (device: Device) => {
    if (device.available_appium_ports && device.available_appium_ports.length > 0) {
      return {
        status: 'online',
        text: '在线',
        color: 'success'
      };
    } else {
      return {
        status: 'offline',
        text: '离线',
        color: 'default'
      };
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '状态',
      key: 'status',
      width: 80,
      align: 'center' as const,
      render: (text: string, record: Device) => {
        const status = getDeviceStatus(record);
        return <Badge status={status.color as any} text={status.text} />;
      },
    },
    {
      title: 'IP地址',
      dataIndex: 'device_ip',
      key: 'device_ip',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '登录信息',
      key: 'login',
      render: (text: string, record: Device) => (
        <Space direction="vertical" size="small">
          <Text>用户名: {record.username}</Text>
          <Text>密码: {record.password}</Text>
          <Text>端口: {record.port}</Text>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
    {
      title: '手机设备',
      key: 'phoneDevices',
      render: (text: string, record: Device) => (
        <Space direction="vertical" size="small">
          <div>设备数: <Text strong>{record.phone_device_num}</Text></div>
          <div>
            {record.phone_device_list.length > 0 ? (
              <Space size={[0, 4]} wrap>
                {record.phone_device_list.map(device => (
                  <Tag color="blue" key={device}>
                    {device}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">无设备</Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Appium端口',
      key: 'appiumPorts',
      render: (text: string, record: Device) => (
        <Space direction="vertical" size="small">
          <div>端口数: <Text strong>{record.appium_port_num}</Text></div>
          <div>
            {record.available_appium_ports.length > 0 ? (
              <Space size={[0, 4]} wrap>
                {record.available_appium_ports.map(port => (
                  <Tag color="green" key={port}>
                    {port}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">无可用端口</Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '更新时间',
      key: 'update_time',
      render: (text: string, record: Device) => (
        <Text type="secondary">{formatDate(record.update_time)}</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'center' as const,
      render: (text: string, record: Device) => (
        <Popconfirm
          title="确定要删除此设备吗？"
          onConfirm={() => handleDeleteDevice(record.device_ip, record.email)}
          okText="确定"
          cancelText="取消"
        >
          <Button 
            danger 
            type="text" 
            icon={<DeleteOutlined />}
            title="删除设备"
          />
        </Popconfirm>
      ),
    },
  ];

  // 设置表单初始值，非管理员用户自动填充邮箱且不可编辑
  const setInitialFormValues = () => {
    // 如果已经登录并且有邮箱
    if (userEmail) {
      deviceForm.setFieldsValue({
        email: userEmail
      });
    }
  };

  // 显示添加设备模态框
  const showAddModal = () => {
    setInitialFormValues();
    setIsAddModalVisible(true);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Card 
        title={<Title level={4}>设备管理</Title>} 
        extra={
          <Space>
            <Button 
              type="primary" 
              onClick={showAddModal}
              icon={<PlusOutlined />}
            >
              添加设备
            </Button>
            <Tooltip title="刷新将触发Airflow DAG，更新设备状态信息">
              <Button 
                onClick={handleRefreshDevices} 
                loading={refreshing}
                icon={<ReloadOutlined spin={refreshing} />}
              >
                刷新设备状态
              </Button>
            </Tooltip>
          </Space>
        }
        className="shadow-md"
      >
        <Spin spinning={loading || isLoadingAdmin || isLoadingEmail}>
          {filteredDevices.length === 0 ? (
            <div className="text-center py-10">
              <p>暂无设备数据，请添加新设备</p>
            </div>
          ) : (
            <Table 
              columns={columns} 
              dataSource={filteredDevices.map(device => ({ ...device, key: `${device.device_ip}:${device.port}` }))} 
              pagination={false}
              bordered
              size="middle"
              rowClassName={(record, index) => index % 2 === 0 ? '' : 'bg-gray-50'}
              className="mt-2"
            />
          )}
        </Spin>
      </Card>

      {/* 添加设备表单 */}
      <Modal
        title="添加新设备"
        open={isAddModalVisible}
        onCancel={() => {
          setIsAddModalVisible(false);
          deviceForm.resetFields();
        }}
        footer={null}
        maskClosable={false}
        destroyOnClose={true}
      >
        <Form
          form={deviceForm}
          layout="vertical"
          onFinish={handleAddDevice}
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ required: true, message: '请输入邮箱' }]}
          >
            <Input 
              placeholder="请输入邮箱" 
              disabled={!isAdmin && userEmail !== null} 
            />
          </Form.Item>
          
          <Form.Item
            name="device_ip"
            label="设备IP"
            rules={[{ required: true, message: '请输入设备IP' }]}
          >
            <Input placeholder="请输入设备IP" />
          </Form.Item>
          
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          
          <Form.Item
            name="port"
            label="端口"
            rules={[{ required: true, message: '请输入端口号' }]}
          >
            <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="请输入端口号" />
          </Form.Item>
          
          <Form.Item>
            <div className="flex justify-end">
              <Space>
                <Button onClick={() => {
                  setIsAddModalVisible(false);
                  deviceForm.resetFields();
                }}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  添加
                </Button>
              </Space>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceManagement; 