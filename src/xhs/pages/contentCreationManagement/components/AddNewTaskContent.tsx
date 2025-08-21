import React, { useState } from "react";
import { Form, Input, Select, Upload, Button, Image } from "antd";
import type { UploadFile, UploadProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useUserStore } from "../../../../store/userStore";
import { beautifyNoteContentApi } from "../../../../api/mysql";
import { NoteFormData } from "../types";
import { CONSTANTS } from "../constants";
import ProgressSteps from "./ProgressSteps";
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

  // 文件列表变化处理
  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    const imagePaths = generateImagePaths(newFileList);
    onDataChange({ images: imagePaths });
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
    message.success("图片删除成功！");
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

  // 处理清空所有图片
  const handleClearAllImages = () => {
    setFileList([]);
    onDataChange({ images: "" });
    message.success("已清空所有图片");
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

            {/* 内容编辑区域 */}
            {noteData.account && (
              <div style={{ display: "flex", flexDirection: "row", gap: "20px" }}>
                {/* 图片上传区域 */}
                <div
                  style={{
                    padding: "10px",
                    border: "1px solid #e8e8e8",
                    borderRadius: "8px",
                    flex: 1,
                  }}
                >
                  <div style={{ marginBottom: "20px" }}>
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        marginBottom: "8px",
                        color: "#333",
                      }}
                    >
                      添加图片
                    </h3>
                    <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                      最多可上传{CONSTANTS.MAX_IMAGE_COUNT}张图片，支持JPG、PNG、GIF格式，
                      单张图片不超过{CONSTANTS.MAX_FILE_SIZE}MB
                    </p>
                  </div>
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
                  {/* 操作按钮 */}
                  {fileList.length > 0 && (
                    <div
                      style={{
                        marginTop: "16px",
                        display: "flex",
                        gap: "8px",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button size="small" onClick={handleClearAllImages}>
                        清空所有
                      </Button>
                    </div>
                  )}
                </div>

                {/* 表单编辑区域 */}
                <div
                  style={{
                    flex: 1,
                    border: "1px solid #e8e8e8",
                    borderRadius: "8px",
                    padding: "10px",
                  }}
                >
                  <Form
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 20 }}
                    form={form}
                    onValuesChange={onFormValuesChange}
                    initialValues={{
                      title: noteData.note_title,
                      content: noteData.note_content,
                      topic: noteData.note_tags_list
                        ? formatTopicsForDisplay(noteData.note_tags_list)
                        : "",
                      user: formatAtUsersForDisplay(safeParseAtUsers(noteData.at_users || "")),
                    }}
                  >
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
                        autoSize={{ minRows: 1, maxRows: 2 }}
                      />
                    </Form.Item>

                    {/* AI润色按钮区域 */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button
                        color="primary"
                        loading={aiBeautifying}
                        type="link"
                        size="small"
                        disabled={aiBeautifying || !noteData.note_content}
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
                              form.setFieldsValue({
                                content: result.polished_text,
                              });
                              onDataChange({
                                note_content: result.polished_text,
                              });
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
                        {aiBeautifying ? "AI润色中..." : "✨ 一键AI润色"}
                      </Button>
                    </div>

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
                        autoSize={{ minRows: 4, maxRows: 8 }}
                      />
                    </Form.Item>
                  </Form>
                </div>
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
            <Form
              form={form}
              layout="vertical"
              onValuesChange={onFormValuesChange}
              initialValues={{
                visibility: noteData.visibility,
                account: noteData.account,
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
