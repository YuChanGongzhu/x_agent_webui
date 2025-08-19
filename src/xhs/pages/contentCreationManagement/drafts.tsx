import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  List,
  Typography,
  Space,
  Tag,
  Tooltip,
  Form,
  Input,
  Select,
  Upload,
  Image,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  LoadingOutlined,
  CloseOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import { useUserStore } from "../../../store/userStore";
import { getNoteApi, deleteNoteApi, updateNoteApi } from "../../../api/mysql";
import { triggerDagRun } from "../../../api/airflow";
import { useMessage } from "./components/message";
import AddNewTaskModal from "./components/AddNewTaskModal";
import { tencentCOSService } from "../../../api/tencent_cos";
import { CONSTANTS } from "./constants";
const { Text } = Typography;

type FileType = Parameters<NonNullable<UploadProps["beforeUpload"]>>[0];

// 工具函数：将文件转换为base64
const getBase64 = (file: FileType): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

// 解析话题字符串为数组
const parseTopics = (topicString: string): string[] => {
  if (!topicString || typeof topicString !== "string") return [];
  return topicString
    .split(CONSTANTS.TOPIC_SEPARATOR_REGEX)
    .map((topic) => topic.trim())
    .filter((topic) => topic.length > 0);
};

// 格式化话题数组为显示字符串
const formatTopicsForDisplay = (topics: string[]): string => {
  return topics.join(", ");
};

// 解析@用户字符串为数组
const parseAtUsers = (userString: string): string[] => {
  if (!userString || typeof userString !== "string") return [];
  return userString
    .split(CONSTANTS.TOPIC_SEPARATOR_REGEX)
    .map((user) => user.trim())
    .filter((user) => user.length > 0);
};

