import React, { useState, useEffect } from 'react';
import { getIntentCustomersApi, CustomerIntent, getKeywordsApi, getXhsCommentsByKeywordApi, deleteReplyTemplateApi, getReplyTemplatesApi, updateReplyTemplateApi, createReplyTemplateApi } from '../../api/mysql';
import { triggerDagRun, getDagRuns } from '../../api/airflow';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useKeyword } from '../../context/KeywordContext';
import notifi from '../../utils/notification';
import TooltipIcon from '../../components/BaseComponents/TooltipIcon'
import Tooltipwrap from '../../components/BaseComponents/Tooltipwrap'
import BaseSelect from '../../components/BaseComponents/BaseSelect';
import BaseInput from '../../components/BaseComponents/BaseInput';
import { Button, Space, Tabs, Form, Pagination, Spin, Card, Table, Input, Modal, Upload, message, Tag } from 'antd';
import { CheckOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ExportOutlined, SendOutlined } from '@ant-design/icons'
import { XhsComment, ReplyTemplate } from '../../api/mysql';
import { dateFormat } from '../../utils/tool';
import { tencentCOSService } from '../../api/tencent_cos';
import * as XLSX from 'xlsx';
type Comment = XhsComment;

const { TabPane } = Tabs;

const { TextArea } = Input
// Using the CustomerIntent interface imported from mysql.ts

interface AnalysisTask {
  dag_run_id: string;
  state: string;
  start_date: string;
  end_date: string;
  conf: string;
}
const Spinner = () => (
  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-[rgba(248,213,126,1)]"></div>
);

