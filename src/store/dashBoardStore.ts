import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
// 模板项接口
interface TemplateItem {
  id: string
  content: string
  imageUrl?: string
  isEditing?: boolean
  templateId?: number
}

// 任务创建表单数据接口
interface TaskFormData {
  // 当前步骤
  currentStep?: '采集任务' | '分析要求' | '回复模板'
  
  // 采集任务步骤
  targetEmail: string
  sortBy: string
  keyword: string
  timeRange: string
  noteCount: number
  taskDate?: string
  taskTime?: string
  noteType: string
  
  // 分析要求步骤
  userProfileLevel: string[]
  profileSentence: string
  
  // 回复模板步骤
  commentTemplates: TemplateItem[]
  messageTemplates: TemplateItem[]
}

// Store状态接口
interface DashBoardState {
  // 当前步骤
  currentStep: '采集任务' | '分析要求' | '回复模板'
  
  // 表单数据
  formData: TaskFormData
  
  // 操作方法
  setCurrentStep: (step: '采集任务' | '分析要求' | '回复模板') => void
  
  // 更新表单数据
  updateFormData: (data: Partial<TaskFormData>) => void
  
  // 更新特定字段
  updateField: <K extends keyof TaskFormData>(field: K, value: TaskFormData[K]) => void
  
  // 模板操作
  updateCommentTemplate: (index: number, template: Partial<TemplateItem>) => void
  addCommentTemplate: (template: TemplateItem) => void
  deleteCommentTemplate: (id: string) => void
  
  updateMessageTemplate: (index: number, template: Partial<TemplateItem>) => void
  addMessageTemplate: (template: TemplateItem) => void
  deleteMessageTemplate: (id: string) => void
  
  // 重置表单
  resetForm: () => void
  
  // 保存进度
  saveProgress: () => void
  
}

// 默认表单数据
const defaultFormData: TaskFormData = {
  currentStep: '采集任务',
  targetEmail: '',
  sortBy: '综合',
  keyword: '',
  timeRange: '不限',
  noteCount: 10,
  taskDate: undefined,
  taskTime: undefined,
  noteType: '图文',
  userProfileLevel: [],
  profileSentence: '',
  commentTemplates: [
    { id: '1', content: '', isEditing: true },
    { id: '2', content: '', isEditing: false },
    { id: '3', content: '', isEditing: false },
  ],
  messageTemplates: [
    { id: '1', content: '', isEditing: true },
    { id: '2', content: '', isEditing: false },
  ],
}

export const useDashBoardStore = create<DashBoardState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        currentStep: '采集任务',
        formData: defaultFormData,
        
        // 设置当前步骤
        setCurrentStep: (step) => {
          set({ 
            currentStep: step,
            formData: { ...get().formData, currentStep: step }
          }, false, 'setCurrentStep')
        },
        
        // 更新表单数据
        updateFormData: (data) => {
          set(
            (state) => ({
              formData: { ...state.formData, ...data }
            }),
            false,
            'updateFormData'
          )
        },
        
        // 更新特定字段
        updateField: (field, value) => {
          set(
            (state) => ({
              formData: { ...state.formData, [field]: value }
            }),
            false,
            `updateField/${field}`
          )
        },
        
        // 更新评论模板
        updateCommentTemplate: (index, template) => {
          set(
            (state) => {
              const newTemplates = [...state.formData.commentTemplates]
              newTemplates[index] = { ...newTemplates[index], ...template }
              return {
                formData: { ...state.formData, commentTemplates: newTemplates }
              }
            },
            false,
            'updateCommentTemplate'
          )
        },
        
        // 添加评论模板
        addCommentTemplate: (template) => {
          set(
            (state) => ({
              formData: {
                ...state.formData,
                commentTemplates: [...state.formData.commentTemplates, template]
              }
            }),
            false,
            'addCommentTemplate'
          )
        },
        
        // 删除评论模板
        deleteCommentTemplate: (id) => {
          set(
            (state) => ({
              formData: {
                ...state.formData,
                commentTemplates: state.formData.commentTemplates.filter(t => t.id !== id)
              }
            }),
            false,
            'deleteCommentTemplate'
          )
        },
        
        // 更新私信模板
        updateMessageTemplate: (index, template) => {
          set(
            (state) => {
              const newTemplates = [...state.formData.messageTemplates]
              newTemplates[index] = { ...newTemplates[index], ...template }
              return {
                formData: { ...state.formData, messageTemplates: newTemplates }
              }
            },
            false,
            'updateMessageTemplate'
          )
        },
        
        // 添加私信模板
        addMessageTemplate: (template) => {
          set(
            (state) => ({
              formData: {
                ...state.formData,
                messageTemplates: [...state.formData.messageTemplates, template]
              }
            }),
            false,
            'addMessageTemplate'
          )
        },
        
        // 删除私信模板
        deleteMessageTemplate: (id) => {
          set(
            (state) => ({
              formData: {
                ...state.formData,
                messageTemplates: state.formData.messageTemplates.filter(t => t.id !== id)
              }
            }),
            false,
            'deleteMessageTemplate'
          )
        },
        
        // 重置表单
        resetForm: () => {
          set(
            {
              currentStep: '采集任务',
              formData: defaultFormData
            },
            false,
            'resetForm'
          )
        },
        
        // 保存进度
        saveProgress: () => {
          // 这里可以添加额外的保存逻辑
          console.log('进度已保存到本地存储')
        },
        
      }),
      {
        name: "dashBoardStore",
        // 持久化所有数据
        partialize: (state) => ({
          currentStep: state.currentStep,
          formData: state.formData
        }),
        // 版本控制，当数据结构发生变化时可以处理版本升级
        version: 1,
        // 数据迁移函数
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            // 从版本0迁移到版本1的逻辑
            return {
              ...persistedState,
              formData: {
                ...defaultFormData,
                ...persistedState.formData
              }
            }
          }
          return persistedState
        }
      }
    ),
    {
      name: 'DashBoardStore'
    }
  )
)

// 选择器函数
export const dashBoardSelectors = {
  currentStep: (state: DashBoardState) => state.currentStep,
  formData: (state: DashBoardState) => state.formData,
  commentTemplates: (state: DashBoardState) => state.formData.commentTemplates,
  messageTemplates: (state: DashBoardState) => state.formData.messageTemplates,
  keyword: (state: DashBoardState) => state.formData.keyword,
  targetEmail: (state: DashBoardState) => state.formData.targetEmail,
  profileSentence: (state: DashBoardState) => state.formData.profileSentence,
  userProfileLevel: (state: DashBoardState) => state.formData.userProfileLevel,
  taskDate: (state: DashBoardState) => state.formData.taskDate,
  taskTime: (state: DashBoardState) => state.formData.taskTime,
}
