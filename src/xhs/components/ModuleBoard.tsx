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
import { ArrowLeftOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import CreateTaskModal from "./CreateTaskModal";
import UpdateTaskModal from "./UpdateTaskModal";
import { triggerDagRun } from "../../api/airflow";
import dayjs from "dayjs";

// 任务队列管理
let startTaskQueue: Array<{ template: TaskTemplate; onComplete: (success: boolean) => void }> = [];
let isProcessingStartQueue = false;
let startQueueTimer: NodeJS.Timeout | null = null;
let processingTasks = new Set<number>(); // 跟踪正在处理的模板ID
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

  // 批量处理开始任务队列的函数
  const processStartTaskQueue = async () => {
    if (isProcessingStartQueue) return;

    // 清除之前的定时器
    if (startQueueTimer) {
      clearTimeout(startQueueTimer);
      startQueueTimer = null;
    }

    // 等待1000ms收集更多的开始任务请求
    startQueueTimer = setTimeout(async () => {
      if (startTaskQueue.length === 0) return;

      isProcessingStartQueue = true;
      const currentBatch = [...startTaskQueue];
      startTaskQueue = []; // 清空队列

      try {
        console.log(`开始批量处理 ${currentBatch.length} 个开始任务请求`);

        if (currentBatch.length > 1) {
          message.loading({
            content: `正在批量创建 ${currentBatch.length} 个任务...`,
            key: "batchStartTask",
            duration: 0,
          });
        }

        const results = [];
        const batchSize = 3; // 每批最多处理3个任务

        // 分批处理
        for (let i = 0; i < currentBatch.length; i += batchSize) {
          const batch = currentBatch.slice(i, i + batchSize);

          // 并行处理当前批次
          const batchPromises = batch.map(async ({ template, onComplete }) => {
            try {
              const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
              const dag_run_id = `xhs_auto_progress_${timestamp}_${template.id}`;

              const conf = {
                email: template.userInfo,
                keyword: template.keyword,
                max_notes: template.max_notes || 10,
                note_type: template.note_type || "图文",
                time_range: template.time_range || "",
                search_scope: template.search_scope || "",
                sort_by: template.sort_by || "综合",
                profile_sentence: template.profile_sentence || "",
                intent_type: template.intent_type || [],
                template_ids: template.template_ids,
                task_date:
                  (template.updated_at && dayjs(template.updated_at).format("YYYY-MM-DD")) || "",
                task_time:
                  (template.updated_at && dayjs(template.updated_at).format("HH:mm")) || "",
              };

              if (currentBatch.length === 1) {
                message.loading({
                  content: `正在创建任务 "${template.keyword}"...`,
                  key: `startTask_${template.id}`,
                  duration: 0,
                });
              }

              console.log(`创建任务: ${dag_run_id}`, conf);
              const response = await triggerDagRun("xhs_auto_progress", dag_run_id, conf);

              if (response && response.dag_run_id) {
                console.log(`成功创建任务: ${dag_run_id}, keyword: ${template.keyword}`);

                if (currentBatch.length === 1) {
                  message.success({
                    content: `任务 "${template.keyword}" 创建成功`,
                    key: `startTask_${template.id}`,
                  });
                }

                onComplete(true);
                return { success: true, templateId: template.id, keyword: template.keyword };
              } else {
                throw new Error("创建任务失败，响应无效");
              }
            } catch (error) {
              console.error(`创建任务失败: ${template.id}`, error);

              if (currentBatch.length === 1) {
                message.error({
                  content: `创建任务 "${template.keyword}" 失败，请重试`,
                  key: `startTask_${template.id}`,
                });
              }

              onComplete(false);
              return { success: false, templateId: template.id, keyword: template.keyword, error };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);

          // 批次间稍作延迟
          if (i + batchSize < currentBatch.length) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        // 显示批量操作结果
        if (currentBatch.length > 1) {
          const successCount = results.filter((r) => r.success).length;
          const failCount = results.length - successCount;

          if (failCount === 0) {
            message.success({
              content: `批量创建完成，成功创建 ${successCount} 个任务`,
              key: "batchStartTask",
            });
          } else {
            message.warning({
              content: `批量创建完成，成功 ${successCount} 个，失败 ${failCount} 个`,
              key: "batchStartTask",
            });
          }
        }

        // 如果有成功的任务且没有待处理的队列，准备导航
        if (results.some((r) => r.success) && startTaskQueue.length === 0) {
          console.log("批量任务创建完成，准备导航");
          pendingNavigationRef.current = true;
          setTimeout(() => {
            if (pendingNavigationRef.current) {
              navigate(-1);
            }
          }, 2000);
        }
      } finally {
        isProcessingStartQueue = false;
        startQueueTimer = null;

        // 如果在处理过程中又有新的任务加入队列，继续处理
        if (startTaskQueue.length > 0) {
          setTimeout(() => processStartTaskQueue(), 100);
        }
      }
    }, 1000); // 等待1000ms收集更多请求
  };

  // 返回到自动化任务页面
  const handleBack = () => {
    // 如果有正在处理的任务，取消导航
    if (startTaskQueue.length > 0 || isProcessingStartQueue) {
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
    console.log("Task updated:", values);
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
          console.error("删除模板失败:", error);
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
      console.error("获取任务模板失败:", error);
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
      // 清理定时器
      if (startQueueTimer) {
        clearTimeout(startQueueTimer);
        startQueueTimer = null;
      }

      // 清理全局状态
      startTaskQueue = [];
      processingTasks.clear();
      isProcessingStartQueue = false;

      console.log("ModuleBoard组件卸载，清理队列状态");
    };
  }, []);

  const startTask = async (template: TaskTemplate) => {
    // 防止同一个模板重复点击
    if (processingTemplateIds.has(template.id) || processingTasks.has(template.id)) {
      console.log(`模板 ${template.id} (${template.keyword}) 已在处理队列中，忽略重复点击`);
      return;
    }

    console.log(`添加开始任务到队列: ${template.id} (${template.keyword})`);

    // 立即更新UI状态
    processingTasks.add(template.id);
    setProcessingTemplateIds((prev) => new Set([...prev, template.id]));

    // 取消待定的导航
    pendingNavigationRef.current = false;

    // 添加到处理队列
    startTaskQueue.push({
      template,
      onComplete: (success: boolean) => {
        // 任务完成后的回调
        processingTasks.delete(template.id);
        setProcessingTemplateIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(template.id);
          return newSet;
        });

        console.log(`任务 ${template.id} (${template.keyword}) 处理完成，成功: ${success}`);
      },
    });

    console.log(`当前开始任务队列长度: ${startTaskQueue.length}`);

    // 启动队列处理（会等待1000ms收集更多请求）
    processStartTaskQueue();
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
          {(processingTemplateIds.size > 0 || isProcessingStartQueue) && (
            <div className="ml-3 px-2 py-1 bg-blue-100 text-blue-600 rounded-md text-sm">
              {isProcessingStartQueue ? (
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
