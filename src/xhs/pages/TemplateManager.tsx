import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Tabs, Spin, Checkbox, Tag, Pagination, Upload } from 'antd';
import { DeleteOutlined, EditOutlined, SendOutlined, ImportOutlined, PlusOutlined, CheckSquareOutlined, UploadOutlined } from '@ant-design/icons';
import {
  getReplyTemplatesApi,
  createReplyTemplateApi,
  updateReplyTemplateApi,
  deleteReplyTemplateApi,
  getXhsCommentsApi,
  ReplyTemplate
} from '../../api/mysql';
import { triggerDagRun, getDagRuns } from '../../api/airflow';
import { useUser } from '../../context/UserContext';
import { tencentCOSService } from '../../api/tencent_cos';

const { TextArea } = Input;

// 评论接口定义
interface Comment {
  id?: number;
  comment_id: string;
  content: string;
  author: string;
  note_id?: string;
  note_url?: string;
  note_title?: string;
  sent?: boolean;
  is_selected?: boolean;
}

// 意向客户接口定义
interface CustomerIntent {
  id: number;
  comment_id: string;
  author: string;
  content: string;
  note_id: string;
  note_title?: string;
  keyword: string;
  intent: string;
  created_at?: string;
  updated_at?: string;
}

const { TabPane } = Tabs;

