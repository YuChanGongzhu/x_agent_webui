import React, { useState, useEffect } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  Button,
  Checkbox,
  Modal,
  Space,
  Tabs,
  Form,
  Spin,
  Card,
  Input,
  Upload,
  message,
  Tag,
} from "antd";
import BaseCollapse from "../../components/BaseComponents/BaseCollapse";
import BaseList from "../../components/BaseComponents/BaseList";
import BaseListUserItem from "../../components/BaseComponents/BaseListUserItem";
import { useUser } from "../../context/UserContext";
import {
  getXhsDevicesMsgList,
  ReplyTemplate,
  updateReplyTemplateApi,
  createReplyTemplateApi,
  deleteReplyTemplateApi,
  getReplyTemplatesApi,
} from "../../api/mysql";
import {
  CheckOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { tencentCOSService } from "../../api/tencent_cos";
// Define message types
type MessageType = "user" | "template";
const { TextArea } = Input;
// Interface for user messages
interface UserMessage {
  id: string;
  type: "user";
  avatar: string;
  name: string;
  description: string;
  selected?: boolean;
}

// Interface for template messages
interface TemplateMessage {
  id: string;
  type: "template";
  content: string;
  selected?: boolean;
}

// Union type for all message types
type Message = UserMessage | TemplateMessage;

const TemplateMessage = () => {
  const { email } = useUser();
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);
  const [templateContent, setTemplateContent] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000); // 设置一个很大的数值来显示所有模板
  const [totalTemplates, setTotalTemplates] = useState(0);
  // 组件初始化时获取模板和评论数据
  useEffect(() => {
    // 当email可用时获取模板
    if (email) {
      console.log(`Email available, fetching templates for: ${email}`);
      fetchTemplates();
    }
  }, [email]); // 依赖于email变化
  const handleDeselectAllTemplates = () => {
    setSelectedTemplateIds([]);
  };
  // 添加选择/取消选择所有模板的函数
  const handleSelectAllTemplates = () => {
    if (templates.length > 0) {
      const allTemplateIds = templates.map((template) => template.id);
      setSelectedTemplateIds(allTemplateIds);
    }
  };
  // 渲染模板列表项
  const renderTemplateItem = (template: ReplyTemplate) => (
    <div
      key={template.id}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0",
        borderBottom: "1px solid #f0f0f0",
        minHeight: "48px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
        <Checkbox
          checked={selectedTemplateIds.includes(template.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedTemplateIds([...selectedTemplateIds, template.id]);
            } else {
              setSelectedTemplateIds(selectedTemplateIds.filter((id) => id !== template.id));
            }
          }}
          style={{ marginRight: "12px" }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "#333",
              fontSize: "14px",
              lineHeight: "1.4",
              wordBreak: "break-word",
            }}
          >
            {template.content}
          </div>
          {template.image_urls && (
            <div style={{ marginTop: "8px" }}>
              <img
                src={template.image_urls}
                alt="模板图片"
                style={{
                  maxWidth: "80px",
                  maxHeight: "60px",
                  objectFit: "contain",
                  borderRadius: "4px",
                }}
              />
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "12px" }}>
        <Button
          type="text"
          icon={<EditOutlined />}
          size="small"
          style={{
            color: "#8389FC",
            padding: "4px",
            minWidth: "28px",
            height: "28px",
          }}
          onClick={() => {
            setEditingTemplate(template);
            setTemplateContent(template.content);

            // 如果模板有图片URL，加载图片
            if (template.image_urls) {
              loadImageFromCOS(template.image_urls);
            } else {
              // 清空之前可能存在的图片
              setImageUrl("");
              setImageFile(null);
            }

            setIsModalVisible(true);
          }}
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
          onClick={() => handleDeleteTemplate(template.id)}
        />
      </div>
    </div>
  );
  // 处理模板更新
  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    // 确保有email才能更新模板
    if (!email) {
      message.error("用户邮箱不能为空，无法更新模板");
      return;
    }

    try {
      setLoading(true);

      // 如果有新图片，先上传到腾讯云COS
      let imageUrlCOS = imageUrl;
      console.log("Initial imageUrl value:", imageUrl);

      if (imageFile) {
        // 使用现有模板ID上传图片
        console.log("Uploading new image file:", imageFile.name);
        imageUrlCOS = await uploadImageToCOS(editingTemplate.id);
        console.log("After upload, imageUrlCOS:", imageUrlCOS);
        if (!imageUrlCOS) {
          message.error("图片上传失败，请重试");
          return;
        }
      } else {
        console.log("No new image file, using existing imageUrl");
      }

      const response = await updateReplyTemplateApi(editingTemplate.id, {
        content: templateContent,
        email: email, // 使用当前用户的邮箱
        image_urls: imageUrlCOS, // 添加图片URL字段
      });

      console.log(`Updating template ${editingTemplate.id} for user: ${email}`);

      if (response.code === 0) {
        message.success("更新模板成功");
        setTemplateContent("");
        setImageUrl("");
        setImageFile(null);
        setEditingTemplate(null);
        setIsModalVisible(false);
        fetchTemplates(); // 刷新模板列表
      } else {
        message.error(response.message || "更新模板失败");
      }
    } catch (error) {
      console.error("更新模板失败:", error);
      message.error("更新模板失败");
    } finally {
      setLoading(false);
    }
  };
  // 处理模板创建
  const handleAddTemplate = async () => {
    // 确保有email才能创建模板
    if (!email) {
      message.error("用户邮箱不能为空，无法创建模板");
      return;
    }

    try {
      setLoading(true);

      // 先创建不带图片的模板
      const response = await createReplyTemplateApi({
        content: templateContent,
        email: email,
      });

      if (response.code !== 0) {
        message.error(response.message || "添加模板失败");
        return;
      }

      // 如果没有图片，直接完成
      if (!imageFile) {
        message.success("添加模板成功");
        setTemplateContent("");
        setIsModalVisible(false);
        fetchTemplates(); // 刷新模板列表
        return;
      }

      // 如果有图片，需要获取最新创建的模板ID
      const templatesResponse = await getReplyTemplatesApi({
        page: 1,
        page_size: 10,
        email: email,
      });

      if (!templatesResponse.data?.records || templatesResponse.data.records.length === 0) {
        message.warning("创建模板成功，但无法上传图片，请稍后编辑模板添加图片");
        setTemplateContent("");
        setImageUrl("");
        setImageFile(null);
        setIsModalVisible(false);
        fetchTemplates();
        return;
      }

      // 假设最新的模板就是我们刚创建的（按创建时间排序，最新的在最前面）
      const latestTemplate = templatesResponse.data.records[0];

      // 上传图片
      const imageUrlCOS = await uploadImageToCOS(latestTemplate.id);
      if (!imageUrlCOS) {
        message.warning("模板创建成功，但图片上传失败");
        setTemplateContent("");
        setImageUrl("");
        setImageFile(null);
        setIsModalVisible(false);
        fetchTemplates();
        return;
      }

      // 更新模板添加图片URL
      const updateResponse = await updateReplyTemplateApi(latestTemplate.id, {
        content: templateContent,
        email: email,
        image_urls: imageUrlCOS,
      });

      if (updateResponse.code === 0) {
        message.success("添加模板成功");
      } else {
        message.warning("模板创建成功，但更新图片失败");
      }

      setTemplateContent("");
      setImageUrl("");
      setImageFile(null);
      setIsModalVisible(false);
      fetchTemplates(); // 刷新模板列表
    } catch (error) {
      console.error("添加模板失败:", error);
      message.error("添加模板失败");
    } finally {
      setLoading(false);
    }
  };
  // 处理模板删除
  const handleDeleteTemplate = async (id: number) => {
    // 确保有email才能删除模板
    if (!email) {
      message.error("用户邮箱不能为空，无法删除模板");
      return;
    }

    try {
      setLoading(true);
      const response = await deleteReplyTemplateApi(id, email);

      console.log(`Deleting template ${id} for user: ${email}`);

      if (response.code === 0) {
        message.success("删除模板成功");
        fetchTemplates(); // 刷新模板列表
      } else {
        message.error(response.message || "删除模板失败");
      }
    } catch (error) {
      console.error("删除模板失败:", error);
      message.error("删除模板失败");
    } finally {
      setLoading(false);
    }
  };
  // 处理图片上传
  const handleImageUpload = async (file: File): Promise<boolean> => {
    if (!email) {
      message.error("用户邮箱不能为空，无法上传图片");
      return false;
    }

    try {
      setUploadLoading(true);

      // 检查文件类型
      const isImage = file.type.startsWith("image/");
      if (!isImage) {
        message.error("只能上传图片文件!");
        return false;
      }

      // 检查文件大小，限制为5MB
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error("图片必须小于5MB!");
        return false;
      }

      // 保存文件以供后续上传
      setImageFile(file);

      // 创建本地预览URL
      const objectUrl = URL.createObjectURL(file);
      setImageUrl(objectUrl);

      return false; // 返回false阻止Upload组件默认上传行为
    } catch (error) {
      console.error("处理图片上传失败:", error);
      message.error("处理图片上传失败");
      return false;
    } finally {
      setUploadLoading(false);
    }
  };
  // 清除图片
  const handleRemoveImage = () => {
    setImageUrl("");
    setImageFile(null);
  };
  // 从腾讯云COS获取图片并显示
  const loadImageFromCOS = async (imageUrl: string) => {
    if (!imageUrl) return;

    try {
      console.log("Loading image from URL:", imageUrl);

      // 直接设置图片URL而不尝试从腾讯云COS获取
      // 这样可以避免解析URL时的问题
      setImageUrl(imageUrl);
      setImageFile(null); // 不需要文件对象，因为我们直接使用URL

      console.log("Image URL set successfully");
    } catch (error) {
      console.error("加载图片失败:", error);
      message.error("加载图片失败");
    }
  };
  // 上传图片到腾讯云COS
  const uploadImageToCOS = async (templateId: number): Promise<string> => {
    if (!imageFile || !email) return "";

    try {
      setUploadLoading(true);

      // 创建腾讯云COS服务实例
      const cosService = tencentCOSService;

      // 构建上传路径：email/模板序号/图片名称
      // 使用实际的模板ID
      const uploadPath = `${email}/${templateId}`;

      // 上传文件到腾讯云COS
      const result = await cosService.uploadFile(imageFile, uploadPath);

      return result.url;
    } catch (error) {
      console.error("上传图片到腾讯云COS失败:", error);
      message.error("上传图片失败");
      return "";
    } finally {
      setUploadLoading(false);
    }
  };
  // 从后端获取模板
  const fetchTemplates = async () => {
    try {
      // 确保有email才能获取模板
      if (!email) {
        message.error("用户邮箱不能为空，无法获取模板");
        return;
      }

      setLoading(true);
      const response = await getReplyTemplatesApi({
        page: 1,
        page_size: 1000, // 获取所有模板
        email: email, // 使用当前用户的邮箱
      });

      console.log(`Fetching templates for user: ${email}`);
      console.log("response123", response.data);
      setTemplates(response.data?.records || []);
      setTotalTemplates(response.data?.total || 0);
    } catch (error) {
      console.error("获取模板失败:", error);
      message.error("获取模板失败");
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Checkbox
              checked={selectedTemplateIds.length === templates.length && templates.length > 0}
              indeterminate={
                selectedTemplateIds.length > 0 && selectedTemplateIds.length < templates.length
              }
              onChange={(e) => {
                if (e.target.checked) {
                  handleSelectAllTemplates();
                } else {
                  handleDeselectAllTemplates();
                }
              }}
            />
            <span style={{ fontSize: "16px", fontWeight: "500" }}>私信模版内容</span>
          </div>
        </div>
        <Spin spinning={loading}>
          <div
            style={{
              backgroundColor: "white",
              minHeight: "200px",
            }}
          >
            {templates.length > 0 ? (
              templates.map((template) => renderTemplateItem(template))
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: "#999",
                  fontSize: "14px",
                }}
              >
                暂无模板
              </div>
            )}
          </div>
          {/* 底部按钮区域 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "20px",
            }}
          >
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateContent("");
                setImageUrl("");
                setImageFile(null);
                setIsModalVisible(true);
              }}
              style={{
                border: "1px solid #999999",
                color: "#333333",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.color = "#8389fc";
                e.currentTarget.style.borderColor = "#8389fc";
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.color = "#333333";
                e.currentTarget.style.borderColor = "#999999";
              }}
            >
              添加模板
            </Button>
            <Button
              type="primary"
              onClick={() => {
                console.log("一键回复");
              }}
              style={{
                borderRadius: "6px",
                padding: "6px 16px",
                height: "32px",
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
              一键回复
            </Button>
          </div>
        </Spin>
      </Card>
      <Modal
        title={editingTemplate ? "编辑模板" : "添加模板"}
        open={isModalVisible}
        onOk={editingTemplate ? handleUpdateTemplate : handleAddTemplate}
        onCancel={() => {
          setIsModalVisible(false);
          setTemplateContent("");
          setImageUrl("");
          setImageFile(null);
          setEditingTemplate(null);
        }}
        confirmLoading={loading || uploadLoading}
        okText={editingTemplate ? "更新" : "添加"}
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="模板内容" required>
            <TextArea
              rows={6}
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              placeholder="请输入模板内容..."
            />
          </Form.Item>
          <Form.Item label="图片（可选）">
            <div className="flex flex-col space-y-2">
              <Upload
                name="image"
                listType="picture-card"
                className="avatar-uploader"
                showUploadList={false}
                beforeUpload={handleImageUpload}
                accept="image/*"
              >
                {imageUrl ? (
                  <div className="relative">
                    <img src={imageUrl} alt="模板图片" style={{ width: "100%" }} />
                    <div
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                    >
                      X
                    </div>
                  </div>
                ) : (
                  <div>
                    {uploadLoading ? <Spin /> : <PlusOutlined />}
                    <div style={{ marginTop: 8 }}>上传图片</div>
                  </div>
                )}
              </Upload>
              {imageUrl && (
                <Button icon={<DeleteOutlined />} onClick={handleRemoveImage} danger>
                  移除图片
                </Button>
              )}
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

const PrivateMessage: React.FC = () => {
  const [formatDeviceMsgList, setFormatDeviceMsgList] = useState<any[]>([]);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  // const [deviceMsgList, setDeviceMsgList] = useState<any[]>([]);
  const { email } = useUser();
  // const [loading, setLoading] = useState(false);
  useEffect(() => {
    fetchDeviceMsgList();
  }, [email]);
  const fetchDeviceMsgList = async () => {
    try {
      // setLoading(true)
      const data = (await getXhsDevicesMsgList(email ? email : "")).data;
      console.log(data, "=====");
      const filterData = data.filter((device: any) => device.device_id);
      const formatData = filterData.reduce((acc: any, device: any) => {
        if (!acc[device.device_id]) {
          acc[device.device_id] = [];
        }
        acc[device.device_id].push(device);
        return acc;
      }, {});
      console.log(formatData, "=====");
      // setDeviceMsgList(filterData);
      setActiveKeys(filterData.map((device: any) => device.device_id));
      setFormatDeviceMsgList(formatData);
      // setLoading(false)
    } catch (err) {
      // setLoading(false)
    }
  };
  return (
    <div className="w-full overflow-y-auto h-[calc(100%-4rem)]">
      {Object.keys(formatDeviceMsgList).length ? (
        <>
          <BaseCollapse
            activeKey={activeKeys}
            onChange={(keys) => {
              setActiveKeys(keys as string[]);
            }}
            style={{ borderRadius: "0px" }}
            items={Object.entries(formatDeviceMsgList).map(([device_id, device]) => ({
              style: {
                display: "block",
              },
              key: device_id,
              label: `设备：  ${device_id}`,
              children:
                device.length > 0 ? (
                  <BaseList
                    dataSource={device}
                    renderItem={(item, idx) => {
                      return <BaseListUserItem idx={idx + 1} item={item} />;
                    }}
                  />
                ) : (
                  <div>暂无未回复用户</div>
                ),
            }))}
          />
        </>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 h-[50vh] flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold mb-4">暂无未回复用户</h2>
          </div>
        </>
      )}
    </div>
  );
};

// Main Message component
const Message: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
      {/*  Messages Section */}
      <div>
        <div
          className=" py-3 px-4 border-b border-gray-100"
          style={{
            justifyContent: "space-between",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span className="font-medium text-sm">私信管理</span>
          <Button
            type="primary"
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
            字体待定
          </Button>
        </div>
        <PrivateMessage />
      </div>

      {/* Template Messages  */}
      <div style={{ marginTop: "20px" }}>
        <TemplateMessage />
      </div>
    </div>
  );
};

// Example usage with sample data
const ExampleMessage: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  return <Message />;
};

export default Message;
export { ExampleMessage, PrivateMessage };
