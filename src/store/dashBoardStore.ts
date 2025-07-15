import { create } from "zustand";
import { devtools } from "zustand/middleware";
// 模板项接口
interface TemplateItem {
  id: string;
  content: string;
  imageUrl?: string;
  isEditing?: boolean;
  templateId?: number;
  checked?: boolean; // 新增勾选状态字段
}

// 任务创建表单数据接口
interface TaskFormData {
  // 当前步骤
  currentStep?: "采集任务" | "分析要求" | "回复模板";

  // 采集任务步骤
  targetEmail: string;
  sortBy: string;
  keyword: string;
  timeRange: string;
  noteCount: number;
  taskDate?: string;
  taskTime?: string;
  noteType: string;

  // 分析要求步骤
  userProfileLevel: string[];
  profileSentence: string;

  // 回复模板步骤
  commentTemplates: TemplateItem[];
  messageTemplates: TemplateItem[];
}

// Store状态接口
interface DashBoardState {
  // 当前步骤
  currentStep: "采集任务" | "分析要求" | "回复模板";

  // 表单数据
  formData: TaskFormData;

  // 操作方法
  setCurrentStep: (step: "采集任务" | "分析要求" | "回复模板") => void;

  // 更新表单数据
  updateFormData: (data: Partial<TaskFormData>) => void;

  // 更新特定字段
  updateField: <K extends keyof TaskFormData>(field: K, value: TaskFormData[K]) => void;

  // 模板操作
  updateCommentTemplate: (index: number, template: Partial<TemplateItem>) => void;
  addCommentTemplate: (template: TemplateItem) => void;
  deleteCommentTemplate: (id: string) => void;

  updateMessageTemplate: (index: number, template: Partial<TemplateItem>) => void;
  addMessageTemplate: (template: TemplateItem) => void;
  deleteMessageTemplate: (id: string) => void;

  // 重置表单
  resetForm: () => void;

  // 保存进度
  saveProgress: () => void;

  // 从本地存储加载进度
  loadProgress: () => boolean;

  // 清除本地存储的进度
  clearSavedProgress: () => void;
}

// 默认表单数据
const defaultFormData: TaskFormData = {
  currentStep: "采集任务",
  targetEmail: "",
  sortBy: "综合",
  keyword: "",
  timeRange: "不限",
  noteCount: 10,
  taskDate: undefined,
  taskTime: undefined,
  noteType: "图文",
  userProfileLevel: [],
  profileSentence: "",
  commentTemplates: [
    { id: "1", content: "", isEditing: true, checked: true },
    { id: "2", content: "", isEditing: false, checked: true },
    { id: "3", content: "", isEditing: false, checked: true },
  ],
  messageTemplates: [
    { id: "1", content: "", isEditing: true, checked: true },
    { id: "2", content: "", isEditing: false, checked: true },
  ],
};

// 本地存储的键名
const STORAGE_KEY = "dashBoard-saved-progress";

export const useDashBoardStore = create<DashBoardState>()(
  devtools(
    (set, get) => ({
      // 初始状态 - 总是从第一步开始，不自动加载
      currentStep: "采集任务",
      formData: defaultFormData,

      // 设置当前步骤
      setCurrentStep: (step) => {
        set(
          {
            currentStep: step,
            formData: { ...get().formData, currentStep: step },
          },
          false,
          "setCurrentStep"
        );
      },

      // 更新表单数据
      updateFormData: (data) => {
        set(
          (state) => ({
            formData: { ...state.formData, ...data },
          }),
          false,
          "updateFormData"
        );
      },

      // 更新特定字段
      updateField: (field, value) => {
        set(
          (state) => ({
            formData: { ...state.formData, [field]: value },
          }),
          false,
          `updateField/${field}`
        );
      },

      // 更新评论模板
      updateCommentTemplate: (index, template) => {
        set(
          (state) => {
            const newTemplates = [...state.formData.commentTemplates];
            newTemplates[index] = { ...newTemplates[index], ...template };
            return {
              formData: { ...state.formData, commentTemplates: newTemplates },
            };
          },
          false,
          "updateCommentTemplate"
        );
      },

      // 添加评论模板
      addCommentTemplate: (template) => {
        set(
          (state) => ({
            formData: {
              ...state.formData,
              commentTemplates: [...state.formData.commentTemplates, template],
            },
          }),
          false,
          "addCommentTemplate"
        );
      },

      // 删除评论模板
      deleteCommentTemplate: (id) => {
        set(
          (state) => ({
            formData: {
              ...state.formData,
              commentTemplates: state.formData.commentTemplates.filter((t) => t.id !== id),
            },
          }),
          false,
          "deleteCommentTemplate"
        );
      },

      // 重置表单
      resetForm: () => {
        set(
          {
            currentStep: "采集任务",
            formData: defaultFormData,
          },
          false,
          "resetForm"
        );
      },

      // 🔑 手动保存进度到本地存储
      saveProgress: () => {
        try {
          const state = get();
          const progressData = {
            currentStep: state.currentStep,
            formData: state.formData,
            savedAt: new Date().toISOString(),
          };

          localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
          console.log("✅ 进度已保存到本地存储", progressData);

          // 额外记录模板勾选状态
          if (state.formData.commentTemplates && state.formData.commentTemplates.length > 0) {
            console.log(
              "✅ 保存的模板勾选状态:",
              state.formData.commentTemplates.map((t) => ({
                id: t.id,
                templateId: t.templateId,
                checked: t.checked,
              }))
            );
          }
        } catch (error) {
          console.error("❌ 保存进度失败:", error);
        }
      },

      // 🔑 从本地存储加载进度
      loadProgress: () => {
        try {
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
            const progressData = JSON.parse(savedData);

            set(
              {
                currentStep: progressData.currentStep || "采集任务",
                formData: { ...defaultFormData, ...progressData.formData },
              },
              false,
              "loadProgress"
            );

            console.log("✅ 进度已从本地存储加载", progressData);

            // 额外记录加载的模板勾选状态
            if (
              progressData.formData?.commentTemplates &&
              progressData.formData.commentTemplates.length > 0
            ) {
              console.log(
                "✅ 加载的模板勾选状态:",
                progressData.formData.commentTemplates.map((t: any) => ({
                  id: t.id,
                  templateId: t.templateId,
                  checked: t.checked,
                }))
              );
            }

            return true;
          }
          return false;
        } catch (error) {
          console.error("❌ 加载进度失败:", error);
          return false;
        }
      },

      // 🔑 清除本地存储的进度
      clearSavedProgress: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
          console.log("✅ 已清除本地存储的进度");
        } catch (error) {
          console.error("❌ 清除进度失败:", error);
        }
      },
    }),
    {
      name: "DashBoardStore",
    }
  )
);

// 🔑 检查是否有已保存的进度
export const hasSavedProgress = (): boolean => {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
};
