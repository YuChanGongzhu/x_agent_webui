import React, { useState, useEffect } from 'react';
import { getIntentCustomersApi, CustomerIntent, getKeywordsApi, getXhsCommentsByKeywordApi } from '../../api/mysql';
import { triggerDagRun, getDagRuns } from '../../api/airflow';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useKeyword } from '../../context/KeywordContext';
import notifi from '../../utils/notification';
import TooltipIcon from '../../components/BaseComponents/TooltipIcon'
import Tooltipwrap from '../../components/BaseComponents/Tooltipwrap'
import BaseSelect from '../../components/BaseComponents/BaseSelect';
import BaseInput from '../../components/BaseComponents/BaseInput';
import { Button, Space, Tabs } from 'antd';
import { CheckOutlined } from '@ant-design/icons'
import { XhsComment } from '../../api/mysql';
type Comment = XhsComment;

const { TabPane } = Tabs;
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
  const [filteredIntents, setFilteredIntents] = useState<CustomerIntent[]>([]);
  const [minLikes, setMinLikes] = useState(0);
  const [minLength, setMinLength] = useState(1);
  const [filterKeywords, setFilterKeywords] = useState('');
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [refreshingTasks, setRefreshingTasks] = useState(false);

  type TabType = 'comments' | 'intents';
  // State for tab navigation
  const [activeTab, setActiveTab] = useState<TabType>('comments');

  // Pagination function
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // State for loading and errors
  const [loading, setLoading] = useState(false);

  const [originalComments, setOriginalComments] = useState<Comment[]>([]);
  const [sortFilteredComments, setSortFilteredComments] = useState<Comment[]>([]);

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
          notifi(`未找到关键词 "${keyword}" 的评论数据`, 'error');
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

    setFilteredIntents(filtered);
    // Reset to first page when filters change
    paginate(1);
  }, [selectedKeyword, selectedIntent, customerIntents]);

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
      const headers = ['ID', '评论ID', '作者', '内容', '意向', '分数', '关键词', '分析', '创建时间'];
      const csvRows = [
        headers.join(','),
        ...filteredIntents.map(item => [
          item.id,
          item.comment_id,
          item.author,
          `"${item.content.replace(/"/g, '""')}"`, // Escape quotes in content
          item.intent,
          item.score,
          item.keyword,
          `"${item.analysis.replace(/"/g, '""')}"`, // Escape quotes in analysis
          item.created_at
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');

      // Create a blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `意向客户数据_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notifi('数据导出成功', 'success');
    } catch (err) {
      notifi('导出数据失败', 'error');
    }
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
      {
        originalComments.length > 0 ? (<>

          <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as TabType)}>
            <TabPane tab="评论数据" key="analyze">
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
              </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                </div>

                {filteredIntents.length > 0 ? (
                  <>
                    <p className="mb-2">找到 {filteredIntents.length} 条意向客户数据</p>
                    <div className="w-full h-full">
                      <div className={`${analysisStatus === 'success' || analysisStatus === 'running' ? 'h-[10vh]' : 'h-[14vh]'} overflow-y-auto overflow-x-auto w-full`}>
                        <table className="w-full h-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
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
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_reply === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {item.is_reply === 1 ? '已回复' : '未回复'}
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
                              let pageNum: number = 0; // Initialize with default value
                              const totalPages = Math.ceil(filteredIntents.length / itemsPerPage);

                              // Logic to show page numbers centered around current page
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
                        导出筛选后的意向客户数据
                      </button>

                      <button
                        onClick={handleTransferToTemplateManager}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                        传递意向客户到模板管理
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-yellow-600">未找到符合条件的意向客户数据</p>
                )}
              </div>
            </TabPane>
          </Tabs>
        </>) : (<>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 h-[50vh] flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold mb-4">未找到关键词“ {selectedKeyword} ”的评论数据，请先采集/刷新数据</h2>
            <Space>
              <Button className='w-24' type="primary" onClick={() => navigate(`/xhs/collect?keyword=${selectedKeyword}&&tab=comments`)}>采集数据</Button>
              <Button className='w-24' type="default" disabled={loading} onClick={() => fetchComments(selectedKeyword)}>刷新数据</Button>
            </Space>
          </div>
        </>)
      }
    </div >
  );
};

export default DataAnalyze;
