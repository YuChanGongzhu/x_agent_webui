import React, { useState, useEffect } from "react";
import { Button, Checkbox, Modal, Form, Spin, Card, Input, Upload, message, Space } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import VirtualList from "rc-virtual-list";
import {
  getMsgTemplates,
  createMsgTemplate,
  updateMsgTemplate,
  deleteMsgTemplate,
  deleteMsgTemplates,
  MessageTemplate,
} from "../../api/mysql";
import { tencentCOSService } from "../../api/tencent_cos";

const { TextArea } = Input;

const OneClickReplyTemplate = ({
  email,
  isAdmin,
  getTemplateIds,
}: {
  email: string | null;
  isAdmin: boolean;
  getTemplateIds: (ids: number[]) => void;
}) => {
  const [msgTemplates, setMsgTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateContent, setTemplateContent] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // 获取模板数据
  const fetchTemplates = async () => {
    if (!email) {
      message.error("用户邮箱不能为空，无法获取模板");
      return;
    }

    try {
      setLoading(true);
      const response = await getMsgTemplates(email);

      if (response && response.code === 0) {
        // 处理数据结构：response.data 可能直接是数组，也可能是 { total, records } 结构
        const templates = Array.isArray(response.data)
          ? response.data
          : response.data?.records || [];
        setMsgTemplates(templates);
        console.log("设置的模板数据:", templates);
        console.log("msgTemplates.length 将会是:", templates.length);
      } else if (response) {
        message.error(response.message || "获取模板失败");
      } else {
        message.error("获取模板失败：响应为空");
      }
    } catch (error) {
      console.error("获取模板失败:", error);
      message.error("获取模板失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (email) {
      console.log("一键回复模板的email", email);
      fetchTemplates();
    }
  }, [email]);

  // 选择/取消选择所有模板
  const handleSelectAllTemplates = () => {
    if (msgTemplates.length > 0) {
      const allTemplateIds = msgTemplates.map((template) => template.id);
      setSelectedTemplateIds(allTemplateIds);
      getTemplateIds(allTemplateIds);
    }
  };

  const handleDeselectAllTemplates = () => {
    setSelectedTemplateIds([]);
    getTemplateIds([]);
  };

  // 处理模板创建
  const handleAddTemplate = async () => {
    if (!email) {
      message.error("用户邮箱不能为空，无法创建模板");
      return;
    }

    if (!templateContent.trim()) {
      message.error("模板内容不能为空");
      return;
    }

    try {
      setLoading(true);
      let finalImageUrl = "";

      // 如果有图片文件，先上传到腾讯云COS（使用临时ID）
      if (imageFile) {
        // 使用时间戳作为临时ID来上传图片
        const tempId = Date.now();
        finalImageUrl = await uploadImageToCOS(tempId);
        if (!finalImageUrl) {
          message.error("图片上传失败，请重试");
          return;
        }
      }

      // 创建模板（包含图片URL）
      const templateParams = {
        content: templateContent,
        email: email,
        image_urls: finalImageUrl || undefined,
      };

      const response = await createMsgTemplate(templateParams);

      if (response.code === 0) {
        message.success("添加模板成功");
        setTemplateContent("");
        setImageUrl("");
        setImageFile(null);
        setIsModalVisible(false);
        fetchTemplates(); // 刷新模板列表
      } else {
        message.error(response.message || "添加模板失败");
      }
    } catch (error) {
      console.error("添加模板失败:", error);
      message.error("添加模板失败");
    } finally {
      setLoading(false);
    }
  };

  // 处理模板更新
  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !email) return;

    if (!templateContent.trim()) {
      message.error("模板内容不能为空");
      return;
    }

    try {
      setLoading(true);

      // 如果有新图片，先上传到腾讯云COS
      let imageUrlCOS = imageUrl;
      if (imageFile) {
        imageUrlCOS = await uploadImageToCOS(editingTemplate.id);
        if (!imageUrlCOS) {
          message.error("图片上传失败，请重试");
          return;
        }
      }

      const response = await updateMsgTemplate(editingTemplate.id, {
        content: templateContent,
        email: email,
        image_urls: imageUrlCOS || undefined,
      });

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

  // 处理模板删除
  const handleDeleteTemplate = async (id: number) => {
    if (!email) {
      message.error("用户邮箱不能为空，无法删除模板");
      return;
    }

    try {
      setLoading(true);
      const response = await deleteMsgTemplate(id, email);

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

  // 批量删除模板
  const handleBatchDelete = async () => {
    if (!email || selectedTemplateIds.length === 0) {
      message.error("请先选择要删除的模板");
      return;
    }

    try {
      setLoading(true);
      await deleteMsgTemplates(selectedTemplateIds, email);
      message.success("批量删除成功");
      setSelectedTemplateIds([]);
      getTemplateIds([]);
      fetchTemplates(); // 刷新模板列表
    } catch (error) {
      console.error("批量删除失败:", error);
      message.error("批量删除失败");
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
      const uploadPath = `${email}/msg_template_${templateId}`;

      // 上传文件到腾讯云COS
      const result = await cosService.uploadFile(
        imageFile,
        uploadPath,
        undefined,
        "xhs-msg-template-1347723456"
      );

      return result.url;
    } catch (error) {
      console.error("上传图片到腾讯云COS失败:", error);
      message.error("上传图片失败");
      return "";
    } finally {
      setUploadLoading(false);
    }
  };

  // 渲染模板列表项
  const renderTemplateItem = (template: MessageTemplate) => (
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
              const newIds = [...selectedTemplateIds, template.id];
              setSelectedTemplateIds(newIds);
              getTemplateIds(newIds);
            } else {
              const newIds = selectedTemplateIds.filter((id) => id !== template.id);
              setSelectedTemplateIds(newIds);
              getTemplateIds(newIds);
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
              checked={
                selectedTemplateIds.length === msgTemplates.length && msgTemplates.length > 0
              }
              indeterminate={
                selectedTemplateIds.length > 0 && selectedTemplateIds.length < msgTemplates.length
              }
              onChange={(e) => {
                if (e.target.checked) {
                  handleSelectAllTemplates();
                } else {
                  handleDeselectAllTemplates();
                }
              }}
            />
            <span style={{ fontSize: "16px", fontWeight: "500" }}>一键回复模板</span>
          </div>
          <Space>
            {selectedTemplateIds.length > 0 && (
              <Button
                danger
                onClick={handleBatchDelete}
                style={{
                  border: "1px solid #ff4d4f",
                  color: "#ff4d4f",
                  backgroundColor: "transparent",
                }}
              >
                批量删除 ({selectedTemplateIds.length})
              </Button>
            )}
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
          </Space>
        </div>
        <Spin spinning={loading}>
          <div
            style={{
              backgroundColor: "white",
              minHeight: "300px",
            }}
          >
            {msgTemplates.length > 0 ? (
              <VirtualList
                data={msgTemplates}
                height={400}
                itemHeight={80}
                itemKey={(item: MessageTemplate) => item.id}
                style={{ paddingRight: "12px" }}
              >
                {(item: MessageTemplate) => renderTemplateItem(item)}
              </VirtualList>
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
        </Spin>
      </Card>

      {/* 添加/编辑模板弹窗 */}
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

export default OneClickReplyTemplate;
