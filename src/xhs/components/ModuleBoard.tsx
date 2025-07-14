import React, { useState, useEffect } from 'react';
import { message, Spin, Button, Modal } from 'antd';
import { getTaskTemplates, TaskTemplate, updateTaskTemplateAPI, deleteTaskTemplateAPI } from '../../api/mysql';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import CreateTaskModal from './CreateTaskModal';

const ModuleBoard: React.FC = () => {
  const [modules, setModules] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const { email } = useUser();
  const navigate = useNavigate();
  
  // 返回到自动化任务页面
  const handleBack = () => {
    navigate('/xhs/dashboard');
  };
  
  // 打开添加模板对话框
  const handleOpenCreateModal = () => {
    setIsCreateModalVisible(true);
  };

  // 关闭添加模板对话框
  const handleCloseCreateModal = () => {
    setIsCreateModalVisible(false);
  };

  // 完成添加模板
  const handleFinishCreateTask = (values: any) => {
    console.log('Task created:', values);
    fetchTaskTemplates(); // 刷新模板列表
  };
  
  // 处理编辑模板
  const handleEditTemplate = async (template: TaskTemplate) => {
    try {
      // 这里可以打开编辑模态框或直接调用API
      // 目前简单实现，直接调用API更新一个示例字段
      setLoading(true);
      const content = {
        userInfo: template.userInfo,
        keyword: template.keyword,
        max_notes: template.max_notes,
        note_type: template.note_type,
        time_range: template.time_range,
        sort_by: template.sort_by,
        profile_sentence: template.profile_sentence,
        template_ids: template.template_ids,
        intent_type: template.intent_type
      };
      
      await updateTaskTemplateAPI(template.id, content);
      message.success('模板更新成功');
      fetchTaskTemplates(); // 刷新模板列表
    } catch (error) {
      console.error('更新模板失败:', error);
      message.error('更新模板失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理删除模板
  const handleDeleteTemplate = (templateId: number) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除这个模板吗？此操作不可恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          await deleteTaskTemplateAPI(templateId, email!);
          message.success('模板删除成功');
          fetchTaskTemplates(); // 刷新模板列表
        } catch (error) {
          console.error('删除模板失败:', error);
          message.error('删除模板失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // 获取任务模板数据
  const fetchTaskTemplates = async () => {
    try {
      setLoading(true);
      const templates = await getTaskTemplates(email!);
      setModules(templates);
    } catch (error) {
      console.error('获取任务模板失败:', error);
      message.error('获取任务模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取数据
  useEffect(() => {
    if (email) {
      fetchTaskTemplates();
    }
  }, [email]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full">
      {/* 返回按钮 */}
      <div className="mb-4">
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack}
          className="flex items-center hover:bg-gray-100 rounded-md"
        >
          返回自动化任务
        </Button>
      </div>
      
      {/* 标题和添加按钮 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-800">模版库</h2>
          {loading && <Spin className="ml-2" size="small" />}
        </div>
        <button
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md flex items-center"
          onClick={handleOpenCreateModal}
        >
          <span className="mr-1">+</span> 添加模版
        </button>
      </div>

      {/* 模版列表 */}
      <div className="space-y-4">
        {loading && modules.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <Spin size="large" />
          </div>
        ) : modules.length > 0 ? (
          modules.map((module) => (
            <div
              key={module.id}
              className="flex justify-between items-center py-4 px-2 border-b border-gray-200 last:border-0"
            >
              <div className="text-gray-800">{module.keyword || module.desc || `模版${module.id}`}</div>
              <div className="flex space-x-4">
                <button 
                  className="text-blue-500 hover:text-blue-700"
                  onClick={() => handleEditTemplate(module)}
                >
                  编辑
                </button>
                <button 
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDeleteTemplate(module.id)}
                >
                  删除
                </button>
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-md text-sm">
                  使用模版
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            暂无模版数据
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        visible={isCreateModalVisible}
        onClose={handleCloseCreateModal}
        onFinish={handleFinishCreateTask}
        onRefresh={fetchTaskTemplates}
      />
    </div>
  );
};

export default ModuleBoard;