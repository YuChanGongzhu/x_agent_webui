import React, { useState, useEffect, useRef } from "react";
import { message, Spin, Button, Modal } from "antd";
import {
  getTaskTemplates,
  TaskTemplate,
  updateTaskTemplateAPI,
  deleteTaskTemplateAPI,
} from "../../api/mysql";
import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import CreateTaskModal from "./CreateTaskModal";
import UpdateTaskModal from "./UpdateTaskModal";
import { createStartTaskQueue } from "../../utils/taskQueue";
const ModuleBoard: React.FC = () => {
  const [modules, setModules] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<TaskTemplate | undefined>();
  const [processingTemplateIds, setProcessingTemplateIds] = useState<Set<number>>(new Set());
  const { email } = useUser();
  const navigate = useNavigate();
  const pendingNavigationRef = useRef<boolean>(false);

  // 创建任务队列实例
  const startTaskQueueRef = useRef(createStartTaskQueue());
  const startTaskQueue = startTaskQueueRef.current;

  // 成功任务计数
  const successfulTasksRef = useRef(0);

  // 返回到自动化任务页面
  const handleBack = () => {
    // 如果有正在处理的任务，取消导航
    const queueStatus = startTaskQueue.getQueueStatus();
    if (queueStatus.queueLength > 0 || queueStatus.isProcessing) {
      message.warning("有任务正在创建中，请等待完成后再返回");
      return;
    }
    navigate("/xhs/dashboard");
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
    console.log("Task created:", values);
    fetchTaskTemplates(); // 刷新模板列表
  };

  // 处理编辑模板
  const handleEditTemplate = (template: TaskTemplate) => {
    setCurrentTemplate(template);
    setIsUpdateModalVisible(true);
  };

  // 关闭编辑模板对话框
  const handleCloseUpdateModal = () => {
    setIsUpdateModalVisible(false);
    setCurrentTemplate(undefined);
  };

  // 完成编辑模板
  const handleFinishUpdateTask = (values: any) => {
    // console.log("Task updated:", values);
    fetchTaskTemplates(); // 刷新模板列表
  };

  // 处理删除模板
  const handleDeleteTemplate = (templateId: number) => {
    Modal.confirm({
      title: "确认删除",
      icon: <ExclamationCircleOutlined />,
      content: "确定要删除这个模板吗？此操作不可恢复。",
      okText: "确认",
      cancelText: "取消",
      onOk: async () => {
        try {
          setLoading(true);
          await deleteTaskTemplateAPI(templateId, email!);
          message.success("模板删除成功");
          fetchTaskTemplates(); // 刷新模板列表
        } catch (error) {
          // console.error("删除模板失败:", error);
          message.error("删除模板失败");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 获取任务模板数据
  const fetchTaskTemplates = async () => {
    try {
      setLoading(true);
      const templates = await getTaskTemplates(email!);
      setModules(templates);
    } catch (error) {
      // console.error("获取任务模板失败:", error);
      message.error("获取任务模板失败");
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

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 清理队列
      startTaskQueue.cleanup();
      // console.log("ModuleBoard组件卸载，清理队列状态");
    };
  }, [startTaskQueue]);

  const startTask = async (template: TaskTemplate) => {
    // 防止同一个模板重复点击
    if (
      processingTemplateIds.has(template.id) ||
      startTaskQueue.isProcessingTask(template.id.toString())
    ) {
      // console.log(`模板 ${template.id} (${template.keyword}) 已在处理队列中，忽略重复点击`);
      return;
    }

    // console.log(`添加开始任务到队列: ${template.id} (${template.keyword})`);

    // 立即更新UI状态
    setProcessingTemplateIds((prev) => new Set([...prev, template.id]));

    // 取消待定的导航，重置成功计数
    pendingNavigationRef.current = false;

    // 如果这是第一个任务，重置成功计数
    if (processingTemplateIds.size === 0) {
      successfulTasksRef.current = 0;
      // console.log("开始新的任务批次，重置成功计数");
    }

    // 添加到处理队列
    const success = startTaskQueue.addTask(template.id.toString(), template, (success: boolean) => {
      // 任务完成后的回调
      setProcessingTemplateIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(template.id);
        return newSet;
      });

      // console.log(`任务 ${template.id} (${template.keyword}) 处理完成，成功: ${success}`);

      // 如果有成功的任务，记录成功数量
      if (success) {
        successfulTasksRef.current += 1;
        // console.log(`成功任务数: ${successfulTasksRef.current}`);
      }

      // 检查是否所有任务都完成了
      setTimeout(() => {
        const queueStatus = startTaskQueue.getQueueStatus();
        // console.log("检查队列状态:", queueStatus);

        if (
          queueStatus.queueLength === 0 &&
          !queueStatus.isProcessing &&
          queueStatus.processingCount === 0
        ) {
          if (successfulTasksRef.current > 0) {
            // console.log(`所有任务完成，成功 ${successfulTasksRef.current} 个，准备导航`);
            pendingNavigationRef.current = true;
            setTimeout(() => {
              if (pendingNavigationRef.current) {
                console.log("执行导航返回");
                navigate(-1);
              }
            }, 2000);
          }
        } else {
          // console.log(
          //   `还有任务在处理中，等待完成。队列长度: ${queueStatus.queueLength}, 正在处理: ${queueStatus.isProcessing}, 处理中数量: ${queueStatus.processingCount}`
          // );
        }
      }, 200); // 给队列状态更新足够的时间
    });

    if (!success) {
      // 如果添加失败，清理UI状态
      setProcessingTemplateIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(template.id);
        return newSet;
      });
    }
  };

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
          {processingTemplateIds.size > 0 && (
            <div className="ml-3 px-2 py-1 bg-blue-100 text-blue-600 rounded-md text-sm">
              {startTaskQueue.getQueueStatus().isProcessing ? (
                <div className="flex items-center">
                  <Spin size="small" className="mr-1" />
                  正在处理 {processingTemplateIds.size} 个任务
                </div>
              ) : (
                `等待处理 ${processingTemplateIds.size} 个任务`
              )}
            </div>
          )}
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
              <div className="text-gray-800">
                {module.keyword || module.desc || `模版${module.id}`}
              </div>
              <div className="flex space-x-4">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  style={{
                    color: "#8389fc",
                    padding: "4px",
                    minWidth: "28px",
                    height: "28px",
                  }}
                  onClick={() => handleEditTemplate(module)}
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  style={{
                    color: "#ff4d4f",
                    padding: "4px",
                    minWidth: "28px",
                    height: "28px",
                  }}
                  onClick={() => handleDeleteTemplate(module.id)}
                />
                {/* <button className="text-red-500 hover:text-red-700">删除</button> */}
                <button
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    processingTemplateIds.has(module.id)
                      ? "bg-orange-100 text-orange-600 cursor-not-allowed"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                  }`}
                  onClick={() => {
                    if (!processingTemplateIds.has(module.id)) {
                      startTask(module);
                    }
                  }}
                  disabled={processingTemplateIds.has(module.id)}
                >
                  {processingTemplateIds.has(module.id) ? (
                    <div className="flex items-center">
                      <Spin size="small" className="mr-1" />
                      处理中...
                    </div>
                  ) : (
                    "开始任务"
                  )}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">暂无模版数据</div>
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        visible={isCreateModalVisible}
        onClose={handleCloseCreateModal}
        onFinish={handleFinishCreateTask}
        onRefresh={fetchTaskTemplates}
      />

      {/* Update Task Modal */}
      <UpdateTaskModal
        visible={isUpdateModalVisible}
        onClose={handleCloseUpdateModal}
        onFinish={handleFinishUpdateTask}
        onRefresh={fetchTaskTemplates}
        initialTemplate={currentTemplate}
      />
    </div>
  );
};

export default ModuleBoard;
