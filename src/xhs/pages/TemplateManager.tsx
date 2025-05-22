import React, { useState, useEffect } from 'react';
import { triggerDagRun, getDagRuns } from '../../api/airflow';
import { Card, Button, Input, Form, message, Table, Modal, Checkbox, Spin, Tabs, Pagination } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import { getReplyTemplatesApi, createReplyTemplateApi, updateReplyTemplateApi, deleteReplyTemplateApi, ReplyTemplate } from '../../api/mysql';
import axios from 'axios';

const { TextArea } = Input;
const { TabPane } = Tabs;

// Comment interface
interface Comment {
  id: number;
  comment_id: string;
  author: string;
  content: string;
  note_url: string;
  is_selected?: boolean;
}

const TemplateManager: React.FC = () => {
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
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [maxComments, setMaxComments] = useState(10);
  const [dagRunId, setDagRunId] = useState('');
  const [dagRunStatus, setDagRunStatus] = useState('');

  // 组件挂载时获取模板和评论
  useEffect(() => {
    fetchTemplates();
    fetchComments();
  }, [currentPage, pageSize]);

  // 从后端获取模板
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await getReplyTemplatesApi({
        page: currentPage,
        page_size: pageSize,
        user_id: 'zacks' // 默认用户ID，可以动态设置
      });
      
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
      const response = await axios.get('/api/comments', {
        params: {
          is_sent: 0, // 只获取未发送的评论
          limit: 100
        }
      });
      
      setComments(response.data.comments || []);
    } catch (error) {
      console.error('获取评论失败:', error);
      message.error('获取评论失败');
    } finally {
      setCommentsLoading(false);
    }
  };

  // 处理模板创建
  const handleAddTemplate = async () => {
    try {
      setLoading(true);
      const response = await createReplyTemplateApi({
        content: templateContent,
        user_id: 'zacks' // 默认用户ID，可以动态设置
      });
      
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
    
    try {
      setLoading(true);
      const response = await updateReplyTemplateApi(editingTemplate.id, {
        content: templateContent,
        user_id: 'zacks' // 默认用户ID，可以动态设置
      });
      
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
    try {
      setLoading(true);
      const response = await deleteReplyTemplateApi(id, 'zacks');
      
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

  // 触发DAG以触达用户
  const handleReachOut = async () => {
    if (selectedComments.length === 0) {
      message.warning('请至少选择一条评论');
      return;
    }

    try {
      setLoading(true);
      
      // 创建唯一的dag_run_id时间戳
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '_');
      const newDagRunId = `xhs_comments_template_replier_${timestamp}`;
      
      // 准备配置
      const conf = {
        comment_ids: selectedComments,
        max_comments: maxComments
      };
      
      // 使用Airflow API触发DAG运行
      const response = await triggerDagRun(
        "xhs_comments_template_replier", 
        newDagRunId,
        conf
      );
      
      if (response && response.dag_run_id) {
        setDagRunId(response.dag_run_id);
        setDagRunStatus('running');
        message.success('已提交触达任务');
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
      width: 80,
      render: (commentId: string) => (
        <Checkbox
          checked={selectedComments.includes(commentId)}
          onChange={(e) => handleCommentSelection(commentId, e.target.checked)}
        />
      ),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 120,
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '笔记链接',
      dataIndex: 'note_url',
      key: 'note_url',
      width: 120,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          查看
        </a>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
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
                  onChange={(page) => setCurrentPage(page)}
                  onShowSizeChange={(current, size) => {
                    setCurrentPage(1);
                    setPageSize(size);
                  }}
                  showSizeChanger
                  showQuickJumper
                  showTotal={(total) => `共 ${total} 条`}
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
              <div className="mb-4 flex items-center">
                <span className="mr-2">最大处理评论数:</span>
                <Input
                  type="number"
                  style={{ width: 100 }}
                  value={maxComments}
                  onChange={(e) => setMaxComments(parseInt(e.target.value) || 10)}
                  min={1}
                  max={100}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  className="ml-4"
                  onClick={handleReachOut}
                  disabled={selectedComments.length === 0 || loading}
                >
                  触达选中用户
                </Button>
                {dagRunId && (
                  <Button
                    className="ml-2"
                    onClick={checkDagRunStatus}
                    disabled={loading}
                  >
                    检查任务状态
                  </Button>
                )}
                {dagRunStatus && (
                  <span className="ml-2">
                    当前任务状态: <strong>{dagRunStatus}</strong>
                  </span>
                )}
              </div>

              <div className="mb-2">
                已选择 {selectedComments.length} 条评论
              </div>

              <Table
                dataSource={comments}
                columns={commentColumns}
                rowKey="comment_id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                }}
              />
            </Spin>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default TemplateManager;
