import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Tooltip,
  Checkbox,
  Steps,
  Popover,
  Upload,
  Image,
  message,
} from "antd";
import type { StepsProps, UploadProps } from "antd";
import dayjs from "dayjs";
import {
  QuestionCircleOutlined,
  PlusOutlined,
  UploadOutlined,
  EditOutlined,
  SaveOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useUser } from "../../context/UserContext";
import { UserProfileService } from "../../management/userManagement/userProfileService";
import { triggerDagRun } from "../../api/airflow";
import {
  getReplyTemplatesApi,
  createReplyTemplateApi,
  updateReplyTemplateApi,
  deleteReplyTemplateApi,
  ReplyTemplate,
  addTaskTemplateAPI,
} from "../../api/mysql";
import { tencentCOSService } from "../../api/tencent_cos";
import { useDashBoardStore, hasSavedProgress } from "../../store/dashBoardStore";
import exclamation2 from "../../img/exclamation2.svg";
import { set } from "date-fns";
import VirtualList from "rc-virtual-list";
// Define the steps of the task creation process
type TaskCreationStep = "采集任务" | "分析要求" | "回复模板";

// Props for the CreateTaskModal component
interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onFinish: (values: any) => void;
  onRefresh?: () => void;
}

// Interface for template item
interface TemplateItem {
  id: string;
  content: string;
  imageUrl?: string;
  isEditing?: boolean;
  templateId?: number; // Backend template ID
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  visible,
  onClose,
  onFinish,
  onRefresh,
}) => {
  const [form] = Form.useForm();

  // 统一使用 useUserStore 获取用户信息
  const { isAdmin, email } = useUser();

  // 使用Zustand store管理状态
  const currentStep = useDashBoardStore((state) => state.currentStep);
  const formData = useDashBoardStore((state) => state.formData);
  const setCurrentStep = useDashBoardStore((state) => state.setCurrentStep);
  const updateFormData = useDashBoardStore((state) => state.updateFormData);
  const updateField = useDashBoardStore((state) => state.updateField);
  const updateCommentTemplate = useDashBoardStore((state) => state.updateCommentTemplate);
  const addCommentTemplate = useDashBoardStore((state) => state.addCommentTemplate);
  const deleteCommentTemplate = useDashBoardStore((state) => state.deleteCommentTemplate);
  const updateMessageTemplate = useDashBoardStore((state) => state.updateMessageTemplate);
  const addMessageTemplate = useDashBoardStore((state) => state.addMessageTemplate);
  const deleteMessageTemplate = useDashBoardStore((state) => state.deleteMessageTemplate);
  const saveProgress = useDashBoardStore((state) => state.saveProgress);
  const loadProgress = useDashBoardStore((state) => state.loadProgress);
  const clearSavedProgress = useDashBoardStore((state) => state.clearSavedProgress);
  const resetForm = useDashBoardStore((state) => state.resetForm);

  // 从store获取数据（仅用于初始化和保存）
  const commentTemplates = formData.commentTemplates;
  const messageTemplates = formData.messageTemplates;

  // 本地state（不需要持久化的）
  const [availableEmails, setAvailableEmails] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [noteTypes] = useState<{ value: string; label: string }[]>([
    { value: "图文", label: "图文" },
    { value: "视频", label: "视频" },
  ]);
  const [sortOptions] = useState<{ value: string; label: string }[]>([
    { value: "综合", label: "综合" },
    { value: "最新", label: "最新" },
    { value: "最多点赞", label: "最多点赞" },
    { value: "最多评论", label: "最多评论" },
    { value: "最多收藏", label: "最多收藏" },
  ]);
  const [timeRanges] = useState<{ value: string; label: string }[]>([
    { value: "不限", label: "不限" },
    { value: "一天内", label: "一天内" },
    { value: "一周内", label: "一周内" },
    { value: "一月内", label: "一月内" },
  ]);
  const [noteCounts] = useState<{ value: number; label: string }[]>([
    { value: 10, label: "10篇" },
    { value: 20, label: "20篇" },
    { value: 50, label: "50篇" },
    { value: 100, label: "100篇" },
  ]);

  // Add state for 分析要求 step
  const [intentTypes] = useState<{ value: string; label: string }[]>([
    { value: "高意向", label: "高意向" },
    { value: "中意向", label: "中意向" },
    { value: "低意向", label: "低意向" },
  ]);

  // Steps configuration
  const steps = [
    { key: "采集任务", title: "采集任务" },
    { key: "分析要求", title: "分析要求" },
    { key: "回复模板", title: "回复模板" },
  ];

  // Fetch available emails and keywords on component mount
  useEffect(() => {
    fetchAvailableEmails();
  }, [isAdmin, email]);

  // 安全地处理日期时间数据的辅助函数
  const parseDate = (dateString: string | undefined) => {
    if (!dateString) return undefined;
    try {
      const parsed = dayjs(dateString);
      if (parsed.isValid()) {
        return parsed;
      } else {
        return undefined;
      }
    } catch (error) {
      return undefined;
    }
  };

  const parseTime = (timeString: string | undefined, taskDate: string | undefined) => {
    if (!timeString) return undefined;
    try {
      // 使用当前日期 + 时间字符串的方式来创建 dayjs 对象
      const parsed = dayjs(`${taskDate} ${timeString}`, "YYYY-MM-DD HH:mm");

      if (parsed.isValid()) {
        return parsed;
      } else {
        return undefined;
      }
    } catch (error) {
      return undefined;
    }
  };

  // Initialize form when modal opens
  useEffect(() => {
    if (visible && !isInitialized) {
      // 清理可能存在的错误时间格式数据
      if (
        formData.taskTime &&
        typeof formData.taskTime === "string" &&
        formData.taskTime.includes("mM")
      ) {
        updateFormData({ taskTime: undefined });
      }

      // 只有当有保存的进度时才使用store数据，否则使用默认值
      if (checkHasSavedProgress()) {
        // 加载保存的进度
        loadProgress();
      } else {
        // 使用默认值重置表单
        form.setFieldsValue({
          targetEmail: email || (availableEmails.length > 0 ? availableEmails[0] : ""),
          sortBy: sortOptions[0]?.value || "",
          timeRange: timeRanges[0]?.value || "",
          noteCount: noteCounts[0]?.value || 10,
          noteType: noteTypes[0]?.value || "",
          keyword: "",
          taskDate: undefined,
          taskTime: undefined,
          userProfileLevel: [],
          profileSentence: "",
        });
        // 重置到第一步
        setCurrentStep("采集任务");
        setIsInitialized(true);
      }
    }

    // 当弹窗关闭时重置初始化状态
    if (!visible) {
      setIsInitialized(false);
    }
  }, [
    visible,
    isInitialized,
    form,
    email,
    availableEmails,
    sortOptions,
    timeRanges,
    noteCounts,
    noteTypes,
  ]);

  // 监听特定 formData 字段变化，当数据加载完成后更新表单
  useEffect(() => {
    if (visible && formData && !isInitialized) {
      // 如果有保存的进度数据，并且 formData 中有实际内容，则更新表单
      if (
        checkHasSavedProgress() &&
        (formData.keyword || formData.targetEmail || formData.profileSentence)
      ) {
        form.setFieldsValue({
          targetEmail:
            formData.targetEmail || email || (availableEmails.length > 0 ? availableEmails[0] : ""),
          sortBy: formData.sortBy || sortOptions[0]?.value || "",
          timeRange: formData.timeRange || timeRanges[0]?.value || "",
          noteCount: formData.noteCount || noteCounts[0]?.value || 10,
          noteType: formData.noteType || noteTypes[0]?.value || "",
          keyword: formData.keyword || "",
          taskDate: parseDate(formData.taskDate),
          taskTime: parseTime(formData.taskTime, formData.taskDate),
          userProfileLevel: formData.userProfileLevel || [],
          profileSentence: formData.profileSentence || "",
        });

        setIsInitialized(true);
      }
    }
  }, [
    visible,
    isInitialized,
    formData.keyword,
    formData.targetEmail,
    formData.profileSentence,
    formData.taskDate,
    formData.taskTime,
    formData.sortBy,
    formData.timeRange,
    formData.noteCount,
    formData.noteType,
    formData.userProfileLevel,
    form,
    email,
    availableEmails,
    sortOptions,
    timeRanges,
    noteCounts,
    noteTypes,
  ]);

  // 单独处理 currentStep 的恢复，避免无限循环
  useEffect(() => {
    if (
      visible &&
      checkHasSavedProgress() &&
      formData.currentStep &&
      currentStep !== formData.currentStep &&
      !isInitialized
    ) {
      setCurrentStep(formData.currentStep);
    }
  }, [visible, formData.currentStep, currentStep, isInitialized]);

  // 检查是否有保存的进度数据 - 现在使用 store 的方法
  const checkHasSavedProgress = () => {
    return hasSavedProgress();
  };

  // Fetch available emails
  const fetchAvailableEmails = async () => {
    if (isAdmin) {
      // 管理员可以看到所有用户的邮箱
      try {
        const response = await UserProfileService.getAllUserProfiles();
        if (response && Array.isArray(response)) {
          const emails = response
            .filter((user: { email?: string }) => user.email) // 过滤掉没有邮箱的用户
            .map((user: { email?: string }) => user.email as string);
          setAvailableEmails(emails);
        } else {
          // 如果获取失败，至少添加当前用户的邮箱
          if (email) {
            setAvailableEmails([email]);
          }
        }
      } catch (err) {
        if (email) {
          setAvailableEmails([email]);
        }
      }
    } else {
      // 非管理员只能看到自己的邮箱
      if (email) {
        setAvailableEmails([email]);
      }
    }
  };

  // Add state for comment template image upload
  const [commentUploadLoading, setCommentUploadLoading] = useState(false);
  const [commentImageFile, setCommentImageFile] = useState<{ index: number; file: File } | null>(
    null
  );

  // Fetch comment templates from backend when modal is opened
  useEffect(() => {
    if (visible && email && currentStep === "回复模板") {
      fetchCommentTemplates();
    }
  }, [visible, email, currentStep]);

  // Fetch comment templates from backend
  const fetchCommentTemplates = async () => {
    if (!email) {
      message.error("用户邮箱不能为空，无法获取模板");
      return;
    }

    try {
      const response = await getReplyTemplatesApi({
        page: 1,
        page_size: 20,
        email: email,
      });

      if (response.data?.records && response.data.records.length > 0) {
        // Map backend templates to our format
        const templates = response.data.records.map((template: ReplyTemplate) => ({
          id: template.id.toString(),
          content: template.content || "",
          imageUrl: template.image_urls || undefined,
          isEditing: false,
          templateId: template.id,
        }));

        // Update our template state
        updateFormData({ commentTemplates: templates });
      }
    } catch (error) {
      message.error("获取模板失败");
    }
  };

  // Toggle comment template edit mode
  const toggleCommentTemplateEditMode = (id: string) => {
    const template = commentTemplates.find((t: TemplateItem) => t.id === id);

    // If we're saving a template that was in edit mode
    if (template && template.isEditing) {
      // Save the template to backend
      saveCommentTemplate(template);
    } else {
      // Just toggle edit mode
      const templateIndex = commentTemplates.findIndex((t: TemplateItem) => t.id === id);
      if (templateIndex !== -1) {
        updateCommentTemplate(templateIndex, { isEditing: !template?.isEditing });
      }
    }
  };

  // Toggle message template edit mode
  const toggleMessageTemplateEditMode = (id: string) => {
    const templateIndex = messageTemplates.findIndex((t: TemplateItem) => t.id === id);
    if (templateIndex !== -1) {
      const template = messageTemplates[templateIndex];
      updateMessageTemplate(templateIndex, { isEditing: !template.isEditing });
    }
  };

  // Save comment template to backend
  const saveCommentTemplate = async (template: TemplateItem) => {
    if (!email) {
      message.error("用户邮箱不能为空，无法保存模板");
      return;
    }

    try {
      // If template has a backend ID, update it
      if (template.templateId) {
        // If we have a new image file to upload
        let imageUrl = template.imageUrl;
        const updateTemplateIndex = commentTemplates.findIndex(
          (t: TemplateItem) => t.id === template.id
        );

        if (commentImageFile && commentImageFile.index === updateTemplateIndex) {
          imageUrl = await uploadCommentImageToCOS(template.templateId, commentImageFile.file);
          setCommentImageFile(null);
        }

        const response = await updateReplyTemplateApi(template.templateId, {
          content: template.content,
          email: email,
          image_urls: imageUrl,
        });

        if (response.code === 0) {
          message.success("更新模板成功");
          // Toggle edit mode off
          const templateIndex = commentTemplates.findIndex(
            (t: TemplateItem) => t.id === template.id
          );
          if (templateIndex !== -1) {
            updateCommentTemplate(templateIndex, { isEditing: false });
          }
        } else {
          message.error(response.message || "更新模板失败");
        }
      }
      // Otherwise create a new template
      else {
        const response = await createReplyTemplateApi({
          content: template.content,
          email: email,
        });

        if (response.code !== 0) {
          message.error(response.message || "添加模板失败");
          return;
        }

        // If we have an image to upload, we need to get the new template ID
        const currentTemplateIndex = commentTemplates.findIndex(
          (t: TemplateItem) => t.id === template.id
        );

        if (commentImageFile && commentImageFile.index === currentTemplateIndex) {
          const templatesResponse = await getReplyTemplatesApi({
            page: 1,
            page_size: 10,
            email: email,
          });

          if (!templatesResponse.data?.records || templatesResponse.data.records.length === 0) {
            message.warning("创建模板成功，但无法上传图片");
            setCommentImageFile(null);
            return;
          }

          // Get the latest template (should be the one we just created)
          const latestTemplate = templatesResponse.data.records[0];

          // Upload the image
          const imageUrl = await uploadCommentImageToCOS(latestTemplate.id, commentImageFile.file);
          setCommentImageFile(null);

          if (!imageUrl) {
            message.warning("模板创建成功，但图片上传失败");
            return;
          }

          // Update the template with the image URL
          const updateResponse = await updateReplyTemplateApi(latestTemplate.id, {
            content: template.content,
            email: email,
            image_urls: imageUrl,
          });

          if (updateResponse.code === 0) {
            message.success("添加模板成功");
          } else {
            message.warning("模板创建成功，但更新图片失败");
          }
        } else {
          message.success("添加模板成功");
        }

        // Toggle edit mode off
        const saveTemplateIndex = commentTemplates.findIndex(
          (t: TemplateItem) => t.id === template.id
        );
        if (saveTemplateIndex !== -1) {
          updateCommentTemplate(saveTemplateIndex, { isEditing: false });
        }
      }

      // Refresh templates
      fetchCommentTemplates();
    } catch (error) {
      message.error("保存模板失败");
    }
  };

  // Delete comment template (handles backend API)
  const handleDeleteCommentTemplate = async (id: string) => {
    const template = commentTemplates.find((t: TemplateItem) => t.id === id);

    // If it has a backend ID, delete it from backend
    if (template && template.templateId && email) {
      try {
        const response = await deleteReplyTemplateApi(template.templateId, email);

        if (response.code === 0) {
          message.success("删除模板成功");
          deleteCommentTemplate(id);
        } else {
          message.error(response.message || "删除模板失败");
        }
      } catch (error) {
        message.error("删除模板失败");
        return;
      }
    } else {
      // Just remove from local state
      deleteCommentTemplate(id);
    }
  };

  // Delete message template (handles backend API)
  const handleDeleteMessageTemplate = (id: string) => {
    // For message templates, just remove from local state
    deleteMessageTemplate(id);
  };

  // Upload comment image to COS
  const uploadCommentImageToCOS = async (templateId: number, file: File): Promise<string> => {
    if (!file || !email) return "";

    try {
      setCommentUploadLoading(true);

      // Create Tencent COS service instance
      const cosService = tencentCOSService;

      // Build upload path: email/templateId
      const uploadPath = `${email}/${templateId}`;

      // Upload file to Tencent COS
      const result = await cosService.uploadFile(file, uploadPath);

      return result.url;
    } catch (error) {
      message.error("上传图片失败");
      return "";
    } finally {
      setCommentUploadLoading(false);
    }
  };

  // Handle next step button click
  const handleNextStep = async () => {
    try {
      // Validate form fields for current step
      await form.validateFields();

      // Move to next step based on current step
      if (currentStep === "采集任务") {
        setCurrentStep("分析要求");
      } else if (currentStep === "分析要求") {
        setCurrentStep("回复模板");
      } else {
        // Final step, submit the form
        handleFinish();
      }
    } catch (error) {
      message.error("表单验证失败，请检查必填字段");
    }
  };

  // Handle previous step button click
  const handlePrevStep = () => {
    if (currentStep === "分析要求") {
      setCurrentStep("采集任务");
    } else if (currentStep === "回复模板") {
      setCurrentStep("分析要求");
    }
  };

  // Handle save progress button click
  const handleSaveProgress = async () => {
    try {
      //  由于现在有了 onValuesChange 实时同步，store 中的数据就是最新的
      const latestFormData = useDashBoardStore.getState().formData;

      //  为了确保数据最新，也获取一次当前表单的值并合并
      const currentFormValues = form.getFieldsValue(true);

      // 处理日期和时间格式，将 dayjs 对象转换为字符串
      const processedFormValues = {
        ...currentFormValues,
        taskDate:
          currentFormValues.taskDate && dayjs.isDayjs(currentFormValues.taskDate)
            ? currentFormValues.taskDate.format("YYYY-MM-DD")
            : undefined,
        taskTime:
          currentFormValues.taskTime && dayjs.isDayjs(currentFormValues.taskTime)
            ? currentFormValues.taskTime.format("HH:mm")
            : undefined,
      };

      // 🔑 合并 store 数据和当前表单数据，确保获取最新的完整数据
      const completeFormData = {
        ...latestFormData,
        ...processedFormValues,
      };

      // 先更新到store
      updateFormData({
        ...completeFormData,
        commentTemplates,
        messageTemplates,
        currentStep,
      });

      // 🔑 手动保存进度到本地存储
      saveProgress();

      message.success("进度已保存到本地");
    } catch (error) {
      message.error("保存进度失败");
    }
  };

  // Handle finish button click
  const handleFinish = async () => {
    try {
      const messageKey = "handleFinish";
      message.loading({
        content: "正在创建任务...",
        key: messageKey,
      });
      const values = await form.validateFields();

      // Get all form values for DAG configuration
      const formValues = form.getFieldsValue(true);

      // Create timestamp for unique DAG run ID
      const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
      const dag_run_id = `xhs_auto_progress_${timestamp}`;

      // Extract template IDs from comment templates that have backend IDs
      const templateIds = commentTemplates
        .filter((template: TemplateItem) => template.templateId)
        .map((template: TemplateItem) => template.templateId as number);

      // Prepare configuration object for Airflow DAG
      const conf = {
        email: formValues.targetEmail,
        keyword: formValues.keyword,
        max_notes: parseInt(formValues.noteCount || "10"),
        note_type: formValues.noteType || "图文",
        time_range: formValues.timeRange || "",
        search_scope: formValues.searchScope || "",
        sort_by: formValues.sortBy || "综合",
        profile_sentence: formValues.profileSentence || "",
        intent_type: formValues.userProfileLevel || [],
        template_ids: templateIds,
        task_date:
          formValues.taskDate && dayjs.isDayjs(formValues.taskDate)
            ? formValues.taskDate.format("YYYY-MM-DD")
            : "",
        task_time:
          formValues.taskTime && dayjs.isDayjs(formValues.taskTime)
            ? formValues.taskTime.format("HH:mm")
            : "",
      };

      try {
        // Trigger the Airflow DAG with the configuration
        const response = await triggerDagRun("xhs_auto_progress", dag_run_id, conf);

        if (response && response.dag_run_id) {
          message.success({
            content: "创建任务成功",
            key: messageKey,
            duration: 2,
          });
          setTimeout(() => {
            // 提交成功后清空保存的进度数据
            clearSavedProgress();
            resetForm();
            onClose();
            onRefresh?.();
          }, 2000);
          // Pass the response to the parent component
          onFinish({
            ...values,
            dagResponse: response,
            conf: conf,
          });
        } else {
          message.error("创建任务失败，请重试");
        }
      } catch (err) {
        message.error("创建任务失败，请检查网络连接");
      }
    } catch (error) {
      message.error("表单验证失败，请检查必填字段");
    }
  };

  // 添加表单值变化处理函数，实时同步到 store
  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    // 处理日期和时间格式
    const processedValues = {
      ...allValues,
      taskDate:
        allValues.taskDate && dayjs.isDayjs(allValues.taskDate)
          ? allValues.taskDate.format("YYYY-MM-DD")
          : allValues.taskDate,
      taskTime:
        allValues.taskTime && dayjs.isDayjs(allValues.taskTime)
          ? allValues.taskTime.format("HH:mm")
          : allValues.taskTime,
    };

    // 实时同步到 store
    updateFormData(processedValues);
  };

  //  统一的 initialValues - 所有步骤都使用相同的完整数据
  const getUnifiedInitialValues = () => ({
    targetEmail:
      formData.targetEmail || email || (availableEmails.length > 0 ? availableEmails[0] : ""),
    sortBy: formData.sortBy || sortOptions[0]?.value || "",
    timeRange: formData.timeRange || timeRanges[0]?.value || "",
    noteCount: formData.noteCount || noteCounts[0]?.value || 10,
    noteType: formData.noteType || noteTypes[0]?.value || "",
    keyword: formData.keyword || "",
    taskDate: parseDate(formData.taskDate),
    taskTime: parseTime(formData.taskTime, formData.taskDate),
    userProfileLevel: formData.userProfileLevel || [],
    profileSentence: formData.profileSentence || "",
  });

  // Render the current step content
  const renderStepContent = () => {
    const unifiedInitialValues = getUnifiedInitialValues();

    switch (currentStep) {
      case "采集任务":
        return (
          <div className="p-4">
            <Form
              form={form}
              layout="vertical"
              initialValues={unifiedInitialValues}
              onValuesChange={handleFormValuesChange}
            >
              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="targetEmail"
                  label={
                    <span className="flex items-center">
                      目标邮箱
                      <Tooltip title="选择目标邮箱">
                        <Image
                          src={exclamation2}
                          alt="exclamation2"
                          width={14}
                          height={14}
                          style={{ marginLeft: "4px" }}
                          preview={false}
                        />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: "请选择目标邮箱" }]}
                >
                  <Select placeholder="请选择目标邮箱">
                    {availableEmails.map((email) => (
                      <Select.Option key={email} value={email}>
                        {email}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="sortBy"
                  label={
                    <span className="flex items-center">
                      排序依据
                      <Tooltip title="选择排序方式">
                        <Image
                          src={exclamation2}
                          alt="exclamation2"
                          width={14}
                          height={14}
                          style={{ marginLeft: "4px" }}
                          preview={false}
                        />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: "请选择排序依据" }]}
                >
                  <Select placeholder="请选择排序方式">
                    {sortOptions.map((option) => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="keyword"
                  label={
                    <span className="flex items-center">
                      采集关键词
                      <Tooltip title="输入要采集的关键词">
                        <Image
                          src={exclamation2}
                          alt="exclamation2"
                          width={14}
                          height={14}
                          style={{ marginLeft: "4px" }}
                          preview={false}
                        />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: "请输入采集关键词" }]}
                >
                  <Input placeholder="请输入采集关键词" />
                </Form.Item>

                <Form.Item
                  name="timeRange"
                  label={
                    <span className="flex items-center">
                      发布时间
                      <Tooltip title="选择发布时间范围">
                        <Image
                          src={exclamation2}
                          alt="exclamation2"
                          width={14}
                          height={14}
                          style={{ marginLeft: "4px" }}
                          preview={false}
                        />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: "请选择发布时间" }]}
                >
                  <Select placeholder="请选择发布时间范围">
                    {timeRanges.map((option) => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="noteCount"
                  label={
                    <span className="flex items-center">
                      采集笔记数量
                      <Tooltip title="选择要采集的笔记数量">
                        <Image
                          src={exclamation2}
                          alt="exclamation2"
                          width={14}
                          height={14}
                          style={{ marginLeft: "4px" }}
                          preview={false}
                        />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: "请选择采集笔记数量" }]}
                >
                  <Select placeholder="请选择采集笔记数量">
                    {noteCounts.map((option) => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <div className="flex space-x-2">
                  <Form.Item
                    name="taskDate"
                    label={
                      <span className="flex items-center">
                        任务日期
                        <Tooltip title="选择任务执行日期（可选）">
                          <Image
                            src={exclamation2}
                            alt="exclamation2"
                            width={14}
                            height={14}
                            style={{ marginLeft: "4px" }}
                            preview={false}
                          />
                        </Tooltip>
                        <span className="text-gray-400 ml-1">(optional)</span>
                      </span>
                    }
                    className="flex-1"
                  >
                    <DatePicker className="w-full" placeholder="2020/05/06" format="YYYY/MM/DD" />
                  </Form.Item>

                  <Form.Item
                    name="taskTime"
                    label={
                      <span className="flex items-center">
                        任务时间
                        <Tooltip title="选择任务执行时间（可选）">
                          <Image
                            src={exclamation2}
                            alt="exclamation2"
                            width={14}
                            height={14}
                            style={{ marginLeft: "4px" }}
                            preview={false}
                          />
                        </Tooltip>
                        <span className="text-gray-400 ml-1">(optional)</span>
                      </span>
                    }
                    className="flex-1"
                  >
                    <TimePicker className="w-full" placeholder="Select time" format="HH:mm" />
                  </Form.Item>
                </div>

                <Form.Item
                  name="noteType"
                  label={
                    <span className="flex items-center">
                      笔记类型
                      <Tooltip title="选择笔记类型">
                        <Image
                          src={exclamation2}
                          alt="exclamation2"
                          width={14}
                          height={14}
                          style={{ marginLeft: "4px" }}
                          preview={false}
                        />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: "请选择笔记类型" }]}
                >
                  <Select placeholder="请选择笔记类型">
                    {noteTypes.map((option) => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            </Form>
          </div>
        );

      case "分析要求":
        return (
          <div className="p-4">
            <Form
              form={form}
              layout="vertical"
              initialValues={unifiedInitialValues}
              onValuesChange={handleFormValuesChange}
            >
              <div className="space-y-6">
                {/* 用户意向等级 */}
                <Form.Item
                  name="userProfileLevel"
                  label={
                    <span className="flex items-center">
                      用户意向等级
                      <Tooltip title="选择用户意向等级">
                        <Image
                          src={exclamation2}
                          alt="exclamation2"
                          width={14}
                          height={14}
                          style={{ marginLeft: "4px" }}
                          preview={false}
                        />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: "请选择用户意向等级" }]}
                >
                  <Checkbox.Group>
                    <div className="flex space-x-4">
                      {intentTypes.map((type) => (
                        <Checkbox key={type.value} value={type.value}>
                          {type.label}
                        </Checkbox>
                      ))}
                    </div>
                  </Checkbox.Group>
                </Form.Item>

                <Form.Item
                  name="profileSentence"
                  label={
                    <span className="flex items-center">
                      输入用户画像
                      <Tooltip title="输入用户画像，例如我是做医美的，想找有意向买面膜的客户">
                        <Image
                          src={exclamation2}
                          alt="exclamation2"
                          width={14}
                          height={14}
                          style={{ marginLeft: "4px" }}
                          preview={false}
                        />
                      </Tooltip>
                    </span>
                  }
                >
                  <Input.TextArea
                    placeholder="例如：品牌，价格，评价，等等"
                    rows={4}
                    maxLength={100}
                    showCount
                  />
                </Form.Item>
              </div>
            </Form>
          </div>
        );

      case "回复模板":
        return (
          <div className="p-4">
            <Form
              form={form}
              layout="vertical"
              initialValues={unifiedInitialValues}
              onValuesChange={handleFormValuesChange}
            >
              <div className="space-y-6">
                {/* 评论区模版 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-base font-medium">评论区模版</h3>
                  </div>

                  <div className="space-y-3">
                    <VirtualList
                      data={commentTemplates}
                      height={300}
                      itemHeight={80}
                      itemKey={(item) => item.id}
                    >
                      {(template: TemplateItem, index: number) => (
                        <div
                          key={template.id}
                          className="flex items-start py-2 border-b border-gray-200"
                        >
                          <div className="flex-grow">
                            <Input.TextArea
                              placeholder="请输入评论模板"
                              autoSize
                              className="flex-grow"
                              value={template.content}
                              onChange={(e) => {
                                updateCommentTemplate(index, { content: e.target.value });
                              }}
                              disabled={!template.isEditing}
                            />
                            {/* Show image preview */}
                            {template.imageUrl && (
                              <div className="mt-2 relative">
                                <Image
                                  src={template.imageUrl}
                                  alt="Template image"
                                  width={100}
                                  height={100}
                                  style={{ objectFit: "cover" }}
                                />
                                {/* Show delete button only in edit mode */}
                                {template.isEditing && (
                                  <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    size="small"
                                    className="absolute top-0 right-0 bg-white bg-opacity-75"
                                    onClick={() => {
                                      updateCommentTemplate(index, { imageUrl: undefined });
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="ml-2 flex items-start">
                            {template.isEditing && (
                              <Upload
                                listType="picture"
                                maxCount={1}
                                beforeUpload={(file) => {
                                  // Store the file for later upload when saving
                                  setCommentImageFile({
                                    index,
                                    file,
                                  });

                                  // Create a preview URL
                                  updateCommentTemplate(index, {
                                    imageUrl: URL.createObjectURL(file),
                                  });

                                  return false; // Prevent auto upload
                                }}
                                showUploadList={false} // Hide the default upload list
                              >
                                <Button
                                  type="text"
                                  icon={<UploadOutlined />}
                                  className="text-blue-500 hover:text-blue-700"
                                  loading={commentUploadLoading}
                                >
                                  上传图片(可选)
                                </Button>
                              </Upload>
                            )}
                            <Button
                              type="text"
                              icon={template.isEditing ? <SaveOutlined /> : <EditOutlined />}
                              onClick={() => toggleCommentTemplateEditMode(template.id)}
                              className={
                                template.isEditing
                                  ? "text-green-500 hover:text-green-700"
                                  : "text-blue-500 hover:text-blue-700"
                              }
                              loading={template.isEditing && commentUploadLoading}
                            >
                              {template.isEditing ? "保存" : "编辑"}
                            </Button>
                            <Button
                              type="text"
                              danger
                              onClick={() => handleDeleteCommentTemplate(template.id)}
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      )}
                    </VirtualList>
                    <div className="flex justify-center">
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          const newId = Date.now().toString(); // 使用时间戳作为唯一ID
                          addCommentTemplate({ id: newId, content: "", isEditing: true });
                        }}
                      >
                        添加模板
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 私信回复模版 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-base font-medium">私信回复模版</h3>
                  </div>

                  <div className="space-y-3">
                    <VirtualList
                      data={messageTemplates}
                      height={150}
                      itemHeight={80}
                      itemKey={(item) => item.id}
                    >
                      {(template: TemplateItem, index: number) => (
                        <div
                          key={template.id}
                          className="flex items-start py-2 border-b border-gray-200"
                        >
                          <div className="flex-grow">
                            <Input.TextArea
                              placeholder="请输入私信模板"
                              autoSize
                              className="flex-grow"
                              value={template.content}
                              onChange={(e) => {
                                updateMessageTemplate(index, { content: e.target.value });
                              }}
                              disabled={!template.isEditing}
                            />
                            {/* Show image preview */}
                            {template.imageUrl && (
                              <div className="mt-2 relative">
                                <Image
                                  src={template.imageUrl}
                                  alt="Template image"
                                  width={100}
                                  height={100}
                                  style={{ objectFit: "cover" }}
                                />
                                {/* Show delete button only in edit mode */}
                                {template.isEditing && (
                                  <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    size="small"
                                    className="absolute top-0 right-0 bg-white bg-opacity-75"
                                    onClick={() => {
                                      updateMessageTemplate(index, { imageUrl: undefined });
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="ml-2 flex items-start">
                            {template.isEditing && (
                              <Upload
                                listType="picture"
                                maxCount={1}
                                beforeUpload={(file) => {
                                  // Convert file to base64 for persistent storage
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    const base64Url = e.target?.result as string;
                                    updateMessageTemplate(index, {
                                      imageUrl: base64Url,
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                  return false; // Prevent auto upload
                                }}
                                showUploadList={false} // Hide the default upload list
                              >
                                <Button
                                  type="text"
                                  icon={<UploadOutlined />}
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  上传图片(可选)
                                </Button>
                              </Upload>
                            )}
                            <Button
                              type="text"
                              icon={template.isEditing ? <SaveOutlined /> : <EditOutlined />}
                              onClick={() => toggleMessageTemplateEditMode(template.id)}
                              className={
                                template.isEditing
                                  ? "text-green-500 hover:text-green-700"
                                  : "text-blue-500 hover:text-blue-700"
                              }
                            >
                              {template.isEditing ? "保存" : "编辑"}
                            </Button>
                            <Button
                              type="text"
                              danger
                              onClick={() => handleDeleteMessageTemplate(template.id)}
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      )}
                    </VirtualList>
                    <div className="flex justify-center">
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          const newId = (messageTemplates.length + 1).toString();
                          addMessageTemplate({ id: newId, content: "", isEditing: true });
                        }}
                      >
                        添加模板
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Form>
          </div>
        );

      default:
        return null;
    }
  };

  // Custom dot render function with popover
  const customDot: StepsProps["progressDot"] = (dot, { status, index }) => (
    <Popover content={<span>{steps[index]?.title || ""}</span>}>{dot}</Popover>
  );

  // Render step indicators using Ant Design Steps component with dots
  const renderStepIndicators = () => {
    const currentIndex = steps.findIndex((step) => step.key === currentStep);

    return (
      <div className="mb-8">
        <Steps
          current={currentIndex}
          progressDot={customDot}
          items={steps.map((step) => ({
            title: step.title,
          }))}
        />
      </div>
    );
  };
  const addTaskTemplate = async () => {
    const messageKey = "addTaskTemplate";

    // 使用唯一 key 显示加载中消息
    message.loading({
      content: "正在保存任务模板...",
      key: messageKey,
    });

    try {
      //  由于现在有了 onValuesChange 实时同步，store 中的数据就是最新的
      const latestFormData = useDashBoardStore.getState().formData;

      // 为了确保数据最新，也获取一次当前表单的值并合并
      const currentFormValues = form.getFieldsValue(true);

      // 处理日期和时间格式
      const processedFormValues = {
        ...currentFormValues,
        taskDate:
          currentFormValues.taskDate && dayjs.isDayjs(currentFormValues.taskDate)
            ? currentFormValues.taskDate.format("YYYY-MM-DD")
            : currentFormValues.taskDate,
        taskTime:
          currentFormValues.taskTime && dayjs.isDayjs(currentFormValues.taskTime)
            ? currentFormValues.taskTime.format("HH:mm")
            : currentFormValues.taskTime,
      };

      //  合并 store 数据和当前表单数据，确保获取最新的完整数据
      const completeFormData = {
        ...latestFormData,
        ...processedFormValues,
      };

      // 构建任务模板内容（包含表单数据和模板数据）
      const templateContent = {
        ...completeFormData,
        commentTemplates: commentTemplates,
        messageTemplates: messageTemplates,
        currentStep: currentStep,
      };
      console.log("🔍 完整的任务模板内容:", templateContent);
      const templateIds = commentTemplates.map((template) => Number(template.id));
      const content = {
        userInfo: templateContent.targetEmail,
        keyword: templateContent.keyword,
        max_notes: templateContent.noteCount,
        // max_comments: 15,
        note_type: templateContent.noteType,
        time_range: templateContent.timeRange,
        // search_scope: templateContent.searchScope,
        sort_by: templateContent.sortBy,
        profile_sentence: templateContent.profileSentence,
        template_ids: templateIds,
        intent_type: templateContent.userProfileLevel,
      };
      console.log("🔍 上传参数:", content);
      const response = await addTaskTemplateAPI(content);

      if (response.code === 0) {
        // 使用相同的 key 更新消息为成功状态
        message.success({
          content: "任务模板保存成功！",
          key: messageKey,
          duration: 2,
        });

        setTimeout(() => {
          onClose();
          clearSavedProgress();
          resetForm();
        }, 1000);
      } else {
        // 使用相同的 key 更新消息为错误状态
        message.error({
          content: response.message || "保存任务模板失败",
          key: messageKey,
          duration: 2,
        });
      }
    } catch (error) {
      // 使用相同的 key 更新消息为错误状态
      message.error({
        content: "保存任务模板失败，请重试",
        key: messageKey,
        duration: 2,
      });
    }
  };
  return (
    <Modal
      title="创建任务"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
      closeIcon={<span className="text-xl">×</span>}
    >
      {renderStepIndicators()}
      {renderStepContent()}

      <div className="flex justify-end p-2 border-t border-gray-100">
        <div className="flex space-x-2">
          {currentStep === "回复模板" && (
            <Button
              onClick={addTaskTemplate}
              className="border border-gray-300 rounded"
              style={{ backgroundColor: "white" }}
            >
              保存为任务模版
            </Button>
          )}
          <Button
            onClick={handleSaveProgress}
            className="border border-gray-300 rounded"
            style={{ backgroundColor: "white" }}
          >
            保存当前进度
          </Button>
          {currentStep !== "采集任务" && (
            <Button
              onClick={handlePrevStep}
              className="border border-gray-300 rounded"
              style={{ backgroundColor: "white" }}
            >
              上一步
            </Button>
          )}
          <Button
            type="primary"
            onClick={currentStep === "回复模板" ? handleFinish : handleNextStep}
            className="rounded"
            style={{
              border: "1px solid #8389FC",
              background: "linear-gradient(135deg, #8389FC, #D477E1)",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #D477E1, #8389FC)";
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #8389FC, #D477E1)";
            }}
          >
            {currentStep === "回复模板" ? "提交任务" : "下一步"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateTaskModal;
