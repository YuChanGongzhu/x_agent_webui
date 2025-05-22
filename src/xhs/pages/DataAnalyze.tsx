import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getIntentCustomersApi, CustomerIntent, CustomerIntentResponse } from '../../api/mysql';
import { triggerDagRun, getDagRuns } from '../../api/airflow';

interface Comment {
  id: number;
  note_id: number;
  content: string;
  author: string;
  likes: number;
  keyword: string;
  note_url: string;
}

// Using the CustomerIntent interface imported from mysql.ts

interface AnalysisTask {
  dag_run_id: string;
  state: string;
  start_date: string;
  end_date: string;
  conf: string;
}

const DataAnalyze: React.FC = () => {
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
  const [intents, setIntents] = useState<string[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<string>('全部');
  const [selectedIntent, setSelectedIntent] = useState<string>('全部');
  const [filteredIntents, setFilteredIntents] = useState<CustomerIntent[]>([]);
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // State for tab navigation
  const [activeTab, setActiveTab] = useState<'comments' | 'intents'>('comments');
  
  // Pagination function
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // State for loading and errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load filtered comments from session storage on component mount
  useEffect(() => {
    const storedComments = sessionStorage.getItem('filtered_comments');
    if (storedComments) {
      try {
        const parsedComments = JSON.parse(storedComments);
        setFilteredComments(parsedComments);
      } catch (err) {
        setError('解析评论数据失败');
      }
    }
    
    // Fetch customer intent data
    fetchCustomerIntents();
  }, []);
  
  // 这里已经在上面定义了paginate函数，所以这里不需要重复定义

  // Fetch customer intent data
  const fetchCustomerIntents = async () => {
    try {
      setLoading(true);
      
      // Using the actual API to fetch customer intent data
      const response = await getIntentCustomersApi();
      
      if (response && response.data) {
        const intentData = response.data.records || [];
        setCustomerIntents(intentData);
        setFilteredIntents(intentData);
        
        // Extract unique keywords and intents
        const uniqueKeywords = ['全部'];
        const uniqueIntents = ['全部'];
        
        // Add keywords from the filters if available
        if (response.data.filters && response.data.filters.keywords) {
          uniqueKeywords.push(...response.data.filters.keywords);
        } else {
          // Fallback to extracting from records
          const keywordsFromData = [...new Set(intentData.map(item => item.keyword).filter(Boolean))];
          uniqueKeywords.push(...keywordsFromData);
        }
        
        // Add intents from the filters if available
        if (response.data.filters && response.data.filters.intents) {
          uniqueIntents.push(...response.data.filters.intents);
        } else {
          // Fallback to extracting from records
          const intentsFromData = [...new Set(intentData.map(item => item.intent).filter(Boolean))];
          uniqueIntents.push(...intentsFromData);
        }
        
        setKeywords(uniqueKeywords);
        setIntents(uniqueIntents);
      } else {
        setCustomerIntents([]);
        setFilteredIntents([]);
        setKeywords(['全部']);
        setIntents(['全部']);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customer intent data:', err);
      setError('获取客户意向数据失败');
      setLoading(false);
    }
  };

  // Start analysis task
  const handleStartAnalysis = async () => {
    if (filteredComments.length === 0) {
      setError('没有可分析的评论数据');
      return;
    }

    try {
      setLoading(true);
      
      // Using the actual API to start an analysis task
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '_');
      const payload = {
        profile_sentence: profileSentence,
        comment_ids: filteredComments.map(c => c.id).slice(0, 20) // Limit to 20 comments
      };
      
      // Use the correct DAG ID
      const dagId = 'comments_analyzer';
      const dagRunId = `${dagId}_${timestamp}`;
      
      // Prepare configuration
      const conf = {
        profile_sentence: profileSentence,
        comment_ids: filteredComments.map(c => c.id).slice(0, 20) // Limit to 20 comments
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
      //   dag_run_id: dagRunId,
      //   conf: payload
      // });
      
      setAnalysisTask(newTask);
      setAnalysisStatus('running');
      setSuccess('已提交分析任务，任务ID: ' + newTask.dag_run_id);
      setLoading(false);
    } catch (err) {
      console.error('Error starting analysis task:', err);
      setError('提交分析任务失败');
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
          setSuccess('分析任务已完成！');
          
          // Fetch the updated customer intent data
          fetchCustomerIntents();
        } else if (currentState === 'failed') {
          setAnalysisStatus('failed');
          setError('分析任务失败，请检查日志');
        } else {
          // Still running
          setSuccess('分析任务仍在执行中，请稍后再次检查');
        }
      } else {
        setError('无法获取任务状态，请稍后再试');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error checking analysis task status:', err);
      setError('检查分析任务状态失败');
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
      setError('没有可导出的数据');
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
      
      setSuccess('数据导出成功');
    } catch (err) {
      setError('导出数据失败');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-blue-700">本页面用于分析和分类小红书评论数据。</p>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('comments')}
              className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${activeTab === 'comments' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              评论数据
            </button>
            <button
              onClick={() => setActiveTab('intents')}
              className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${activeTab === 'intents' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              意向客户
            </button>
          </nav>
        </div>
      </div>
      
      {/* Comments Tab Content */}
      {activeTab === 'comments' && filteredComments.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">已加载过滤后的评论数据</h2>
          <p className="mb-4">共 {filteredComments.length} 条评论</p>
          
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">笔记ID</th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comment.note_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <a href={comment.note_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                          {comment.note_url}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comment.keyword}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                        <div className="line-clamp-3 hover:line-clamp-none">
                          {comment.content || '无内容'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comment.author}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comment.likes}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            
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
                          className={`px-3 py-1 mx-1 rounded ${currentPage === pageNum ? 'bg-primary text-white' : 'border border-gray-300'}`}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">用户画像描述（可选）</label>
            <textarea
              value={profileSentence}
              onChange={(e) => setProfileSentence(e.target.value)}
              placeholder="例如：这是一个对美妆产品感兴趣的年轻女性用户群体..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">添加用户画像描述可以帮助AI更好地理解评论背景</p>
          </div>
          
          <button
            onClick={handleStartAnalysis}
            disabled={loading || analysisStatus === 'running'}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {loading ? '处理中...' : '分析内容'}
          </button>
        </div>
      ) : activeTab === 'comments' ? (
        <div className="bg-yellow-50 p-4 rounded-lg mb-6">
          <p className="text-yellow-700">没有找到过滤后的评论数据，请先在数据预处理页面进行过滤</p>
        </div>
      ) : null}

      {/* Analysis Task Status */}
      {analysisTask && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">分析任务状态</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">任务ID:</p>
              <p className="font-medium">{analysisTask.dag_run_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">状态:</p>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                analysisTask.state === 'success' ? 'bg-green-100 text-green-800' :
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
            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md">
              分析任务已完成
            </div>
          )}
        </div>
      )}

      {/* Customer Intent Data - Only show in Intents Tab */}
      {activeTab === 'intents' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">意向客户数据</h2>
          <p className="mb-4 text-gray-600">本部分展示已分析的意向客户数据，可通过关键词和意向类型进行筛选</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">按关键词筛选</label>
            <select
              value={selectedKeyword}
              onChange={(e) => setSelectedKeyword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            >
              {keywords.map((keyword) => (
                <option key={keyword} value={keyword}>{keyword}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">按意向类型筛选</label>
            <select
              value={selectedIntent}
              onChange={(e) => setSelectedIntent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            >
              {intents.map((intent) => (
                <option key={intent} value={intent}>{intent}</option>
              ))}
            </select>
          </div>
        </div>
        
        {filteredIntents.length > 0 ? (
          <>
            <p className="mb-2">找到 {filteredIntents.length} 条意向客户数据</p>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作者</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">意向</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">关键词</th>
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
                        <div className="line-clamp-3 hover:line-clamp-none">{item.content}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          item.intent === '高意向' ? 'bg-green-100 text-green-800' :
                          item.intent === '中意向' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.intent}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.keyword}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
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
                            className={`px-3 py-1 mx-1 rounded ${currentPage === pageNum ? 'bg-primary text-white' : 'border border-gray-300'}`}
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
            
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              导出筛选后的意向客户数据
            </button>
          </>
        ) : (
          <p className="text-yellow-600">未找到符合条件的意向客户数据</p>
        )}
      </div>
      )}

      {/* Success and Error Messages */}
      {success && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md">
          <span className="block sm:inline">{success}</span>
          <button
            onClick={() => setSuccess('')}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <span className="text-green-500">×</span>
          </button>
        </div>
      )}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md">
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => setError('')}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <span className="text-red-500">×</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default DataAnalyze;
