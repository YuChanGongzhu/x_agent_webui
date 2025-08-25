import React, { useState } from "react";
import { Form, Input, Select, Upload, Button, Image, Checkbox } from "antd";
import type { UploadFile, UploadProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useUserStore } from "../../../../store/userStore";
import { beautifyNoteContentApi } from "../../../../api/mysql";
import { NoteFormData } from "../types";
import { CONSTANTS } from "../constants";
import ProgressSteps from "./ProgressSteps";
import styles from "./AddNewTaskContent.module.css";
import { useMessage } from "../../../../components/message";

type FileType = Parameters<NonNullable<UploadProps["beforeUpload"]>>[0];

interface AddNewTaskContentProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  onDataChange: (data: Partial<NoteFormData>) => void;
  noteData: Partial<NoteFormData>;
  fileList: UploadFile[];
  setFileList: (fileList: UploadFile[]) => void;
}

// 工具函数：将文件转换为base64
const getBase64 = (file: FileType): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
// 使用 constants 中的真实 xiaohongshu 联动数据
type IndustryKey = keyof typeof CONSTANTS.INDUSTRY;
const AddNewTaskContent: React.FC<AddNewTaskContentProps> = ({
  currentStep,
  setCurrentStep,
  onDataChange,
  noteData,
  fileList,
  setFileList,
}) => {
  const { email, userDeviceNickNameList } = useUserStore();
  const message = useMessage();
  const [form] = Form.useForm();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [aiBeautifying, setAiBeautifying] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<string>(noteData.note_user_type || "");
  // xiaohongshu 联动选择器（来自 constants.INDUSTRY）
  const industryCategories = Object.keys(CONSTANTS.INDUSTRY || {}) as string[];
  const defaultIndustryPrimary = noteData.industry_primary || (industryCategories[0] as string);
  const defaultIndustrySecondary =
    noteData.industry_secondary ||
    (CONSTANTS.INDUSTRY?.[defaultIndustryPrimary as IndustryKey] || [])[0];
  const [industryPrimary, setIndustryPrimary] = useState<string>(defaultIndustryPrimary);
  const [industrySecondary, setIndustrySecondary] = useState<string>(defaultIndustrySecondary);
  // 标签选项（与UI一致）
  const titleTagOptions = [
    "默认",
    "角色代入",
    "通俗口语",
    "提问式",
    "前后对比",
    "名人效应",
    "干货攻略",
    "避雷种草",
    "实时热词",
  ];

  const contentTagOptions = [
    "默认",
    "植入",
    "特色单品/服务",
    "优惠套餐",
    "活动节日",
    "新店开业",
    "店铺环境",
    "地方特色",
    "品牌故事",
  ];

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
    console.log("查看文件格式", file);

    // 检查文件类型
    const isValidType = CONSTANTS.SUPPORTED_FILE_TYPES.includes(file.type as any);
    if (!isValidType) {
      message.error("只能上传 JPG/PNG 格式的图片或 MP4 格式的视频!");
      return Upload.LIST_IGNORE;
    }

    // 检查文件大小
    const isLtMaxSize = file.size / 1024 / 1024 < CONSTANTS.MAX_FILE_SIZE;
    if (!isLtMaxSize) {
      message.error(`文件大小不能超过 ${CONSTANTS.MAX_FILE_SIZE}MB!`);
      return Upload.LIST_IGNORE;
    }

    // 检查文件数量限制
    const isImage = CONSTANTS.SUPPORTED_IMAGE_TYPES.includes(file.type as any);
    const isVideo = CONSTANTS.SUPPORTED_VIDEO_TYPES.includes(file.type as any);
    console.log("fileList", fileList);
    const currentImages = fileList.filter(
      (f) => f.type && CONSTANTS.SUPPORTED_IMAGE_TYPES.includes(f.type as any)
    );
    const currentVideos = fileList.filter(
      (f) => f.type && CONSTANTS.SUPPORTED_VIDEO_TYPES.includes(f.type as any)
    );

    if (isVideo) {
      // 如果上传视频，检查是否已有视频或图片
      if (currentVideos.length >= CONSTANTS.MAX_VIDEO_COUNT) {
        message.error("最多只能上传1个视频!");
        return Upload.LIST_IGNORE;
      }
      if (currentImages.length > 0) {
        message.error("上传视频时不能同时上传图片!");
        return Upload.LIST_IGNORE;
      }
    }

    if (isImage) {
      // 如果上传图片，检查是否已有视频或图片数量是否超限
      if (currentVideos.length > 0) {
        message.error("上传图片时不能同时上传视频!");
        return Upload.LIST_IGNORE;
      }
      if (currentImages.length >= CONSTANTS.MAX_IMAGE_COUNT) {
        message.error(`最多只能上传${CONSTANTS.MAX_IMAGE_COUNT}张图片!`);
        return Upload.LIST_IGNORE;
      }
    }

    return true;
  };

  // 文件列表变化处理
  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    const imagePaths = generateImagePaths(newFileList);
    const hasVideo = newFileList.some(
      (f) => f.type && CONSTANTS.SUPPORTED_VIDEO_TYPES.includes(f.type as any)
    );
    onDataChange({ images: imagePaths, note_type: hasVideo ? "video" : "image" });
  };

  // 生成图片路径字符串
  const generateImagePaths = (fileList: UploadFile[], account?: string) => {
    if (!email) return "";
    const currentAccount = account || noteData.account;
    if (!currentAccount) return "";
    const successfulFiles = fileList.filter((file) => file.status === "done" && file.name);
    const paths = successfulFiles.map((file) => `${email}/${currentAccount}/${file.name}`);
    return paths.join(",");
  };

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

  // 模拟上传逻辑
  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;

    try {
      setUploading(true);

      if (!noteData.account) {
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
              serverPath: `${email}/${noteData.account}/${file.name}`,
              status: "ready",
            };
            onSuccess(response);
            message.success(`${file.name} 准备就绪，将在提交时上传！`);
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

  // 删除文件处理
  const handleRemove = (file: UploadFile) => {
    const newFileList = fileList.filter((item) => item.uid !== file.uid);
    setFileList(newFileList);
    const isVideo = file.type && CONSTANTS.SUPPORTED_VIDEO_TYPES.includes(file.type as any);
    message.success(isVideo ? "视频删除成功！" : "图片删除成功！");
    const stillHasVideo = newFileList.some(
      (f) => f.type && CONSTANTS.SUPPORTED_VIDEO_TYPES.includes(f.type as any)
    );
    onDataChange({ note_type: stillHasVideo ? "video" : "image" });
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
        {uploading
          ? "上传中..."
          : (() => {
              const currentImages = fileList.filter(
                (f) => f.type && CONSTANTS.SUPPORTED_IMAGE_TYPES.includes(f.type as any)
              );
              const currentVideos = fileList.filter(
                (f) => f.type && CONSTANTS.SUPPORTED_VIDEO_TYPES.includes(f.type as any)
              );

              if (currentVideos.length > 0) {
                return "已有视频";
              } else if (currentImages.length > 0) {
                return "添加图片";
              } else {
                return "图片/视频";
              }
            })()}
      </div>
    </button>
  );

  const layout = {
    labelCol: { span: 5 },
    wrapperCol: { span: 20 },
  };

  // 表单字段变化处理
  const onFormValuesChange = (changedValues: any, allValues: any) => {
    const updatedData: Partial<NoteFormData> = {};

    if ("title" in changedValues) {
      updatedData.note_title = changedValues.title;
    }
    if ("content" in changedValues) {
      updatedData.note_content = changedValues.content;
    }
    if ("topic" in changedValues) {
      const topicsArray = parseTopics(changedValues.topic);
      updatedData.note_tags_list = topicsArray;
    }
    if ("user" in changedValues) {
      const usersArray = parseAtUsers(changedValues.user);
      updatedData.at_users = JSON.stringify(usersArray);
    }
    if ("visibility" in changedValues) {
      updatedData.visibility = changedValues.visibility;
    }
    if ("note_user_type" in changedValues) {
      updatedData.note_user_type = changedValues.note_user_type;
      setSelectedUserType(changedValues.note_user_type);
    }
    if ("account" in changedValues) {
      updatedData.account = changedValues.account;

      // 查找对应的device_id
      let deviceId = "";
      userDeviceNickNameList.forEach((item) => {
        if (typeof item === "object" && item !== null) {
          const entries = Object.entries(item);
          if (entries.length > 0) {
            const [deviceIdKey, nickname] = entries[0];
            if (nickname === changedValues.account) {
              deviceId = deviceIdKey;
            }
          }
        }
      });

      updatedData.device_id = deviceId;

      // 账号变更时，更新所有图片的路径
      if (fileList.length > 0) {
        const updatedImagePaths = generateImagePaths(fileList, changedValues.account);
        updatedData.images = updatedImagePaths;
        message.info(`已更新 ${fileList.length} 张图片的存储路径`);
      }
    }

    onDataChange(updatedData);
  };

  // 处理清空所有文件
  const handleClearAllFiles = () => {
    setFileList([]);
    onDataChange({ images: "", note_type: "image" });
    message.success("已清空所有文件");
  };

  // xiaohongshu 联动选择器事件
  const handleIndustryPrimaryChange = (value: string) => {
    setIndustryPrimary(value);
    const list = CONSTANTS.INDUSTRY?.[value as IndustryKey] || [];
    const first = list[0];
    setIndustrySecondary(first);
    onDataChange({ industry_primary: value, industry_secondary: first });
  };

  const handleIndustrySecondaryChange = (value: string) => {
    setIndustrySecondary(value);
    onDataChange({ industry_secondary: value });
  };

  // marketing 单选（使用 BLOGGER 数组，无联动）
  const handleMarketingCategoryChange = (value: string) => {
    setIndustryPrimary(value);
    onDataChange({ industry_primary: value });
  };
  // 渲染当前步骤的内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* 选择账号 */}
            <div
              style={{
                paddingTop: "20px",
                paddingRight: "20px",
                border: "1px solid #e8e8e8",
                borderRadius: "8px",
                backgroundColor: "#fafafa",
              }}
            >
              <Form
                {...layout}
                form={form}
                onValuesChange={onFormValuesChange}
                initialValues={{ account: noteData.account }}
              >
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
              </Form>
            </div>

            {/* 笔记类型选择区域 */}
            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>选择笔记类型</h3>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                {CONSTANTS.NOTE_TYPES.map((noteType) => (
                  <div
                    key={noteType.value}
                    style={{
                      flex: 1,
                      minWidth: "200px",
                    }}
                  >
                    <Checkbox
                      checked={selectedUserType === noteType.value}
                      onChange={() => {
                        setSelectedUserType(noteType.value);
                        onDataChange({ note_user_type: noteType.value });
                      }}
                      style={{
                        fontSize: "14px",
                        fontWeight: selectedUserType === noteType.value ? "600" : "normal",
                      }}
                    >
                      <span style={{ marginRight: "8px" }}>{noteType.icon}</span>
                      {noteType.label}
                    </Checkbox>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "12px", color: "#666", margin: "12px 0 0 0" }}>
                请选择一种笔记类型，每次只能选择一种类型
              </p>
            </div>

            {/* 图片和现在类型区域 */}
            {noteData.account && (
              <div className={styles.card}>
                <div style={{ marginBottom: "20px" }}>
                  <h3 className={styles.sectionTitle}>添加媒体文件</h3>
                  <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                    最多可上传{CONSTANTS.MAX_IMAGE_COUNT}
                    张图片或一个视频，视频支持MP4格式，图片支持JPG、PNG格式，单张图片不超过
                    {CONSTANTS.MAX_FILE_SIZE}
                    MB，视频不超过{CONSTANTS.MAX_FILE_SIZE}MB
                  </p>
                </div>
                <div className={styles.uploadContainer}>
                  <Upload
                    customRequest={handleUpload}
                    listType="picture-card"
                    fileList={fileList}
                    onPreview={handlePreview}
                    onChange={handleChange}
                    onRemove={handleRemove}
                    beforeUpload={beforeUpload}
                    multiple
                    accept={CONSTANTS.SUPPORTED_FILE_TYPES.join(",")}
                    showUploadList={{
                      showPreviewIcon: true,
                      showRemoveIcon: true,
                      showDownloadIcon: false,
                    }}
                  >
                    {(() => {
                      const currentImages = fileList.filter(
                        (f) => f.type && CONSTANTS.SUPPORTED_IMAGE_TYPES.includes(f.type as any)
                      );
                      const currentVideos = fileList.filter(
                        (f) => f.type && CONSTANTS.SUPPORTED_VIDEO_TYPES.includes(f.type as any)
                      );

                      // 如果已有视频，不显示上传按钮
                      if (currentVideos.length >= CONSTANTS.MAX_VIDEO_COUNT) {
                        return null;
                      }

                      // 如果已有图片达到最大数量，不显示上传按钮
                      if (currentImages.length >= CONSTANTS.MAX_IMAGE_COUNT) {
                        return null;
                      }

                      return uploadButton;
                    })()}
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
                {/* 操作按钮 */}
                {fileList.length > 0 && (
                  <div className={styles.actions}>
                    <Button size="small" onClick={handleClearAllFiles}>
                      清空所有
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 未选择账号时的提示 */}
            {!noteData.account && (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  border: "2px dashed #d9d9d9",
                  borderRadius: "8px",
                  backgroundColor: "#fafafa",
                  color: "#999",
                }}
              >
                <div style={{ fontSize: "16px", marginBottom: "8px" }}>📱 请先选择发布账号</div>
                <div style={{ fontSize: "14px" }}>选择账号后即可开始编辑笔记内容和上传图片</div>
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div style={{ padding: "20px" }}>
            <div>
              {selectedUserType === "xiaohongshu" && (
                <div className={styles.row}>
                  <div className={styles.inlineFormItem}>
                    <span className={styles.subText}>选择你的博主类型</span>
                    <Select
                      style={{ width: 180, marginTop: 6 }}
                      value={industryPrimary}
                      onChange={handleIndustryPrimaryChange}
                      options={industryCategories.map((k) => ({ label: k, value: k }))}
                    />
                  </div>
                  <div className={styles.inlineFormItem}>
                    <span className={styles.subText}>选择细分方向</span>
                    <Select
                      style={{ width: 180, marginTop: 6 }}
                      value={industrySecondary}
                      onChange={handleIndustrySecondaryChange}
                      options={(CONSTANTS.INDUSTRY[industryPrimary as IndustryKey] || []).map(
                        (c) => ({
                          label: c,
                          value: c,
                        })
                      )}
                    />
                  </div>
                </div>
              )}
              {selectedUserType === "marketing" && (
                <div className={styles.row}>
                  <div className={styles.inlineFormItem}>
                    <span className={styles.subText}>选择行业</span>
                    <Select
                      style={{ width: 180, marginTop: 6 }}
                      value={industryPrimary}
                      onChange={handleMarketingCategoryChange}
                      options={(CONSTANTS.BLOGGER as readonly string[]).map((v) => ({
                        label: v,
                        value: v,
                      }))}
                    />
                  </div>
                </div>
              )}
              <Form
                wrapperCol={{ span: 24 }}
                form={form}
                layout="vertical"
                onValuesChange={onFormValuesChange}
                initialValues={{
                  title: noteData.note_title,
                  content: noteData.note_content,
                }}
              >
                <Form.Item label="笔记标题" required style={{ marginBottom: 8 }}>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                    <Form.Item
                      name="title"
                      rules={[
                        { required: true, message: "请输入笔记标题" },
                        {
                          max: CONSTANTS.MAX_TITLE_LENGTH,
                          message: `标题不能超过${CONSTANTS.MAX_TITLE_LENGTH}个字符`,
                        },
                      ]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input.TextArea
                        showCount
                        maxLength={CONSTANTS.MAX_TITLE_LENGTH}
                        placeholder="直接输入笔记标题或笔记主题"
                        autoSize={{ minRows: 1, maxRows: 2 }}
                      />
                    </Form.Item>

                    {/* 标签 + AI生成 行 */}
                    <div
                      style={{
                        marginTop: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {titleTagOptions.map((tag) => (
                          <Button
                            key={tag}
                            size="small"
                            type="default"
                            style={{
                              borderRadius: 12,
                              fontSize: 12,
                              height: 24,
                              padding: "0 8px",
                              border: "1px solid #d9d9d9",
                              color: "#666",
                            }}
                            onClick={() => {
                              message.warning("提示词功能，敬请期待");
                            }}
                          >
                            {tag}
                          </Button>
                        ))}
                      </div>
                      <Button
                        type="link"
                        size="small"
                        style={{ paddingRight: 0, color: "#7c3aed" }}
                        onClick={() => {
                          message.warning("标题AI生成功能，敬请期待");
                        }}
                      >
                        ✨AI生成
                      </Button>
                    </div>
                  </div>
                </Form.Item>

                <Form.Item label="正文内容" required style={{ marginBottom: 8 }}>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                    <Form.Item
                      name="content"
                      rules={[
                        { required: true, message: "请输入笔记内容" },
                        {
                          max: CONSTANTS.MAX_CONTENT_LENGTH,
                          message: `内容不能超过${CONSTANTS.MAX_CONTENT_LENGTH}个字符`,
                        },
                      ]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input.TextArea
                        showCount
                        maxLength={CONSTANTS.MAX_CONTENT_LENGTH}
                        placeholder="直接输入正文或笔记要求"
                        autoSize={{ minRows: 6, maxRows: 10 }}
                      />
                    </Form.Item>
                    <div
                      style={{
                        marginTop: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {contentTagOptions.map((tag) => (
                          <Button
                            key={tag}
                            size="small"
                            type="default"
                            style={{
                              borderRadius: 12,
                              fontSize: 12,
                              height: 24,
                              padding: "0 8px",
                              border: "1px solid #d9d9d9",
                              color: "#666",
                            }}
                            onClick={() => {
                              message.warning("提示词功能，敬请期待");
                            }}
                          >
                            {tag}
                          </Button>
                        ))}
                      </div>
                      <Button
                        type="link"
                        size="small"
                        style={{ paddingRight: 0, color: "#7c3aed" }}
                        onClick={async () => {
                          if (!noteData.note_content) {
                            message.warning("请先输入笔记内容");
                            return;
                          }
                          try {
                            setAiBeautifying(true);
                            const result = await beautifyNoteContentApi({
                              text: noteData.note_content || "",
                            });
                            if (result.polished_text !== null) {
                              form.setFieldsValue({ content: result.polished_text });
                              onDataChange({ note_content: result.polished_text });
                              message.success("AI润色完成！");
                            } else {
                              message.error("AI润色失败，请稍后重试");
                            }
                          } catch (error) {
                            console.error("AI润色出错:", error);
                            message.error("AI润色出错，请稍后重试");
                          } finally {
                            setAiBeautifying(false);
                          }
                        }}
                      >
                        ✨AI生成
                      </Button>
                    </div>
                  </div>
                </Form.Item>
              </Form>
            </div>
          </div>
        );

      case 2:
        return (
          <div style={{ padding: "20px" }}>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={onFormValuesChange}
              initialValues={{
                visibility: noteData.visibility,
                topic: noteData.note_tags_list
                  ? formatTopicsForDisplay(noteData.note_tags_list)
                  : "",
                user: formatAtUsersForDisplay(safeParseAtUsers(noteData.at_users || "")),
              }}
            >
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
                    <div>多个话题请用逗号分隔，如：美食,生活,推荐</div>
                    {noteData.note_tags_list && noteData.note_tags_list.length > 0 && (
                      <div style={{ marginTop: "4px", color: "#1890ff" }}>
                        已解析话题: {JSON.stringify(noteData.note_tags_list)}
                        <span style={{ marginLeft: "8px", color: "#52c41a" }}>
                          ({noteData.note_tags_list.length}个话题)
                        </span>
                      </div>
                    )}
                  </div>
                }
              >
                <Input.TextArea
                  showCount
                  placeholder="添加相关话题，增加曝光度..."
                  autoSize={{ minRows: 1, maxRows: 2 }}
                />
              </Form.Item>
              <Form.Item label="@用户" name="user" extra="@好友一起互动，多个用户请用逗号分隔">
                <Input.TextArea
                  showCount
                  placeholder="@你想要互动的用户，多个用户用逗号分隔..."
                  autoSize={{ minRows: 1, maxRows: 2 }}
                />
              </Form.Item>
            </Form>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <ProgressSteps currentStep={currentStep} />
      {renderStepContent()}
    </div>
  );
};

export default AddNewTaskContent;