// 安全解析@用户JSON字符串
const safeParseAtUsers = (atUsersJson: string): string[] => {
  if (!atUsersJson || typeof atUsersJson !== "string") return [];
  try {
    const parsed = JSON.parse(atUsersJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

// 格式化@用户数组为显示字符串
const formatAtUsersForDisplay = (users: string[]): string => {
  if (!Array.isArray(users)) return "";
  return users.join(", ");
};

const Drafts = () => {
  const navigate = useNavigate();
  const { email, userDeviceNickNameList } = useUserStore();
  const message = useMessage();
  const [draftList, setDraftList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddNewTask, setShowAddNewTask] = useState(false);

  // 编辑相关状态
  const [editingDraft, setEditingDraft] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 获取草稿数据
  const fetchDraftList = useCallback(async () => {
    if (!email) return;

    try {
      setLoading(true);
      const res = await getNoteApi({
        email,
        action: "get_all",
      });
      console.log("草稿数据:", res);
      if (res.data && res.data.templates) {
        // 筛选出status为0的草稿数据
        const drafts = res.data.templates.filter((note: any) => note.status === 0);
        setDraftList(drafts);
      }
    } catch (error) {
      console.error("获取草稿数据失败:", error);
      message.error("获取草稿数据失败");
    } finally {
      setLoading(false);
    }
  }, [email]); // 保持 email 依赖

  // 初始化获取草稿数据 - 直接依赖 email 避免循环
  useEffect(() => {
    if (email) {
      fetchDraftList();
    }
  }, [email]); // 直接依赖 email，避免 fetchDraftList 的循环依赖

  // 删除草稿
  const handleDelete = async (draftId: number) => {
    try {
      const res = await deleteNoteApi({ id: draftId.toString() });
      console.log("删除草稿结果:", res);
      if (res.code === 0 && res.message === "success") {
        message.success("删除草稿成功");
        // 刷新草稿列表
        fetchDraftList();
      } else {
        message.error("删除草稿失败");
      }
    } catch (error) {
      console.error("删除草稿出错:", error);
      message.error("删除草稿出错，请稍后重试");
    }
  };

  // 编辑草稿
  const handleEdit = (draft: any) => {
    console.log("编辑草稿:", draft);
    console.log("草稿字段详情:", {
      note_tags: draft.note_tags,
      note_tags_list: draft.note_tags_list,
      at_users: draft.at_users,
      note_at_users: draft.note_at_users,
      visiable_scale: draft.visiable_scale,
      note_visit_scale: draft.note_visit_scale,
      img_list: draft.img_list,
    });
    setEditingDraft(draft);

    // 解析现有数据 - 修复字段名匹配
    const existingTopics =
      draft.note_tags || draft.note_tags_list
        ? (() => {
            const tagsData = draft.note_tags || draft.note_tags_list;
            if (Array.isArray(tagsData)) {
              return tagsData;
            }
            try {
              return JSON.parse(tagsData || "[]");
            } catch {
              return [];
            }
          })()
        : [];

    const existingAtUsers = safeParseAtUsers(draft.at_users || draft.note_at_users || "[]");

    // 设置表单初始值 - 修复字段名匹配
    editForm.setFieldsValue({
      title: draft.title || "",
      content: draft.content || "",
      account: draft.author || "",
      visibility: draft.visiable_scale || draft.note_visit_scale || draft.visibility || "",
      topic: formatTopicsForDisplay(existingTopics),
      user: formatAtUsersForDisplay(existingAtUsers),
    });

    // 解析图片列表
    if (draft.img_list) {
      console.log("原始图片列表数据:", draft.img_list);
      let imageUrls: string[] = [];

      try {
        // 尝试解析JSON格式的图片列表
        const parsed = JSON.parse(draft.img_list);
        console.log("JSON解析结果:", parsed);
        if (Array.isArray(parsed)) {
          imageUrls = parsed.filter((url: string) => url && url.trim());
        } else {
          // 如果不是数组，可能是单个字符串
          imageUrls = [parsed].filter((url: string) => url && url.trim());
        }
      } catch (error) {
        // 如果JSON解析失败，尝试按逗号分割（兼容旧格式）
        console.warn("图片列表JSON解析失败，尝试按逗号分割:", error);
        imageUrls = draft.img_list.split(",").filter((url: string) => url.trim());
      }

      console.log("解析后的图片URLs:", imageUrls);

      const initialFileList = imageUrls.map((url: string, index: number) => {
        const fullUrl = url.startsWith("http")
          ? url
          : `https://xhs-notes-resources-1347723456.cos.ap-guangzhou.myqcloud.com/${encodeURI(
              url
            )}`;

        console.log(`图片${index + 1}: ${url} -> ${fullUrl}`);

        return {
          uid: `existing-${index}`,
          name: `image-${index}.jpg`,
          status: "done" as const,
          url: fullUrl,
        };
      });

      console.log("最终文件列表:", initialFileList);
      setFileList(initialFileList);
    } else {
      console.log("没有图片列表数据");
      setFileList([]);
    }
  };

  // 关闭编辑面板
  const handleCloseEdit = () => {
    setEditingDraft(null);
    setFileList([]);
    editForm.resetFields();
  };

  // 格式化时间显示
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "-";
    const date = new Date(timeStr);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 图片预览处理
  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as FileType);
    }
    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
  };

  // 文件上传前的验证
  const beforeUpload = (file: FileType) => {
    const isValidType = CONSTANTS.SUPPORTED_IMAGE_TYPES.includes(file.type as any);
    if (!isValidType) {
      message.error("只能上传 JPG/PNG/GIF 格式的图片!");
      return false;
    }

    const isLtMaxSize = file.size / 1024 / 1024 < CONSTANTS.MAX_FILE_SIZE;
    if (!isLtMaxSize) {
      message.error(`图片大小不能超过 ${CONSTANTS.MAX_FILE_SIZE}MB!`);
      return false;
    }

    return true;
  };

  // 模拟上传逻辑
  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;

    try {
      setUploading(true);
      const currentAccount = editForm.getFieldValue("account");

      if (!currentAccount) {
        message.error("请先选择发布账号！");
        onError(new Error("请先选择发布账号"));
        setUploading(false);
        return;
      }

      let percent = 0;
      const timer = setInterval(() => {
        percent += 20;
        onProgress({ percent });
        if (percent >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            const response = {
              url: URL.createObjectURL(file),
              name: file.name,
              serverPath: `${email}/${currentAccount}/${file.name}`,
              status: "ready",
            };
            onSuccess(response);
            message.success(`${file.name} 准备就绪，将在保存时上传！`);
            setUploading(false);
          }, 300);
        }
      }, 100);
    } catch (error) {
      console.error("准备上传失败:", error);
      onError(error);
      message.error(`${file.name} 准备失败！`);
      setUploading(false);
    }
  };

  // 文件列表变化处理
  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  // 删除文件处理
  const handleRemove = (file: UploadFile) => {
    const newFileList = fileList.filter((item) => item.uid !== file.uid);
    setFileList(newFileList);
    message.success("图片删除成功！");
  };

  // 实际上传图片到COS的方法
  const uploadImagesToCOS = async (fileList: UploadFile[], account: string): Promise<string[]> => {
    if (!fileList.length || !account || !email) return [];

    console.log(`开始上传 ${fileList.length} 张图片到COS...`);

    const uploadPromises = fileList.map(async (file) => {
      try {
        // 如果是已存在的图片（从草稿中加载的），直接返回路径
        if (file.uid.startsWith("existing-")) {
          const url = file.url || "";
          if (url.includes("myqcloud.com/")) {
            return url.split("myqcloud.com/")[1];
          }
          return url;
        }

        if (!file.originFileObj) {
          throw new Error(`文件 ${file.name} 缺少原始文件对象`);
        }

        const uploadPath = `${email}/${account}`;
        const cosService = tencentCOSService;
        await cosService.uploadFile(
          file.originFileObj as File,
          uploadPath,
          undefined,
          "xhs-notes-resources-1347723456"
        );

        return `${email}/${account}/${file.name}`;
      } catch (error) {
        console.error(`${file.name} 上传失败:`, error);
        throw error;
      }
    });

    try {
      const uploadedPaths = await Promise.all(uploadPromises);
      console.log("所有图片上传完成，使用自定义路径格式:", uploadedPaths);
      return uploadedPaths;
    } catch (error) {
      console.error("图片上传过程中出现错误:", error);
      throw error;
    }
  };

  // 提交笔记（触发DAG任务）
  const handleSubmitNote = async () => {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
    const escapedEmail = (email || "").replace(/@/g, "_at_").replace(/\./g, "_dot_");
    const dag_run_id = "notes_publish_" + escapedEmail + "_" + timestamp;
    try {
      setSubmitting(true);
      const values = await editForm.validateFields();

      if (!editingDraft) {
        message.error("没有正在编辑的草稿");
        return;
      }

      // 上传图片到COS
      let finalImageUrls = "";
      if (fileList.length > 0) {
        try {
          message.loading({ content: "正在上传图片...", key: "uploading", duration: 0 });
          const uploadedPaths = await uploadImagesToCOS(fileList, values.account);
          // 将图片路径数组转换为JSON字符串格式，与后端期望的格式一致
          finalImageUrls = JSON.stringify(uploadedPaths);
          message.success({ content: "图片上传完成！", key: "uploading", duration: 2 });
        } catch (error) {
          message.error({ content: "图片上传失败，请重试", key: "uploading", duration: 3 });
          return;
        }
      }

      // 处理话题和@用户数据
      const topicsArray = parseTopics(values.topic || "");
      const usersArray = parseAtUsers(values.user || "");
      const params = {
        template_id: editingDraft.id || "",
        email: email || "",
        title: values.title || "",
        content: values.content || "",
        author: values.account || "",
        device_id: values.device_id || "",
        img_list: finalImageUrls,
        status: 2,
        at_users: JSON.stringify(usersArray),
        note_tags: JSON.stringify(topicsArray),
      };
      const updateResult = await updateNoteApi(params);

      if (updateResult.code === 0 && updateResult.message === "success") {
        message.success("笔记提交成功！");

        const conf = {
          email: email,
          device_id: values.device_id || "",
          note_title: values.title || "",
          note_content: values.content || "",
          note_tags_list: topicsArray,
          note_at_users: JSON.stringify(usersArray),
          note_visit_scale: values.visibility,
        };

        const promise = triggerDagRun("notes_publish", dag_run_id, conf);
        promise
          .then(() => {
            message.success("任务创建成功" + dag_run_id);
            // 重置状态
            handleCloseEdit();
            fetchDraftList();
          })
          .catch((err) => {
            console.log("创建dag任务失败", err);
          });
      }
    } catch (error) {
      console.error("提交笔记失败:", error);
      message.error("提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  // 保存草稿编辑
  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      const values = await editForm.validateFields();

      if (!editingDraft) {
        message.error("没有正在编辑的草稿");
        return;
      }

      // 上传图片到COS
      let finalImageUrls = "";
      if (fileList.length > 0) {
        try {
          message.loading({ content: "正在上传图片...", key: "uploading", duration: 0 });
          const uploadedPaths = await uploadImagesToCOS(fileList, values.account);
          // 将图片路径数组转换为JSON字符串格式，与后端期望的格式一致
          finalImageUrls = JSON.stringify(uploadedPaths);
          message.success({ content: "图片上传完成！", key: "uploading", duration: 2 });
        } catch (error) {
          message.error({ content: "图片上传失败，请重试", key: "uploading", duration: 3 });
          return;
        }
      }

      // 处理话题和@用户数据
      const topicsArray = parseTopics(values.topic || "");
      const usersArray = parseAtUsers(values.user || "");
      const params = {
        template_id: editingDraft.id || "",
        email: email || "",
        title: values.title || "",
        content: values.content || "",
        author: values.account || "",
        device_id: values.device_id || "",
        img_list: finalImageUrls,
        status: 0,
        at_users: JSON.stringify(usersArray),
        note_tags: JSON.stringify(topicsArray),
      };
      console.log("保存前入的参数params", params);
      const response = await updateNoteApi(params);

      if (response.code === 0 && response.message === "success") {
        message.success("草稿保存成功！");
        handleCloseEdit();
        fetchDraftList();
      } else {
        message.error("保存草稿失败");
      }
    } catch (error) {
      console.error("保存草稿失败:", error);
      message.error("保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  const handleModalSuccess = () => {
    // 提交完笔记后刷新笔记列表（回到第一页，显示loading）
    fetchDraftList();
  };

  const uploadButton = (
    <button
      style={{
        border: 0,
        background: "none",
        cursor: uploading ? "not-allowed" : "pointer",
        opacity: uploading ? 0.6 : 1,
      }}
      type="button"
      disabled={uploading}
    >
      <PlusOutlined />
      <div style={{ marginTop: 8, fontSize: "14px", color: "#666" }}>
        {uploading ? "上传中..." : "上传图片"}
      </div>
    </button>
  );

  return (
    <div
      style={{
        height: "100%", // 关键：使用父容器高度，避免与 main 高度冲突
        backgroundColor: "#f5f5f5",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden", // 不让页面本身产生滚动
      }}
    >
      {/* 页面头部 - 固定在顶部 */}
      <div
        style={{
          background: "white",
          padding: "16px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          zIndex: 10,
          flexShrink: 0,
          boxSizing: "border-box",
          height: "64px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/xhs/dashboard/contentCreationManagement")}
              type="text"
            />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>草稿箱</h2>
          </div>
          <Button
            type="primary"
            icon={userDeviceNickNameList.length > 0 ? <PlusOutlined /> : <LoadingOutlined />}
            disabled={userDeviceNickNameList.length === 0}
            onClick={() => {
              console.log("点击添加新笔记");
              setShowAddNewTask(true);
            }}
          >
            添加新笔记
          </Button>
        </div>
      </div>

      {/* 主内容区 - 左右分栏布局 */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          flex: 1, // 占据剩余空间
          padding: "16px",
          overflow: "hidden", // 防止内容溢出到父容器
          boxSizing: "border-box",
          minHeight: 0, // 允许子项按需收缩
        }}
      >
        {/* 左侧草稿列表 */}
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            width: editingDraft ? "40%" : "100%",
            transition: "width 0.3s ease",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* 列表标题 */}
          <div
            style={{
              padding: "16px 16px 8px 16px",
              borderBottom: "1px solid #f0f0f0",
              flexShrink: 0,
            }}
          >
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>草稿列表</h3>
          </div>

          {/* 可滚动的列表内容 */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "0 16px",
            }}
          >
            <List
              loading={loading}
              dataSource={draftList}
              locale={{ emptyText: "暂无草稿" }}
              renderItem={(item) => (
                <List.Item
                  style={{
                    padding: "16px 0",
                    borderBottom: "1px solid #f0f0f0",
                    backgroundColor: editingDraft?.id === item.id ? "#f6ffed" : "transparent",
                    borderRadius: "4px",
                    marginBottom: "4px",
                  }}
                  actions={[
                    <Tooltip title="编辑" key="edit">
                      <Button
                        type={editingDraft?.id === item.id ? "primary" : "text"}
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(item)}
                        size="small"
                      />
                    </Tooltip>,
                    <Tooltip title="删除" key="delete">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(item.id)}
                        size="small"
                      />
                    </Tooltip>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Text strong style={{ fontSize: "16px" }}>
                          {item.title || "未命名草稿"}
                        </Text>
                        <Tag color={editingDraft?.id === item.id ? "green" : "blue"}>
                          {editingDraft?.id === item.id ? "编辑中" : "草稿"}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <Text type="secondary" style={{ display: "block", marginBottom: "8px" }}>
                          {item.content
                            ? item.content.length > 100
                              ? item.content.substring(0, 100) + "..."
                              : item.content
                            : "暂无内容"}
                        </Text>
                        <Space size="large">
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            创建时间: {formatTime(item.created_at)}
                          </Text>
                          {item.author && (
                            <Text type="secondary" style={{ fontSize: "12px" }}>
                              作者: {item.author}
                            </Text>
                          )}
                        </Space>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        </div>

        {/* 右侧编辑面板 */}
        {editingDraft && (
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              width: "60%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            {/* 编辑面板头部 - 固定 */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#fafafa",
                flexShrink: 0,
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>编辑草稿</h3>
              <Button icon={<CloseOutlined />} onClick={handleCloseEdit} type="text" />
            </div>

            {/* 编辑面板内容 - 可滚动 */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {/* 选择账号 */}
                <Form form={editForm} layout="vertical" onFinish={handleSaveEdit}>
                  <Form.Item
                    label="选择小红书账号"
                    name="account"
                    rules={[{ required: true, message: "请选择发布账号" }]}
                  >
                    <Select placeholder="请选择要发布的账号" size="large">
                      {userDeviceNickNameList.map((item, index) => {
                        if (typeof item === "object" && item !== null) {
                          const entries = Object.entries(item);
                          if (entries.length > 0) {
                            const [deviceId, nickname] = entries[0];
                            return (
                              <Select.Option key={index} value={nickname as string}>
                                📱 {nickname as string}
                              </Select.Option>
                            );
                          }
                        }
                        if (typeof item === "string") {
                          return (
                            <Select.Option key={index} value={item}>
                              📱 {item}
                            </Select.Option>
                          );
                        }
                        return null;
                      })}
                    </Select>
                  </Form.Item>

                  {/* 内容编辑区域 */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                    }}
                  >
                    {/* 图片上传区域 */}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 600 }}>
                        图片管理
                      </h4>
                      <div className="upload-container">
                        <Upload
                          customRequest={handleUpload}
                          listType="picture-card"
                          fileList={fileList}
                          onPreview={handlePreview}
                          onChange={handleChange}
                          onRemove={handleRemove}
                          beforeUpload={beforeUpload}
                          multiple
                          accept="image/*"
                          showUploadList={{
                            showPreviewIcon: true,
                            showRemoveIcon: true,
                            showDownloadIcon: false,
                          }}
                        >
                          {fileList.length >= CONSTANTS.MAX_IMAGE_COUNT ? null : uploadButton}
                        </Upload>
                      </div>
                      {/* 图片预览模态框 */}
                      {previewImage && (
                        <Image
                          wrapperStyle={{ display: "none" }}
                          preview={{
                            visible: previewOpen,
                            onVisibleChange: (visible) => setPreviewOpen(visible),
                            afterOpenChange: (visible) => !visible && setPreviewImage(""),
                          }}
                          src={previewImage}
                        />
                      )}
                    </div>

                    {/* 表单编辑区域 */}
                    <div style={{ flex: 1 }}>
                      <Form.Item
                        label="标题"
                        name="title"
                        rules={[
                          { required: true, message: "请输入笔记标题" },
                          {
                            max: CONSTANTS.MAX_TITLE_LENGTH,
                            message: `标题不能超过${CONSTANTS.MAX_TITLE_LENGTH}个字符`,
                          },
                        ]}
                      >
                        <Input.TextArea
                          showCount
                          maxLength={CONSTANTS.MAX_TITLE_LENGTH}
                          placeholder="请输入吸引人的笔记标题..."
                          autoSize={{ minRows: 2, maxRows: 3 }}
                        />
                      </Form.Item>

                      <Form.Item
                        label="正文内容"
                        name="content"
                        rules={[
                          { required: true, message: "请输入笔记内容" },
                          {
                            max: CONSTANTS.MAX_CONTENT_LENGTH,
                            message: `内容不能超过${CONSTANTS.MAX_CONTENT_LENGTH}个字符`,
                          },
                        ]}
                      >
                        <Input.TextArea
                          showCount
                          maxLength={CONSTANTS.MAX_CONTENT_LENGTH}
                          placeholder="分享你的想法和体验..."
                          autoSize={{ minRows: 6, maxRows: 10 }}
                        />
                      </Form.Item>

                      <Form.Item
                        label="可见范围"
                        name="visibility"
                        rules={[{ required: true, message: "请选择可见范围" }]}
                      >
                        <Select placeholder="请选择可见范围">
                          <Select.Option value="公开可见">🌍 公开可见</Select.Option>
                          <Select.Option value="仅自己可见">🔒 仅自己可见</Select.Option>
                          <Select.Option value="仅互关好友可见">👥 仅互关好友可见</Select.Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        label="#话题"
                        name="topic"
                        extra={
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            多个话题请用逗号分隔，如：美食,生活,推荐
                          </div>
                        }
                      >
                        <Input.TextArea
                          showCount
                          placeholder="添加相关话题，增加曝光度..."
                          autoSize={{ minRows: 1, maxRows: 2 }}
                        />
                      </Form.Item>

                      <Form.Item
                        label="@用户"
                        name="user"
                        extra="@好友一起互动，多个用户请用逗号分隔"
                      >
                        <Input.TextArea
                          showCount
                          placeholder="@你想要互动的用户，多个用户用逗号分隔..."
                          autoSize={{ minRows: 1, maxRows: 2 }}
                        />
                      </Form.Item>
                    </div>
                  </div>
                </Form>
              </div>
            </div>

            {/* 固定在底部的按钮区域 */}
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid #f0f0f0",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                backgroundColor: "#fafafa",
                flexShrink: 0,
              }}
            >
              <Button onClick={handleCloseEdit}>取消</Button>
              <Button icon={<SaveOutlined />} loading={saving} onClick={handleSaveEdit}>
                保存草稿
              </Button>
              <Button type="primary" loading={submitting} onClick={handleSubmitNote}>
                {submitting ? "提交中..." : "提交笔记"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 添加新任务弹窗 */}
      <AddNewTaskModal
        visible={showAddNewTask}
        isDraft={true}
        onClose={() => setShowAddNewTask(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default Drafts;
