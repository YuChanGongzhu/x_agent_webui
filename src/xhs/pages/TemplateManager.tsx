import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Tabs, Spin, Checkbox, Tag, Pagination } from 'antd';
import { DeleteOutlined, EditOutlined, SendOutlined, ImportOutlined, PlusOutlined, CheckSquareOutlined } from '@ant-design/icons';
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

  // 处理模板创建
  const handleAddTemplate = async () => {
    // 确保有email才能创建模板
    if (!email) {
      message.error('用户邮箱不能为空，无法创建模板');
      return;
    }

    try {
      setLoading(true);
      const response = await createReplyTemplateApi({
        content: templateContent,
        email: email // 使用当前用户的邮箱
      });

      console.log(`Adding template for user: ${email}`);

      if (response.code === 0) {
        message.success('添加模板成功');
        setTemplateContent('');
        setIsModalVisible(false);
        fetchTemplates(); // 刷新模板列表
      } else {
        message.error(response.message || '添加模板失败');
      }
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
      const response = await updateReplyTemplateApi(editingTemplate.id, {
        content: templateContent,
        email: email // 使用当前用户的邮箱
      });

      console.log(`Updating template ${editingTemplate.id} for user: ${email}`);

      if (response.code === 0) {
        message.success('更新模板成功');
        setTemplateContent('');
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
      const newDagRunId = `xhs_comments_template_replier_${timestamp}`;

      // 从 localStorage 中获取目标邮箱
      const targetEmail = localStorage.getItem('xhs_target_email') || '';

      const conf = {
        comment_ids: selectedComments,
        email: targetEmail
      };

      const response = await triggerDagRun(
        "xhs_comments_template_replier",
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

      const response = await getDagRuns("xhs_comments_template_replier", 10, "-start_date");

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
      render: (text: string) => (
        <div className="max-w-xl line-clamp-3 hover:line-clamp-none">{text}</div>
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
            onCancel={() => setIsModalVisible(false)}
            confirmLoading={loading}
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
