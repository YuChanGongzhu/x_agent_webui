import { message } from "antd";

// 通用任务队列项接口
interface QueueItem<T = any> {
  id: string;
  data: T;
  onComplete: (success: boolean, result?: any) => void;
}

// 队列配置接口
interface QueueConfig {
  batchSize: number; // 每批处理的任务数量
  delay: number; // 收集任务的延迟时间（毫秒）
  processingDelay: number; // 批次间的延迟时间（毫秒）
}

// 默认配置
const DEFAULT_CONFIG: QueueConfig = {
  batchSize: 3,
  delay: 1000,
  processingDelay: 500,
};

// 通用任务队列管理器
export class TaskQueue<T = any> {
  private queue: QueueItem<T>[] = [];
  private isProcessing = false;
  private timer: NodeJS.Timeout | null = null;
  private processingItems = new Set<string>();
  private config: QueueConfig;
  private onAllTasksComplete?: () => void;

  constructor(
    private processor: (
      items: QueueItem<T>[]
    ) => Promise<{ success: boolean; id: string; error?: any }[]>,
    private options: {
      singleTaskMessage?: (item: QueueItem<T>) => {
        loading: string;
        success: string;
        error: string;
      };
      batchTaskMessage?: (count: number) => { loading: string; success: string; error: string };
      getItemName?: (item: QueueItem<T>) => string;
      onAllTasksComplete?: () => void;
    } = {},
    config: Partial<QueueConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onAllTasksComplete = options.onAllTasksComplete;
  }

  // 添加任务到队列
  addTask(id: string, data: T, onComplete: (success: boolean, result?: any) => void): boolean {
    // 防止重复添加
    if (this.processingItems.has(id)) {
      console.log(`任务 ${id} 已在处理队列中，忽略重复添加`);
      return false;
    }

    console.log(`添加任务到队列: ${id}`);

    // 立即标记为处理中
    this.processingItems.add(id);

    // 添加到队列
    this.queue.push({
      id,
      data,
      onComplete: (success: boolean, result?: any) => {
        // 清理处理状态
        this.processingItems.delete(id);
        onComplete(success, result);
      },
    });

    console.log(`当前队列长度: ${this.queue.length}`);

    // 启动队列处理
    this.processQueue();
    return true;
  }

  // 检查任务是否正在处理
  isProcessingTask(id: string): boolean {
    return this.processingItems.has(id);
  }

  // 获取队列状态
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processingCount: this.processingItems.size,
      isProcessing: this.isProcessing,
    };
  }

  // 处理队列
  private processQueue() {
    if (this.isProcessing) return;

    // 清除之前的定时器
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // 延迟处理，收集更多任务
    this.timer = setTimeout(async () => {
      if (this.queue.length === 0) return;

      this.isProcessing = true;
      const currentBatch = [...this.queue];
      this.queue = []; // 清空队列

      try {
        console.log(`开始批量处理 ${currentBatch.length} 个任务`);

        // 显示批量处理消息
        if (currentBatch.length > 1 && this.options.batchTaskMessage) {
          const batchMsg = this.options.batchTaskMessage(currentBatch.length);
          message.loading({
            content: batchMsg.loading,
            key: "batchTask",
            duration: 0,
          });
        }

        const results = [];
        const { batchSize, processingDelay } = this.config;

        // 分批处理
        for (let i = 0; i < currentBatch.length; i += batchSize) {
          const batch = currentBatch.slice(i, i + batchSize);

          // 显示单个任务消息
          if (currentBatch.length === 1 && this.options.singleTaskMessage) {
            const singleMsg = this.options.singleTaskMessage(batch[0]);
            message.loading({
              content: singleMsg.loading,
              key: `task_${batch[0].id}`,
              duration: 0,
            });
          }

          // 处理当前批次
          const batchResults = await this.processor(batch);
          results.push(...batchResults);

          // 处理单个任务的消息反馈
          if (currentBatch.length === 1 && this.options.singleTaskMessage) {
            const item = batch[0];
            const result = batchResults.find((r) => r.id === item.id);
            const singleMsg = this.options.singleTaskMessage(item);

            if (result?.success) {
              message.success({
                content: singleMsg.success,
                key: `task_${item.id}`,
              });
            } else {
              message.error({
                content: singleMsg.error,
                key: `task_${item.id}`,
              });
            }
          }

          // 调用完成回调
          batch.forEach((item) => {
            const result = batchResults.find((r) => r.id === item.id);
            item.onComplete(result?.success || false, result);
          });

          // 批次间延迟
          if (i + batchSize < currentBatch.length) {
            await new Promise((resolve) => setTimeout(resolve, processingDelay));
          }
        }

        // 显示批量操作结果
        if (currentBatch.length > 1 && this.options.batchTaskMessage) {
          const successCount = results.filter((r) => r.success).length;
          const failCount = results.length - successCount;
          const batchMsg = this.options.batchTaskMessage(currentBatch.length);

          if (failCount === 0) {
            message.success({
              content: `批量处理完成，成功 ${successCount} 个任务`,
              key: "batchTask",
            });
          } else {
            message.warning({
              content: `批量处理完成，成功 ${successCount} 个，失败 ${failCount} 个`,
              key: "batchTask",
            });
          }
        }
      } finally {
        this.isProcessing = false;
        this.timer = null;

        // 如果处理过程中又有新任务加入，继续处理
        if (this.queue.length > 0) {
          setTimeout(() => this.processQueue(), 100);
        } else {
          // 所有任务都完成了，触发回调
          if (this.onAllTasksComplete && this.processingItems.size === 0) {
            setTimeout(() => {
              if (this.processingItems.size === 0 && this.queue.length === 0) {
                this.onAllTasksComplete?.();
              }
            }, 100);
          }
        }
      }
    }, this.config.delay);
  }

  // 清理资源
  cleanup() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue = [];
    this.processingItems.clear();
    this.isProcessing = false;
    console.log("任务队列已清理");
  }
}