const TemplateManager: React.FC = () => {
  // Get user info from context
  const { email } = useUser();

  // 模板状态
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [templateContent, setTemplateContent] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalTemplates, setTotalTemplates] = useState(0);
  // 新增图片上传相关状态
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // 评论状态
  const [comments, setComments] = useState<Comment[]>([]);
  const [customerIntents, setCustomerIntents] = useState<CustomerIntent[]>([]); // 新增意向客户数据状态
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [dagRunId, setDagRunId] = useState('');
  const [dagRunStatus, setDagRunStatus] = useState('');
  const [dataSource, setDataSource] = useState<'comments' | 'intents'>('comments'); // 数据来源状态

  // 检查是否有从DataAnalyze页面传递过来的意向客户数据
  useEffect(() => {
    // 检查是否有意向客户数据
    const storedIntents = sessionStorage.getItem('filtered_intents');
    if (storedIntents) {
      try {
        const parsedIntents = JSON.parse(storedIntents);
        if (Array.isArray(parsedIntents) && parsedIntents.length > 0) {
          setCustomerIntents(parsedIntents);
          // 提取评论IDs
          const commentIds = parsedIntents.map((intent: CustomerIntent) => intent.comment_id).filter(Boolean);
          setSelectedComments(commentIds);
          setDataSource('intents'); // 设置数据来源为意向客户
          message.success(`已接收 ${parsedIntents.length} 条意向客户数据`);
          // 清除sessionStorage中的数据，避免重复加载
          sessionStorage.removeItem('filtered_intents');
          sessionStorage.removeItem('selected_comment_ids');
        }
      } catch (err) {
        console.error('解析传递的意向客户数据失败:', err);
      }
    } else {
      // 兼容性检查，如果没有意向客户数据，检查是否有评论ID
      const storedCommentIds = sessionStorage.getItem('selected_comment_ids');
      if (storedCommentIds) {
        try {
          const parsedCommentIds = JSON.parse(storedCommentIds);
          if (Array.isArray(parsedCommentIds) && parsedCommentIds.length > 0) {
            setSelectedComments(parsedCommentIds);
            setDataSource('comments'); // 设置数据来源为评论
            message.success(`已接收 ${parsedCommentIds.length} 条评论数据`);
            // 清除sessionStorage中的数据，避免重复加载
            sessionStorage.removeItem('selected_comment_ids');
          }
        } catch (err) {
          console.error('解析传递的评论ID失败:', err);
        }
      }
    }
  }, []);

  // 组件初始化时获取模板和评论数据
  useEffect(() => {
    // 当email可用时获取模板
    if (email) {
      console.log(`Email available, fetching templates for: ${email}`);
      fetchTemplates();
    }
  }, [email]); // 依赖于email变化

  // 分页变化时获取模板和评论
  useEffect(() => {
    if (email) {
      fetchTemplates();
    }
    fetchComments();
  }, [currentPage, pageSize]);

  // 从后端获取模板
  const fetchTemplates = async () => {
    try {
      // 确保有email才能获取模板
      if (!email) {
        message.error('用户邮箱不能为空，无法获取模板');
        return;
      }

      setLoading(true);
      const response = await getReplyTemplatesApi({
        page: currentPage,
        page_size: pageSize,
        email: email // 使用当前用户的邮箱
      });

      console.log(`Fetching templates for user: ${email}`);

      setTemplates(response.data?.records || []);
      setTotalTemplates(response.data?.total || 0);
    } catch (error) {
      console.error('获取模板失败:', error);
      message.error('获取模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取用户触达的评论
  const fetchComments = async () => {
    try {
      setCommentsLoading(true);

      // 使用getXhsCommentsApi获取评论数据
      const response = await getXhsCommentsApi(100); // 只传递limit参数

      if (response && response.data && response.data.records) {
        // 将API返回的评论数据转换为组件需要的格式
        const formattedComments: Comment[] = response.data.records.map((comment: any) => ({
          comment_id: comment.id || comment.comment_id || '',
          content: comment.content || '',
          author: comment.author_name || comment.author || '',
          note_id: comment.note_id || '',
          note_title: comment.note_title || '',
          sent: comment.is_sent === 1 // 将is_sent转换为布尔值
        }));

        // 只保留未发送的评论
        const unsentComments = formattedComments.filter(comment => !comment.sent);
        setComments(unsentComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('获取评论失败:', error);
      message.error('获取评论失败');
    } finally {
      setCommentsLoading(false);
    }
  };

  // 处理图片上传
  const handleImageUpload = async (file: File): Promise<boolean> => {
    if (!email) {
      message.error('用户邮箱不能为空，无法上传图片');
      return false;
    }

    try {
      setUploadLoading(true);

      // 检查文件类型
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件!');
        return false;
      }

      // 检查文件大小，限制为5MB
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('图片必须小于5MB!');
        return false;
      }

      // 保存文件以供后续上传
      setImageFile(file);

      // 创建本地预览URL
      const objectUrl = URL.createObjectURL(file);
      setImageUrl(objectUrl);

      return false; // 返回false阻止Upload组件默认上传行为
    } catch (error) {
      console.error('处理图片上传失败:', error);
      message.error('处理图片上传失败');
      return false;
    } finally {
      setUploadLoading(false);
    }
  };

  // 上传图片到腾讯云COS
  const uploadImageToCOS = async (templateId: number): Promise<string> => {
    if (!imageFile || !email) return '';

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
      console.error('上传图片到腾讯云COS失败:', error);
      message.error('上传图片失败');
      return '';
    } finally {
      setUploadLoading(false);
    }
  };

  // 清除图片
  const handleRemoveImage = () => {
    setImageUrl('');
    setImageFile(null);
  };

  // 从腾讯云COS获取图片并显示
  const loadImageFromCOS = async (imageUrl: string) => {
    if (!imageUrl) return;

    try {
      console.log('Loading image from URL:', imageUrl);

      // 直接设置图片URL而不尝试从腾讯云COS获取
      // 这样可以避免解析URL时的问题
      setImageUrl(imageUrl);
      setImageFile(null); // 不需要文件对象，因为我们直接使用URL

      console.log('Image URL set successfully');
    } catch (error) {
      console.error('加载图片失败:', error);
      message.error('加载图片失败');
    }
  };

  // 处理模板创建
  const handleAddTemplate = async () => {
    // 确保有email才能创建模板
    if (!email) {
      message.error('用户邮箱不能为空，无法创建模板');
      return;
    }

    try {
      setLoading(true);

      // 先创建不带图片的模板
      const response = await createReplyTemplateApi({
        content: templateContent,
        email: email
      });

      if (response.code !== 0) {
        message.error(response.message || '添加模板失败');
        return;
      }

      // 如果没有图片，直接完成
      if (!imageFile) {
        message.success('添加模板成功');
        setTemplateContent('');
        setIsModalVisible(false);
        fetchTemplates(); // 刷新模板列表
        return;
      }

      // 如果有图片，需要获取最新创建的模板ID
      const templatesResponse = await getReplyTemplatesApi({
        page: 1,
        page_size: 10,
        email: email
      });

      if (!templatesResponse.data?.records || templatesResponse.data.records.length === 0) {
        message.warning('创建模板成功，但无法上传图片，请稍后编辑模板添加图片');
        setTemplateContent('');
        setImageUrl('');
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
        message.warning('模板创建成功，但图片上传失败');
        setTemplateContent('');
        setImageUrl('');
        setImageFile(null);
        setIsModalVisible(false);
        fetchTemplates();
        return;
      }

      // 更新模板添加图片URL
      const updateResponse = await updateReplyTemplateApi(latestTemplate.id, {
        content: templateContent,
        email: email,
        image_urls: imageUrlCOS
      });

      if (updateResponse.code === 0) {
        message.success('添加模板成功');
      } else {
        message.warning('模板创建成功，但更新图片失败');
      }

      setTemplateContent('');
      setImageUrl('');
      setImageFile(null);
      setIsModalVisible(false);
      fetchTemplates(); // 刷新模板列表
    } catch (error) {
      console.error('添加模板失败:', error);
      message.error('添加模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理模板更新
  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    // 确保有email才能更新模板
    if (!email) {
      message.error('用户邮箱不能为空，无法更新模板');
      return;
    }

    try {
      setLoading(true);

      // 如果有新图片，先上传到腾讯云COS
      let imageUrlCOS = imageUrl;
      console.log('Initial imageUrl value:', imageUrl);

      if (imageFile) {
        // 使用现有模板ID上传图片
        console.log('Uploading new image file:', imageFile.name);
        imageUrlCOS = await uploadImageToCOS(editingTemplate.id);
        console.log('After upload, imageUrlCOS:', imageUrlCOS);
        if (!imageUrlCOS) {
          message.error('图片上传失败，请重试');
          return;
        }
      } else {
        console.log('No new image file, using existing imageUrl');
      }

      const response = await updateReplyTemplateApi(editingTemplate.id, {
        content: templateContent,
        email: email, // 使用当前用户的邮箱
        image_urls: imageUrlCOS // 添加图片URL字段
      });

      console.log(`Updating template ${editingTemplate.id} for user: ${email}`);

      if (response.code === 0) {
        message.success('更新模板成功');
        setTemplateContent('');
        setImageUrl('');
        setImageFile(null);
        setEditingTemplate(null);
        setIsModalVisible(false);
        fetchTemplates(); // 刷新模板列表
      } else {
        message.error(response.message || '更新模板失败');
      }
    } catch (error) {
      console.error('更新模板失败:', error);
      message.error('更新模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理模板删除
  const handleDeleteTemplate = async (id: number) => {
    // 确保有email才能删除模板
    if (!email) {
      message.error('用户邮箱不能为空，无法删除模板');
      return;
    }

    try {
      setLoading(true);
      const response = await deleteReplyTemplateApi(id, email);

      console.log(`Deleting template ${id} for user: ${email}`);

      if (response.code === 0) {
        message.success('删除模板成功');
        fetchTemplates(); // 刷新模板列表
      } else {
        message.error(response.message || '删除模板失败');
      }
    } catch (error) {
      console.error('删除模板失败:', error);
      message.error('删除模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理评论选择
  const handleCommentSelection = (commentId: string, checked: boolean) => {
    if (checked) {
      setSelectedComments([...selectedComments, commentId]);
    } else {
      setSelectedComments(selectedComments.filter(id => id !== commentId));
    }
  };

  const handleReachOut = async () => {
    if (selectedComments.length === 0) {
      message.warning('请至少选择一条评论');
      return;
    }

    try {
      setLoading(true);

      const timestamp = new Date().toISOString().replace(/[-:.]/g, '_');
      const newDagRunId = `comments_template_replier_${timestamp}`;

      // 从 localStorage 中获取目标邮箱
      const targetEmail = localStorage.getItem('xhs_target_email') || '';

      const conf = {
        comment_ids: selectedComments,
        email: targetEmail
      };

      const response = await triggerDagRun(
        "comments_template_replier",
        newDagRunId,
        conf
      );

      if (response && response.dag_run_id) {
        setDagRunId(response.dag_run_id);
        setDagRunStatus('running');
        message.success(`已提交触达任务，处理 ${selectedComments.length} 条评论`);
      } else {
        message.error('提交触达任务失败');
      }
    } catch (error) {
      console.error('触发DAG失败:', error);
      message.error('触发DAG失败');
    } finally {
      setLoading(false);
    }
  };

  // 检查DAG运行状态
  const checkDagRunStatus = async () => {
    if (!dagRunId) {
      message.warning('没有正在运行的任务');
      return;
    }

    try {
      setLoading(true);

      const response = await getDagRuns("comments_template_replier", 10, "-start_date");

      if (response && response.dag_runs) {
        const dagRun = response.dag_runs.find((run: any) => run.dag_run_id === dagRunId);

        if (dagRun) {
          setDagRunStatus(dagRun.state);

          if (dagRun.state === 'success') {
            message.success('触达任务已完成');
            fetchComments(); // 刷新评论以更新发送状态
          } else if (dagRun.state === 'failed') {
            message.error('触达任务失败');
          } else {
            message.info(`触达任务状态: ${dagRun.state}`);
          }
        } else {
          message.warning('找不到任务信息');
        }
      }
    } catch (error) {
      console.error('检查DAG运行状态失败:', error);
      message.error('检查任务状态失败');
    } finally {
      setLoading(false);
    }
  };

  // 模板表格列定义
  const templateColumns = [
    {
      title: '模板内容',
      dataIndex: 'content',
      key: 'content',
      render: (text: string, record: ReplyTemplate) => (
        <div>
          <div className="max-w-xl line-clamp-3 hover:line-clamp-none">{text}</div>
          {record.image_urls && (
            <div className="mt-2">
              <img
                src={record.image_urls}
                alt="模板图片"
                style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'contain' }}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: ReplyTemplate) => (
        <>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingTemplate(record);
              setTemplateContent(record.content);

              // 如果模板有图片URL，加载图片
              if (record.image_urls) {
                loadImageFromCOS(record.image_urls);
              } else {
                // 清空之前可能存在的图片
                setImageUrl('');
                setImageFile(null);
              }

              setIsModalVisible(true);
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteTemplate(record.id)}
          />
        </>
      ),
    },
  ];

  // 评论表格列定义
  const commentColumns = [
    {
      title: '选择',
      dataIndex: 'comment_id',
      key: 'selection',
      render: (comment_id: string) => (
        <Checkbox
          checked={selectedComments.includes(comment_id)}
          onChange={(e) => handleCommentSelection(comment_id, e.target.checked)}
        />
      ),
    },
    {
      title: '评论内容',
      dataIndex: 'content',
      key: 'content',
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
    },
  ];

  // 意向客户列定义
  const intentColumns = [
    {
      title: '选择',
      dataIndex: 'comment_id',
      key: 'selection',
      render: (comment_id: string) => (
        <Checkbox
          checked={selectedComments.includes(comment_id)}
          onChange={(e) => handleCommentSelection(comment_id, e.target.checked)}
          disabled={!comment_id} // 如果没有comment_id则禁用
        />
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      render: (text: string) => (
        <div className="line-clamp-3 hover:line-clamp-none">{text}</div>
      ),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
    },
    {
      title: '意向度',
      dataIndex: 'intent',
      key: 'intent',
      render: (intent: string) => (
        <Tag color={
          intent === '高意向' ? 'green' :
            intent === '中意向' ? 'orange' :
              'default'
        }>
          {intent}
        </Tag>
      ),
    },
    {
      title: '是否已回复',
      dataIndex: 'is_reply',
      key: 'is_reply',
      render: (is_reply: number) => (
        <Tag color={is_reply === 1 ? 'green' : 'red'}>
          {is_reply === 1 ? '已回复' : '未回复'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <Tabs defaultActiveKey="templates">
        <TabPane tab="编辑模板" key="templates">
          <Card
            title="回复模板管理"
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateContent('');
                  setIsModalVisible(true);
                }}
              >
                添加模板
              </Button>
            }
          >
            <Spin spinning={loading}>
              <Table
                dataSource={templates}
                columns={templateColumns}
                rowKey="id"
                pagination={false}
              />
              <div className="mt-4 flex justify-end">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={totalTemplates}
                  onChange={(page: number) => setCurrentPage(page)}
                  onShowSizeChange={(current: number, size: number) => {
                    setCurrentPage(1);
                    setPageSize(size);
                  }}
                  showSizeChanger
                  showQuickJumper
                  showTotal={(total: number) => `共 ${total} 条`}
                  locale={{
                    items_per_page: '条/页',
                    jump_to: '跳至',
                    jump_to_confirm: '确定',
                    page: '页',
                    prev_page: '上一页',
                    next_page: '下一页',
                    prev_5: '向前 5 页',
                    next_5: '向后 5 页',
                    prev_3: '向前 3 页',
                    next_3: '向后 3 页'
                  }}
                />
              </div>
            </Spin>
          </Card>

          <Modal
            title={editingTemplate ? "编辑模板" : "添加模板"}
            open={isModalVisible}
            onOk={editingTemplate ? handleUpdateTemplate : handleAddTemplate}
            onCancel={() => {
              setIsModalVisible(false);
              setTemplateContent('');
              setImageUrl('');
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
                        <img src={imageUrl} alt="模板图片" style={{ width: '100%' }} />
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
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={handleRemoveImage}
                      danger
                    >
                      移除图片
                    </Button>
                  )}
                </div>
              </Form.Item>
            </Form>
          </Modal>
        </TabPane>

        <TabPane tab="触达用户" key="outreach">
          <Card title="用户触达管理">
            <Spin spinning={commentsLoading}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    className="mr-4"
                    onClick={handleReachOut}
                    disabled={selectedComments.length === 0 || loading}
                  >
                    触达选中用户
                  </Button>
                  {dagRunId && (
                    <Button
                      className="mr-4"
                      onClick={checkDagRunStatus}
                      disabled={loading}
                    >
                      检查任务状态
                    </Button>
                  )}
                  {dagRunStatus && (
                    <span className="mr-4">
                      当前任务状态: <strong>{dagRunStatus}</strong>
                    </span>
                  )}
                  <Button
                    icon={selectedComments.length === 0 ? <CheckSquareOutlined /> : <DeleteOutlined />}
                    onClick={() => {
                      if (selectedComments.length > 0) {
                        setSelectedComments([]);
                      } else {
                        if (dataSource === 'intents') {
                          const allCommentIds = customerIntents
                            .map(intent => intent.comment_id)
                            .filter(id => id);
                          setSelectedComments(allCommentIds);
                        } else {
                          const allCommentIds = comments
                            .map(comment => comment.comment_id)
                            .filter(id => id);
                          setSelectedComments(allCommentIds);
                        }
                      }
                    }}
                  >
                    {selectedComments.length > 0 ? '取消全选' : '全选'}
                  </Button>
                </div>
                <div>
                  {selectedComments.length > 0 && (
                    <Tag color="blue" className="mr-4">
                      {dataSource === 'intents' ?
                        `来自意向客户分析: ${customerIntents.length} 条数据` :
                        `选中评论: ${selectedComments.length} 条`}
                    </Tag>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-500 mb-2">
                已选择 {selectedComments.length} 条{dataSource === 'intents' ? '意向客户' : '评论'}
              </div>

              {dataSource === 'intents' ? (
                <Table
                  className="h-[34vw] overflow-y-auto overflow-x-auto w-full"
                  dataSource={customerIntents}
                  columns={intentColumns}
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total: number) => `共 ${total} 条意向客户数据`,
                    locale: {
                      items_per_page: '条/页',
                      jump_to: '跳至',
                      jump_to_confirm: '确定',
                      page: '页',
                      prev_page: '上一页',
                      next_page: '下一页',
                      prev_5: '向前 5 页',
                      next_5: '向后 5 页',
                      prev_3: '向前 3 页',
                      next_3: '向后 3 页'
                    }
                  }}
                  locale={{
                    emptyText: '没有意向客户数据'
                  }}
                />
              ) : (
                <Table
                  className="h-[34vw] overflow-y-auto overflow-x-auto w-full"
                  dataSource={comments}
                  columns={commentColumns}
                  rowKey="comment_id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total: number) => `共 ${total} 条评论`,
                    locale: {
                      items_per_page: '条/页',
                      jump_to: '跳至',
                      jump_to_confirm: '确定',
                      page: '页',
                      prev_page: '上一页',
                      next_page: '下一页',
                      prev_5: '向前 5 页',
                      next_5: '向后 5 页',
                      prev_3: '向前 3 页',
                      next_3: '向后 3 页'
                    }
                  }}
                  locale={{
                    emptyText: '没有选中的评论'
                  }}
                />
              )}
            </Spin>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default TemplateManager;