const DataAnalyze: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, email } = useUser(); // Get user info from context
  const { latestKeyword, setLatestKeyword } = useKeyword(); // Get shared keyword context
  // State for filtered comments from previous page
  const [filteredComments, setFilteredComments] = useState<Comment[]>([]);
  // State for user profile description
  const [profileSentence, setProfileSentence] = useState('');
  // State for analysis task
  const [analysisTask, setAnalysisTask] = useState<AnalysisTask | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  // State for customer intent data
  const [customerIntents, setCustomerIntents] = useState<CustomerIntent[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [uniqueKeywords, setUniqueKeywords] = useState<string[]>([]);
  const [intents, setIntents] = useState<string[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<string>(latestKeyword || '全部');
  const [selectedIntent, setSelectedIntent] = useState<string>('全部');
  const [isReply, setIsReply] = useState<string>('全部');
  const [filteredIntents, setFilteredIntents] = useState<CustomerIntent[]>([]);
  const [minLikes, setMinLikes] = useState(0);
  const [minLength, setMinLength] = useState(1);
  const [filterKeywords, setFilterKeywords] = useState('');
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [refreshingTasks, setRefreshingTasks] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  type TabType = 'analyze' | 'intents';
  // State for tab navigation
  const [activeTab, setActiveTab] = useState<TabType>('analyze');

  // Pagination function
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const [totalTemplates, setTotalTemplates] = useState(0);
  // State for loading and errors
  const [loading, setLoading] = useState(false);

  const [originalComments, setOriginalComments] = useState<Comment[]>([]);
  const [sortFilteredComments, setSortFilteredComments] = useState<Comment[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [templateContent, setTemplateContent] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);
  // 新增图片上传相关状态
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [dagRunId, setDagRunId] = useState('');
  const [dagRunStatus, setDagRunStatus] = useState<string>('');
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);

  const runStatus = {
    'success': {
      'color': 'green',
      'text': '成功'
    },
    'running': {
      'color': 'blue',
      'text': '运行中'
    },
    'failed': {
      'color': 'red',
      'text': '失败'
    }
  }

  // Load filtered comments from session storage on component mount
  useEffect(() => {
    fetchKeywords();
    // Fetch customer intent data
    fetchCustomerIntents();
  }, []);

  useEffect(() => {
    if (selectedKeyword) {
      fetchComments(selectedKeyword);
    }
  }, [selectedKeyword])

  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [minLikes, minLength, filterKeywords, originalComments]);

  // 组件初始化时获取模板和评论数据
  useEffect(() => {
    // 当email可用时获取模板
    if (email) {
      console.log(`Email available, fetching templates for: ${email}`);
      fetchTemplates();
    }
  }, [email]); // 依赖于email变化

  // 传递意向客户到模板管理页面
  const handleTransferToTemplateManager = () => {
    if (filteredIntents.length === 0) {
      notifi('没有可传递的意向客户数据', 'error');
      return;
    }

    // 提取意向客户的评论IDs用于兼容性
    const commentIds = filteredIntents.map(intent => intent.comment_id).filter(Boolean);

    if (commentIds.length === 0) {
      notifi('所选意向客户中没有有效的评论ID', 'error');
      return;
    }

    // 将完整的filteredIntents数组存储到sessionStorage
    sessionStorage.setItem('filtered_intents', JSON.stringify(filteredIntents));

    // 为了兼容性，仍然保存评论IDs
    sessionStorage.setItem('selected_comment_ids', JSON.stringify(commentIds));

    // 显示成功消息
    notifi(`已成功传递 ${filteredIntents.length} 条意向客户数据到模板管理页面`, 'success');

    // 导航到模板管理页面
    setTimeout(() => {
      navigate('/xhs/templates');
    }, 500);
  };

  // 这里已经在上面定义了paginate函数，所以这里不需要重复定义

  // Fetch customer intent data
  const fetchCustomerIntents = async () => {
    try {
      setLoading(true);

      // First filter all customers by email
      const response = await getIntentCustomersApi({
        email: !isAdmin && email ? email : undefined
      });

      console.log(`Fetching customer intents for ${!isAdmin && email ? `email: ${email}` : 'admin'}`);

      if (response && response.data) {
        const intentData = response.data.records || [];
        setCustomerIntents([...intentData].reverse());
        setFilteredIntents([...intentData].reverse());

        console.log(`Found ${intentData.length} customer intents for ${!isAdmin && email ? `email: ${email}` : 'admin'}`);

        // Extract unique keywords and intents directly from the filtered data
        const uniqueKeywords = [];
        const uniqueIntents = ['全部'];

        // Extract unique keywords from the filtered data
        const keywordsFromData = [...new Set(intentData.map(item => item.keyword).filter(Boolean))];
        const keywordsFromDataReverse = keywordsFromData.reverse();
        uniqueKeywords.push(...keywordsFromDataReverse);

        // Extract unique intents from the filtered data
        const intentsFromData = [...new Set(intentData.map(item => item.intent).filter(Boolean))];
        uniqueIntents.push(...intentsFromData);

        console.log('Extracted keywords:', keywordsFromData);
        console.log('Extracted intents:', intentsFromData);

        setUniqueKeywords(uniqueKeywords);
        setIntents(uniqueIntents);
      } else {
        setCustomerIntents([]);
        setFilteredIntents([]);
        setIntents(['全部']);
        setUniqueKeywords([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching customer intent data:', err);
      notifi('获取客户意向数据失败', 'error');
      setLoading(false);
    }
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

  // Fetch keywords from API
  const fetchKeywords = async () => {
    try {
      setLoading(true);
      // Filter keywords by email for non-admin users
      const response = await getKeywordsApi(!isAdmin && email ? email : undefined);

      if (response && response.data) {
        const extractedKeywords = response.data;

        console.log(`Comments keywords for ${!isAdmin && email ? `email: ${email}` : 'admin'}:`, extractedKeywords);

        if (extractedKeywords.length > 0) {
          //获取到的关键字列表需要倒序
          const extractedKeywordsReverse = extractedKeywords.reverse();
          setKeywords(extractedKeywordsReverse);

          // 使用共享的最新关键词或默认选择第一个
          const keywordToSelect = latestKeyword
          setSelectedKeyword(keywordToSelect);
          // 更新共享的最新关键词
          setLatestKeyword(keywordToSelect);
        } else {
          setKeywords([]);
          setSelectedKeyword('');
          // Clear comments data when no keywords are found
          setOriginalComments([]);
          setFilteredComments([]);
          setSortFilteredComments([]);
          notifi('未找到关键词', 'error');
        }
      } else {
        setKeywords([]);
        setSelectedKeyword('');
        // Clear comments data when no keywords data is found
        setOriginalComments([]);
        setFilteredComments([]);
        setSortFilteredComments([]);
        notifi('未找到关键词数据', 'error');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching keywords:', err);
      notifi('获取关键词失败', 'error');
      setKeywords([]);
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

  // Fetch comments from API
  const fetchComments = async (keyword: string) => {
    try {
      setLoading(true);
      // Filter comments by email for non-admin users
      const response = await getXhsCommentsByKeywordApi(keyword, !isAdmin && email ? email : undefined);

      console.log(`Comments for ${!isAdmin && email ? `email: ${email}` : 'admin'} and keyword: ${keyword}`);

      if (response && response.data) {
        const extractedComments = response.data.records;

        if (extractedComments && extractedComments.length > 0) {
          setOriginalComments(extractedComments);
          setFilteredComments(extractedComments);
          setSortFilteredComments(extractedComments);
        } else {
          setOriginalComments([]);
          setFilteredComments([]);
          setSortFilteredComments([]);
        }
      } else {
        setOriginalComments([]);
        setFilteredComments([]);
        setSortFilteredComments([]);
        notifi('未找到评论数据', 'error');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching comments:', err);
      notifi('获取评论数据失败', 'error');
      setOriginalComments([]);
      setFilteredComments([]);
      setSortFilteredComments([]);
      setLoading(false);
    }
  };

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

  // Apply filters to comments
  const applyFilters = () => {
    if (!originalComments.length) return;

    try {
      setLoading(true);

      let filtered = [...originalComments];

      if (minLikes > 0) {
        filtered = filtered.filter(comment => comment.likes >= minLikes);
      }

      if (minLength > 0) {
        filtered = filtered.filter(comment => comment.content.length >= minLength);
      }

      if (filterKeywords.trim()) {
        const keywords = filterKeywords.split(',').map(k => k.trim()).filter(k => k);
        if (keywords.length > 0) {
          const pattern = new RegExp(keywords.join('|'), 'i');
          filtered = filtered.filter(comment => pattern.test(comment.content));
        }
      }

      const uniqueContents = new Set();
      filtered = filtered.filter(comment => {
        if (uniqueContents.has(comment.content)) {
          return false;
        }
        uniqueContents.add(comment.content);
        return true;
      });

      setFilteredComments(filtered);
      setSortFilteredComments(filtered);
      setLoading(false);
    } catch (err) {
      notifi('应用过滤条件时出错', 'error');
      setLoading(false);
    }
  };

  // Start analysis task
  const handleStartAnalysis = async () => {
    if (filteredComments.length === 0) {
      notifi('没有可分析的评论数据', 'error');
      return;
    }

    try {
      setLoading(true);

      // Using the actual API to start an analysis task
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '_');

      // Use the correct DAG ID
      const dagId = 'comments_analyzer';
      const dagRunId = `${dagId}_${timestamp}`;

      // Prepare configuration
      const conf = {
        profile_sentence: profileSentence,
        comment_ids: filteredComments.map(c => c.id) // No limit on comments
      };

      // Trigger DAG run using Airflow API
      const response = await triggerDagRun(
        dagId,
        dagRunId,
        conf
      );

      // Add new task to the list
      const newTask = {
        dag_run_id: response.dag_run_id,
        state: response.state,
        start_date: response.start_date || new Date().toISOString(),
        end_date: response.end_date || '',
        conf: JSON.stringify(conf)
      };

      setAnalysisTask(newTask);
      setAnalysisStatus('running');
      notifi('已提交分析任务，任务ID: ' + newTask.dag_run_id, 'success');
      setLoading(false);
      setActiveTab('intents')
    } catch (err) {
      console.error('Error starting analysis task:', err);
      notifi('提交分析任务失败', 'error');
      setLoading(false);
    }
  };

  // Check analysis task status
  const checkAnalysisStatus = async () => {
    if (!analysisTask) return;

    try {
      setLoading(true);

      // Get the DAG ID from the dag_run_id (format: dagId_timestamp)
      const dagId = 'comments_analyzer';
      const dagRunId = analysisTask.dag_run_id;

      // Get the specific DAG run status from Airflow API
      const response = await getDagRuns(dagId, 100, "-start_date");

      // Find the specific DAG run by ID
      const specificDagRun = response && response.dag_runs ?
        response.dag_runs.find((run: any) => run.dag_run_id === dagRunId) : null;
      console.log('Analysis task status response:', response);
      console.log('Looking for DAG run ID:', dagRunId);

      if (specificDagRun) {
        console.log('Found specific DAG run:', specificDagRun);
        const currentState = specificDagRun.state;

        // Update the analysis task with the current state
        setAnalysisTask({
          ...analysisTask,
          state: currentState,
          end_date: specificDagRun.end_date || analysisTask.end_date
        });

        if (currentState === 'success') {
          setAnalysisStatus('success');
          notifi('分析任务已完成！', 'success');

          // Fetch the updated customer intent data
          fetchCustomerIntents();
        } else if (currentState === 'failed') {
          setAnalysisStatus('failed');
          notifi('分析任务失败，请检查日志', 'error');
        } else {
          // Still running
          notifi('分析任务仍在执行中，请稍后再次检查', 'info');
        }
      } else {
        notifi('无法获取任务状态，请稍后再试', 'error');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error checking analysis task status:', err);
      notifi('检查分析任务状态失败', 'error');
      setLoading(false);
    }
  };

  // Filter customer intent data when selections change
  useEffect(() => {
    if (customerIntents.length === 0) return;

    let filtered = [...customerIntents];

    if (selectedKeyword !== '全部') {
      filtered = filtered.filter(item => item.keyword === selectedKeyword);
    }

    if (selectedIntent !== '全部') {
      filtered = filtered.filter(item => item.intent === selectedIntent);
    }

    if (isReply !== '全部') {
      filtered = filtered.filter(item => item.is_reply == isReply);
    }

    setFilteredIntents(filtered);
    // Reset to first page when filters change
    paginate(1);
  }, [selectedKeyword, selectedIntent, customerIntents, isReply]);

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  // 已移除生成文案功能

  // Export data as CSV
  const handleExportData = () => {
    if (filteredIntents.length === 0) {
      notifi('没有可导出的数据', 'error');
      return;
    }

    try {
      // Convert data to CSV format
      const headers = ['ID', '作者', '内容', '笔记链接', '意向', '关键词', '分析时间'];

      const csvRows = [
        headers,
        ...filteredIntents.map(item => [
          item.id,
          item.author,
          `"${item.content.replace(/"/g, '""')}"`, // Escape quotes in content
          item.note_url,
          item.intent,
          item.keyword,
          item.analyzed_at,
        ])
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(csvRows);

      // 设置列宽
      worksheet['!cols'] = [
        { wch: 10 }, // ID 列宽
        { wch: 15 }, // 作者 列宽
        { wch: 50 }, // 内容 列宽（设置较宽因为内容可能较长）
        { wch: 15 }, // 笔记链接 列宽
        { wch: 15 }, // 意向 列宽
        { wch: 20 }, // 关键词 列宽
        { wch: 20 }  // 分析时间 列宽
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '意向客户数据');

      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, `关键词“${selectedKeyword}”_意向客户数据_${dateFormat()}.xlsx`);
      notifi('数据导出成功', 'success');
    } catch (err) {
      notifi('导出数据失败', 'error');
      console.log(err)
    }
  };

  // 模板表格列定义
  const templateColumns = [
    {
      title: '选择',
      key: 'selection',
      width: 60,
      render: (_: any, record: ReplyTemplate) => (
        <input
          type="checkbox"
          checked={selectedTemplateIds.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedTemplateIds([...selectedTemplateIds, record.id]);
            } else {
              setSelectedTemplateIds(selectedTemplateIds.filter(id => id !== record.id));
            }
          }}
          className="h-4 w-4 text-[rgba(248,213,126,1)] focus:ring-[rgba(248,213,126,0.5)] border-gray-300 rounded"
        />
      ),
    },
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

  // 清除图片
  const handleRemoveImage = () => {
    setImageUrl('');
    setImageFile(null);
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

  const handleReachOut = async () => {
    if (selectedComments.length === 0) {
      message.warning('请至少选择一条评论');
      return;
    }

    if (selectedTemplateIds.length === 0) {
      message.warning('请至少选择一个回复模板');
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
        template_ids: selectedTemplateIds,
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
        message.success(`已提交触达任务，处理 ${selectedComments.length} 条评论，使用 ${selectedTemplateIds.length} 个模板`);
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
            fetchCustomerIntents(); // 刷新评论以更新发送状态
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

  // 添加选择/取消选择所有模板的函数
  const handleSelectAllTemplates = () => {
    if (templates.length > 0) {
      const allTemplateIds = templates.map(template => template.id);
      setSelectedTemplateIds(allTemplateIds);
    }
  };

  const handleDeselectAllTemplates = () => {
    setSelectedTemplateIds([]);
  };

  return (
    <div>
      <div className='p-6'>
        {/* Keyword Selection */}
        <BaseSelect disabled={loading} size='large' className='w-full' showSearch options={keywords.map((kw) => ({ label: kw, value: kw }))} value={selectedKeyword} onChange={(value) => {
          setSelectedKeyword(value);
          setLatestKeyword(value);
        }}>
          <h2 className="text-lg font-semibold mb-4">选择关键字 {loading && <Spinner />}</h2>
        </BaseSelect>
      </div>
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as TabType)}>
        <TabPane tab="评论数据" key="analyze">
          {originalComments.length > 0 ?
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold mb-4">过滤条件设置 {loading && <Spinner />}</h2>
                <button
                  onClick={async () => {
                    setRefreshingTasks(true);
                    try {
                      await fetchComments(selectedKeyword);
                    } finally {
                      setRefreshingTasks(false);
                    }
                  }}
                  className={`p-2 text-[rgba(248,213,126,1)] hover:text-[rgba(248,213,126,0.8)] focus:outline-none ${refreshingTasks ? 'opacity-70 cursor-not-allowed' : ''}`}
                  title="刷新任务列表"
                  disabled={refreshingTasks}
                >
                  {refreshingTasks ? (
                    <svg className="animate-spin h-5 w-5 text-[rgba(248,213,126,1)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <BaseInput size='large' type='number' className="w-full" value={minLikes} onChange={(e) => setMinLikes(parseInt(e.target.value))} onBlur={() => {
                  if (!minLikes) {
                    setMinLikes(0)
                  }
                }} min={0}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最小点赞数</label>
                </BaseInput>
                <BaseInput size='large' type='number' className="w-full" value={minLength} onChange={(e) => setMinLength(parseInt(e.target.value))} onBlur={() => {
                  if (!minLength) {
                    setMinLength(1)
                  }
                }} min={1}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最小评论长度</label>
                </BaseInput>
                <BaseInput size='large' type='text' className="w-full" value={filterKeywords} onChange={(e) => setFilterKeywords(e.target.value)} placeholder="例如：优惠,折扣,价格">
                  <label className="block text-sm font-medium text-gray-700 mb-1">筛选关键词（用逗号分隔）</label>
                </BaseInput>
              </div>
              <div className="text-sm text-gray-500 mb-4">
                已过滤出 {filteredComments.length} 条评论
              </div>
              <div className="w-full h-full">
                <div className="h-[21vw] overflow-y-auto overflow-x-auto w-full">
                  <table className="w-full h-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">笔记链接</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">关键词</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作者</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">点赞数</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredComments
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((comment) => (
                          <tr key={comment.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{comment.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <Tooltipwrap title={comment.note_url}>
                                <a href={comment.note_url} target="_blank" rel="noopener noreferrer" className="text-[rgba(248,213,126,1)] hover:underline break-all">
                                  {comment.note_url}
                                </a>
                              </Tooltipwrap>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comment.keyword}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                              <Tooltipwrap title={comment.content}>
                                {comment.content || '无内容'}
                              </Tooltipwrap>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comment.author}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comment.likes}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination for comments */}
                {filteredComments.length > itemsPerPage && (
                  <div className="flex justify-center mt-4">
                    <nav className="flex items-center">
                      <button
                        onClick={() => paginate(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                      >
                        首页
                      </button>
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                      >
                        上一页
                      </button>

                      {[...Array(Math.min(5, Math.ceil(filteredComments.length / itemsPerPage)))].map((_, i) => {
                        let pageNum: number = 0;
                        const totalPages = Math.ceil(filteredComments.length / itemsPerPage);

                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        if (pageNum > 0 && pageNum <= totalPages) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => paginate(pageNum)}
                              className={`px-3 py-1 mx-1 rounded ${currentPage === pageNum ? 'bg-[rgba(248,213,126,1)] text-white' : 'border border-gray-300'}`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                        return null;
                      })}

                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === Math.ceil(filteredComments.length / itemsPerPage)}
                        className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                      >
                        下一页
                      </button>
                      <button
                        onClick={() => paginate(Math.ceil(filteredComments.length / itemsPerPage))}
                        disabled={currentPage === Math.ceil(filteredComments.length / itemsPerPage)}
                        className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                      >
                        末页
                      </button>
                    </nav>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">用户画像描述（可选）<TooltipIcon tooltipProps={{ title: "添加用户画像描述可以帮助AI更好地理解评论背景" }} /></label>
                <textarea
                  value={profileSentence}
                  onChange={(e) => setProfileSentence(e.target.value)}
                  placeholder="例如：这是一个对美妆产品感兴趣的年轻女性用户群体..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgba(248,213,126,1)] focus:border-[rgba(248,213,126,1)]"
                  rows={3}
                />
              </div>
              <Button type='primary' onClick={handleStartAnalysis} disabled={loading || analysisStatus === 'running' || filteredComments.length === 0}>
                {loading ? '处理中...' : '分析内容'}
              </Button>
            </div> : <>
              <div className="bg-white rounded-lg shadow-md p-6 mb-6 h-[50vh] flex flex-col items-center justify-center">
                <h2 className="text-lg font-semibold mb-4">未找到关键词“ {selectedKeyword} ”的评论数据，请先采集/刷新数据</h2>
                <Space>
                  <Button className='w-24' type="primary" onClick={() => navigate(`/xhs/collect?keyword=${selectedKeyword}&&tab=comments`)}>采集数据</Button>
                  <Button className='w-24' type="default" disabled={loading} onClick={() => fetchComments(selectedKeyword)}>刷新数据</Button>
                </Space>
              </div>
            </>}
        </TabPane>
        <TabPane tab="意向客户" key="intents">
          {
            analysisTask && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-4">
                <h2 className="text-lg font-semibold mb-4">分析任务状态</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">任务ID:</p>
                    <p className="font-medium">{analysisTask.dag_run_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">状态:</p>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${analysisTask.state === 'success' ? 'bg-green-100 text-green-800' :
                      analysisTask.state === 'running' ? 'bg-blue-100 text-blue-800' :
                        analysisTask.state === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {analysisTask.state === 'success' ? '成功' :
                        analysisTask.state === 'running' ? '运行中' :
                          analysisTask.state === 'failed' ? '失败' : analysisTask.state}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">开始时间:</p>
                    <p>{formatDate(analysisTask.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">结束时间:</p>
                    <p>{analysisTask.end_date ? formatDate(analysisTask.end_date) : '-'}</p>
                  </div>
                </div>

                {analysisStatus === 'running' && (
                  <button
                    onClick={checkAnalysisStatus}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {loading ? '检查中...' : '检查分析状态'}
                  </button>
                )}

                {analysisStatus === 'success' && (

                  <Space>
                    <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md">
                      分析任务已完成
                    </div>
                    <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md cursor-pointer" onClick={() => setAnalysisStatus(null)}>
                      <CheckOutlined />
                    </div>
                  </Space>
                )}
              </div>
            )
          }
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold mb-4">意向客户数据 <TooltipIcon tooltipProps={{ title: "意向客户数据为分析后的数据，可能存在误差，请谨慎使用" }} /></h2>
              <button
                onClick={async () => {
                  setRefreshingTasks(true);
                  try {
                    await fetchCustomerIntents();
                  } finally {
                    setRefreshingTasks(false);
                  }
                }}
                className={`p-2 text-[rgba(248,213,126,1)] hover:text-[rgba(248,213,126,0.8)] focus:outline-none ${refreshingTasks ? 'opacity-70 cursor-not-allowed' : ''}`}
                title="刷新任务列表"
                disabled={refreshingTasks}
              >
                {refreshingTasks ? (
                  <svg className="animate-spin h-5 w-5 text-[rgba(248,213,126,1)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <BaseSelect size='large' className="w-full" value={selectedKeyword} showSearch options={uniqueKeywords.map((kw) => ({ label: kw, value: kw }))} onChange={(value) => {
                setSelectedKeyword(value);
                if (value !== '全部') {
                  setLatestKeyword(value);
                }
              }} >
                <label className="block text-sm font-medium text-gray-700 mb-1">按关键词筛选</label>
              </BaseSelect>
              <BaseSelect size='large' className="w-full" value={selectedIntent} showSearch options={intents.map((intent) => ({ label: intent, value: intent }))} onChange={(value) => setSelectedIntent(value)} >
                <label className="block text-sm font-medium text-gray-700 mb-1">按意向类型筛选</label>
              </BaseSelect>
              <BaseSelect size='large' className="w-full" value={isReply} showSearch options={[{ label: '全部', value: '全部' }, { label: '已回复', value: '1' }, { label: '未回复', value: '0' }]} onChange={(value) => setIsReply(value)} >
                <label className="block text-sm font-medium text-gray-700 mb-1">是否已回复</label>
              </BaseSelect>
            </div>

            {filteredIntents.length > 0 ? (
              <>
                <div className='flex mb-4 justify-between'>
                  <div className='flex items-center gap-4'>
                    <div className="text-sm text-gray-500">
                      找到 {filteredIntents.length} 条意向客户数据
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="select-all-notes"
                        checked={selectedComments.length > 0 && selectedComments.length === filteredIntents.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Select all notes
                            setSelectedComments(filteredIntents.map(intent => intent.comment_id));
                          } else {
                            // Deselect all notes
                            setSelectedComments([]);
                          }
                        }}
                        className="h-4 w-4 text-[rgba(248,213,126,1)] focus:ring-[rgba(248,213,126,0.5)] border-gray-300 rounded mr-2"
                      />
                      <label htmlFor="select-all-notes" className="text-sm text-gray-600">全选</label>
                    </div>
                  </div>
                  <div className='flex items-center'>
                    {dagRunStatus && <>
                      <div className="text-sm text-gray-500">
                        当前状态：<Tag color={runStatus[dagRunStatus as keyof typeof runStatus].color}>{runStatus[dagRunStatus as keyof typeof runStatus].text}</Tag>
                      </div>
                      <Button size='small' onClick={checkDagRunStatus} className="text-sm text-gray-500">
                        刷新状态
                      </Button>
                    </>}
                  </div>
                </div>
                <div className="w-full h-full">
                  <div className={`${analysisStatus === 'success' || analysisStatus === 'running' ? 'h-[10vh]' : 'h-[34vh]'} overflow-y-auto overflow-x-auto w-full`}>
                    <table className="w-full h-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">选择</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作者</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">意向</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">关键词</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">是否已回复</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分析时间</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredIntents
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                <input
                                  type="checkbox"
                                  checked={selectedComments.includes(item.comment_id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedComments([...selectedComments, item.comment_id]);
                                    } else {
                                      setSelectedComments(selectedComments.filter(comment_id => comment_id !== item.comment_id));
                                    }
                                  }}
                                  className="h-4 w-4 text-[rgba(248,213,126,1)] focus:ring-[rgba(248,213,126,0.5)] border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.id}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.author}</td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                                <Tooltipwrap title={item.content}>
                                  {item.content}
                                </Tooltipwrap>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.intent === '高意向' ? 'bg-green-100 text-green-800' :
                                  item.intent === '中意向' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                  {item.intent}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.keyword}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_reply == '1' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {item.is_reply == '1' ? '已回复' : '未回复'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.analyzed_at)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {filteredIntents.length > itemsPerPage && (
                    <div className="flex justify-center mt-4 mb-4">
                      <nav className="flex items-center">
                        <button
                          onClick={() => paginate(1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                        >
                          首页
                        </button>
                        <button
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                        >
                          上一页
                        </button>

                        {[...Array(Math.min(5, Math.ceil(filteredIntents.length / itemsPerPage)))].map((_, i) => {
                          let pageNum: number = 0;
                          const totalPages = Math.ceil(filteredIntents.length / itemsPerPage);

                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          if (pageNum > 0 && pageNum <= totalPages) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => paginate(pageNum)}
                                className={`px-3 py-1 mx-1 rounded ${currentPage === pageNum ? 'bg-[rgba(248,213,126,1)] text-white' : 'border border-gray-300'}`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                          return null;
                        })}

                        <button
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === Math.ceil(filteredIntents.length / itemsPerPage)}
                          className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                        >
                          下一页
                        </button>
                        <button
                          onClick={() => paginate(Math.ceil(filteredIntents.length / itemsPerPage))}
                          disabled={currentPage === Math.ceil(filteredIntents.length / itemsPerPage)}
                          className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                        >
                          末页
                        </button>
                      </nav>
                    </div>
                  )}
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={handleExportData}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    导出数据 <ExportOutlined />
                  </button>

                  <button
                    onClick={handleReachOut}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    触达用户 <SendOutlined />
                  </button>
                </div>
              </>
            ) : (
              <p className="text-yellow-600">未找到符合条件的意向客户数据</p>
            )}
          </div>
        </TabPane>
      </Tabs>
      {
        activeTab === 'intents' && <>
          <Card
            title="回复模板管理"
            extra={
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingTemplate(null);
                    setTemplateContent('');
                    setIsModalVisible(true);
                  }}
                  style={{ marginRight: '8px' }}
                >
                  添加模板
                </Button>
                {selectedTemplateIds.length > 0 ? (
                  <Button
                    onClick={handleDeselectAllTemplates}
                    style={{ marginRight: '8px' }}
                  >
                    清除选择
                  </Button>
                ) : (
                  <Button
                    onClick={handleSelectAllTemplates}
                    style={{ marginRight: '8px' }}
                  >
                    全选
                  </Button>
                )}
              </>
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
        </>
      }
    </div >
  );
};

export default DataAnalyze;