// 创建启动任务队列的工厂函数
export const createStartTaskQueue = () => {
  return new TaskQueue(
    // 处理器函数
    async (items) => {
      const { triggerDagRun } = await import("../api/airflow");
      const dayjs = (await import("dayjs")).default;

      return Promise.all(
        items.map(async ({ id, data }) => {
          try {
            const template = data;
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
              task_time: (template.updated_at && dayjs(template.updated_at).format("HH:mm")) || "",
            };

            console.log(`创建任务: ${dag_run_id}`, conf);
            const response = await triggerDagRun("xhs_auto_progress", dag_run_id, conf);

            if (response && response.dag_run_id) {
              console.log(`成功创建任务: ${dag_run_id}, keyword: ${template.keyword}`);
              return { success: true, id };
            } else {
              throw new Error("创建任务失败，响应无效");
            }
          } catch (error) {
            console.error(`创建任务失败: ${id}`, error);
            return { success: false, id, error };
          }
        })
      );
    },
    // 消息配置
    {
      singleTaskMessage: (item) => ({
        loading: `正在创建任务 "${item.data.keyword}"...`,
        success: `任务 "${item.data.keyword}" 创建成功`,
        error: `创建任务 "${item.data.keyword}" 失败，请重试`,
      }),
      batchTaskMessage: (count) => ({
        loading: `正在批量创建 ${count} 个任务...`,
        success: `批量创建完成`,
        error: `批量创建失败`,
      }),
      getItemName: (item) => item.data.keyword || `任务${item.id}`,
    }
  );
};

// 创建暂停任务队列的工厂函数
export const createPauseTaskQueue = () => {
  return new TaskQueue(
    // 处理器函数
    async (items) => {
      const { pauseDag, setNote, getDagRunDetail } = await import("../api/airflow");

      return Promise.all(
        items.map(async ({ id, data }) => {
          try {
            const { dagRunId, keyword } = data;

            await Promise.all([
              pauseDag("xhs_auto_progress", dagRunId),
              setNote("xhs_auto_progress", dagRunId, "paused"),
            ]);

            await getDagRunDetail("xhs_auto_progress", dagRunId);

            console.log(`成功暂停任务: ${dagRunId}, keyword: ${keyword}`);
            return { success: true, id };
          } catch (error) {
            console.error(`暂停任务失败: ${id}`, error);
            return { success: false, id, error };
          }
        })
      );
    },
    // 消息配置
    {
      singleTaskMessage: (item) => ({
        loading: `正在暂停任务 "${item.data.keyword}"...`,
        success: `任务 "${item.data.keyword}" 已成功暂停`,
        error: `暂停任务 "${item.data.keyword}" 失败，请重试`,
      }),
      batchTaskMessage: (count) => ({
        loading: `正在批量暂停 ${count} 个任务...`,
        success: `批量暂停完成`,
        error: `批量暂停失败`,
      }),
      getItemName: (item) => item.data.keyword || `任务${item.id}`,
    },
    // 暂停任务的配置（更快的处理速度）
    {
      batchSize: 3,
      delay: 500,
      processingDelay: 300,
    }
  );
};
