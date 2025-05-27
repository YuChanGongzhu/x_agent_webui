import React, { useState, useEffect } from 'react';
import { getAllVariables, getDagRuns, triggerDagRun } from '../../api/airflow';
import { getKeywordsApi, getXhsNotesByKeywordApi, getXhsCommentsByKeywordApi } from '../../api/mysql';
import { useUser } from '../../context/UserContext';
import { UserProfileService } from '../../management/userManagement/userProfileService';

interface Keyword {
  keyword: string;
}

interface Note {
  id: number;
  title: string;
  content: string;
  author: string;
  likes: number;
  comments: number;
  keyword: string;
  note_url: string;
  collected_at: string;
}

interface Comment {
  id: string;
  note_id: string;
  note_url: string;
  content: string;
  author: string;      // 从nickname改为author
  likes: number;       // 从like_count改为likes
  created_time?: string;
  keyword: string;
  collect_time?: string;  // 添加collect_time字段
  created_at?: string;    // 添加created_at字段
  updated_at?: string;    // 添加updated_at字段
}

// Tab types
type TabType = '任务' | '笔记' | '评论';

interface Task {
  dag_run_id: string;
  state: string;
  start_date: string;
  end_date: string;
  note: string;
  conf: string;
}

const DataCollect: React.FC = () => {
  // ...原有state...
  const [refreshingKeywords, setRefreshingKeywords] = useState(false);
  // ...原有state...
  const [refreshingTasks, setRefreshingTasks] = useState(false);
  // State for tab navigation
  const [activeTab, setActiveTab] = useState<TabType>('任务');
  
  // State for form inputs
  const [keyword, setKeyword] = useState('');
  const [maxNotes, setMaxNotes] = useState(10);
  const [maxComments, setMaxComments] = useState(50);
  // 使用localStorage存储目标邮箱，确保页面刷新后仍然保持选择
  const [targetEmail, setTargetEmail] = useState(() => {
    const savedEmail = localStorage.getItem('xhs_target_email');
    return savedEmail || '';
  });
  
  // 当目标邮箱变化时，更新localStorage
  useEffect(() => {
    if (targetEmail) {
      localStorage.setItem('xhs_target_email', targetEmail);
    }
  }, [targetEmail]);
  const [availableEmails, setAvailableEmails] = useState<string[]>([]);
  
  // State for data
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(10);
  const [currentNotesPage, setCurrentNotesPage] = useState(1);
  const [notesPerPage] = useState(10);
  const [currentCommentsPage, setCurrentCommentsPage] = useState(1);
  const [commentsPerPage] = useState(10);
  
  // State for loading and errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 获取用户上下文
  const { isAdmin, email } = useUser();

  // 获取可用的邮箱列表
  useEffect(() => {
    const fetchAvailableEmails = async () => {
      if (isAdmin) {
        // 管理员可以看到所有用户的邮箱
        try {
          const response = await UserProfileService.getAllUserProfiles();
          if (response && Array.isArray(response)) {
            const emails = response
              .filter((user: { email?: string }) => user.email) // 过滤掉没有邮箱的用户
              .map((user: { email?: string }) => user.email as string);
            setAvailableEmails(emails);
            
            // 如果localStorage中有存储的邮箱且在可用列表中，则使用它
            const savedEmail = localStorage.getItem('xhs_target_email');
            if (savedEmail && emails.includes(savedEmail)) {
              setTargetEmail(savedEmail);
            } 
            // 否则，如果当前没有选择的邮箱但有可用邮箱，则选择第一个
            else if (!targetEmail && emails.length > 0) {
              setTargetEmail(emails[0]);
            }
          } else {
            console.error('获取用户列表失败');
            // 如果获取失败，至少添加当前用户的邮箱
            if (email) {
              setAvailableEmails([email]);
              // 只有在没有已选择邮箱的情况下才设置
              if (!targetEmail) {
                setTargetEmail(email);
              }
            }
          }
        } catch (err) {
          console.error('获取用户列表出错:', err);
          if (email) {
            setAvailableEmails([email]);
            // 只有在没有已选择邮箱的情况下才设置
            if (!targetEmail) {
              setTargetEmail(email);
            }
          }
        }
      } else {
        // 非管理员只能看到自己的邮箱
        if (email) {
          setAvailableEmails([email]);
          // 只有在没有已选择邮箱的情况下才设置
          if (!targetEmail) {
            setTargetEmail(email);
          }
        }
      }
    };

    fetchAvailableEmails();
  }, [isAdmin, email]);

  // Fetch keywords on component mount
  useEffect(() => {
    fetchKeywords();
    fetchRecentTasks();
  }, []);

  // Fetch keywords from API
  const fetchKeywords = async () => {
    try {
      setLoading(true);
      // Get keywords from real API endpoint
      const response = await getKeywordsApi();
      
      // Check if response has data and data has keywords
      if (response && response.data) {
        // Extract keywords from the response
        const extractedKeywords = response.data;
        
        if (extractedKeywords.length > 0) {
          setKeywords(extractedKeywords);
          setSelectedKeyword(extractedKeywords[0]);
        } else {
          // No keywords found in the response
          setKeywords([]);
          setError('未找到关键词');
        }
      } else {
        // No data in the response
        setKeywords([]);
        setError('未找到关键词数据');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching keywords:', err);
      setError('获取关键词失败');
      setKeywords([]);
      setLoading(false);
    }
  };

  // Create note collection task
  const handleCreateNotesTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      setError('请输入关键字');
      return;
    }

    try {
      setLoading(true);
      // Create timestamp for unique dag_run_id
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '_');
      const dag_run_id = `xhs_notes_${timestamp}`;
      
      // Prepare configuration
      const conf = {
        keyword,
        max_notes: maxNotes,
        email: targetEmail
      };
      
      // Trigger DAG run using Airflow API
      const response = await triggerDagRun(
        "notes_collector", 
        dag_run_id,
        conf
      );
      
      // Add new task to the list
      const newTask = {
        dag_run_id: response.dag_run_id,
        state: response.state,
        start_date: response.start_date || new Date().toISOString(),
        end_date: response.end_date || '',
        note: response.note || '',
        conf: JSON.stringify(conf)
      };
      
      setTasks([newTask, ...tasks]);
      setSuccess(`成功创建笔记采集任务，任务ID: ${newTask.dag_run_id}`);
      setLoading(false);
      setKeyword('');
      // 不清空目标邮箱，保持选择状态
      
      // Refresh task list
      fetchRecentTasks();
    } catch (err) {
      console.error('Error creating notes task:', err);
      setError('创建笔记采集任务失败');
      setLoading(false);
    }
  };

  // Create comment collection task
  const handleCreateCommentsTask = async () => {
    if (!selectedKeyword) {
      setError('请选择关键字');
      return;
    }

    try {
      setLoading(true);
      // Create timestamp for unique dag_run_id
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '_');
      const dag_run_id = `xhs_comments_${timestamp}`;
      
      // Prepare configuration
      const conf = {
        keyword: selectedKeyword,
        max_comments: maxComments,
        email: targetEmail
      };
      
      // Trigger DAG run using Airflow API
      const response = await triggerDagRun(
        "comments_collector", 
        dag_run_id,
        conf
      );
      
      // Add new task to the list
      const newTask = {
        dag_run_id: response.dag_run_id,
        state: response.state,
        start_date: response.start_date || new Date().toISOString(),
        end_date: response.end_date || '',
        note: response.note || '',
        conf: JSON.stringify(conf)
      };
      
      setTasks([newTask, ...tasks]);
      setSuccess(`成功创建笔记评论收集任务，任务ID: ${newTask.dag_run_id}`);
      setLoading(false);
      
      // Refresh task list
      fetchRecentTasks();
    } catch (err) {
      console.error('Error creating comments task:', err);
      setError('创建笔记评论收集任务失败');
      setLoading(false);
    }
  };

  // Fetch recent tasks

  // Reset pagination when notes or comments change
  useEffect(() => {
    setCurrentNotesPage(1);
  }, [notes]);
  
  useEffect(() => {
    setCurrentCommentsPage(1);
  }, [comments]);
  
  // Fetch notes and comments when selectedKeyword changes
  useEffect(() => {
    if (selectedKeyword) {
      fetchNotes(selectedKeyword);
      fetchComments(selectedKeyword);
    }
  }, [selectedKeyword]);

  const fetchRecentTasks = async () => {
    try {
      setLoading(true);
      
      // Get tasks from Airflow API directly
      let allTasks: Task[] = [];
      
      // Directly fetch DAG runs from Airflow API
      const notesResponse = await getDagRuns("notes_collector", 50, "-start_date");
      const commentsResponse = await getDagRuns("comments_collector", 50, "-start_date");
      
      console.log('Notes response from Airflow:', notesResponse);
      console.log('Comments response from Airflow:', commentsResponse);
      
      if (notesResponse && notesResponse.dag_runs) {
        const notesTasks = notesResponse.dag_runs.map((run: any) => ({
          dag_run_id: run.dag_run_id,
          state: run.state,
          start_date: run.start_date,
          end_date: run.end_date || '',
          note: run.note || '',
          conf: JSON.stringify(run.conf)
        }));
        allTasks = [...allTasks, ...notesTasks];
      }
      
      if (commentsResponse && commentsResponse.dag_runs) {
        const commentsTasks = commentsResponse.dag_runs.map((run: any) => ({
          dag_run_id: run.dag_run_id,
          state: run.state,
          start_date: run.start_date,
          end_date: run.end_date || '',
          note: run.note || '',
          conf: JSON.stringify(run.conf)
        }));
        allTasks = [...allTasks, ...commentsTasks];
      }
      
      // Sort by start_date (newest first) - ensure we're using proper date comparison
      allTasks.sort((a, b) => {
        const dateA = new Date(a.start_date).getTime();
        const dateB = new Date(b.start_date).getTime();
        return dateB - dateA; // Newest first
      });
      
      console.log('All tasks (sorted):', allTasks);
      console.log('Total tasks count:', allTasks.length);
      
      // Display all tasks without limiting
      setTasks(allTasks);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching recent tasks:', err);
      setError('获取任务列表失败');
      setLoading(false);
    }
  };

  // Fetch notes for selected keyword
  useEffect(() => {
    if (selectedKeyword) {
      fetchNotes(selectedKeyword);
      fetchComments(selectedKeyword);
    }
  }, [selectedKeyword]);

  const fetchNotes = async (keyword: string) => {
    try {
      setLoading(true);
      
      // Use the real API endpoint for notes data
      const response = await getXhsNotesByKeywordApi(keyword);
      
      // Set notes data from response
      if (response && response.code === 0 && response.data && response.data.records) {
        // Transform the API response to match the expected Note format
        const transformedNotes: Note[] = response.data.records.map((item: any) => ({
          id: item.id || 0,
          title: item.title || '',
          content: item.content || '',
          author: item.author || 'Unknown',
          likes: item.likes || 0,
          comments: item.comments || 0,
          keyword: item.keyword || keyword,
          note_url: item.note_url || '',
          collected_at: item.create_time || new Date().toISOString()
        }));
        
        setNotes(transformedNotes);
      } else {
        // Handle empty or invalid response
        setNotes([]);
        console.warn('Notes API returned invalid data format:', response);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching notes data:', err);
      setError('获取笔记数据失败');
      setNotes([]);
      setLoading(false);
    }
  };

  const fetchComments = async (keyword: string) => {
    try {
      setLoading(true);
      
      // Use the new comments API endpoint
      const response = await getXhsCommentsByKeywordApi(keyword);
      
      // Set comments data from response
      if (response && response.code === 0 && response.data && response.data.records) {
        // 将API返回的数据映射到Comment接口
        const mappedComments: Comment[] = response.data.records.map((record: any) => ({
          id: record.id?.toString() || '',
          note_id: record.note_id?.toString() || '',
          note_url: record.note_url || '',
          content: record.content || '',
          author: record.author || '',
          likes: record.likes || 0,
          keyword: record.keyword || '',
          collect_time: record.collect_time,
          created_at: record.created_at,
          updated_at: record.updated_at
        }));
        setComments(mappedComments);
      } else {
        // Handle empty or invalid response
        setComments([]);
        console.warn('Comments API returned invalid data format:', response);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching comments data:', err);
      setError('获取评论数据失败');
      setComments([]);
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };
  
  // Get current tasks for pagination
  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = tasks.slice(indexOfFirstTask, indexOfLastTask);
  
  // Change page for tasks
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Change page for notes
  const paginateNotes = (pageNumber: number) => setCurrentNotesPage(pageNumber);
  
  // Change page for comments
  const paginateComments = (pageNumber: number) => setCurrentCommentsPage(pageNumber);
  
  // Generate pagination buttons for tasks - No longer used, replaced with inline pagination
  const renderPaginationButtons = () => {
    return null;
  };

  useEffect(()=>{
    console.log("邮箱",targetEmail)
  },[targetEmail])

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-blue-50 p-4 rounded-lg mb-2">
        <p className="text-blue-700">本页面用于从小红书收集数据并创建数据采集任务</p>
      </div>

      {/* 目标邮箱选择 - 全局可用 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center">
          <div className="w-1/4">
            <label className="block text-sm font-medium text-gray-700">目标邮箱</label>
          </div>
          <div className="w-3/4">
            <select
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgba(248,213,126,1)] focus:border-[rgba(248,213,126,1)]"
            >
              {availableEmails.length === 0 ? (
                <option value="">无可用邮箱</option>
              ) : (
                availableEmails.map((email) => (
                  <option key={email} value={email}>{email}</option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-2">
        {(['任务', '笔记', '评论'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 font-medium text-sm ${activeTab === tab 
              ? 'border-b-2 border-[rgba(248,213,126,1)] text-[rgba(248,213,126,1)]' 
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Task Tab Content */}
      {activeTab === '任务' && (
        <>
          {/* Create Notes Collection Task */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-2">
            <h2 className="text-lg font-semibold mb-4">创建笔记采集任务</h2>
            <form onSubmit={handleCreateNotesTask} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">关键字</label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgba(248,213,126,1)] focus:border-[rgba(248,213,126,1)]"
                    placeholder="输入关键字"
                  />
                </div>
                <div>
                  <input type="hidden" value={targetEmail} />
                  <label className="block text-sm font-medium text-gray-700 mb-1">采集笔记数量</label>
                  <input
                    type="number"
                    value={maxNotes}
                    onChange={(e) => setMaxNotes(parseInt(e.target.value))}
                    min={1}
                    max={1000}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgba(248,213,126,1)] focus:border-[rgba(248,213,126,1)]"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-[rgba(248,213,126,1)] text-white rounded-md hover:bg-[rgba(248,213,126,0.8)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(248,213,126,1)] w-full"
                  >
                    {loading ? '处理中...' : '创建笔记采集任务'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Recent Tasks */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-2">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">最近的笔记采集任务</h2>
              <button
                onClick={async () => {
                  setRefreshingTasks(true);
                  try {
                    await fetchRecentTasks();
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
            {tasks.length > 0 ? (
              <>
                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-2">
                    显示 {indexOfFirstTask + 1} - {Math.min(indexOfLastTask, tasks.length)} 条，共 {tasks.length} 条记录
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          关键词
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          笔记数量
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          任务ID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          状态
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          开始时间
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          结束时间
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentTasks.map((task) => {
                        // Parse the configuration JSON string to extract keyword and max_notes
                        let keyword = "";
                        let maxNotes = 0;
                        try {
                          const conf = JSON.parse(task.conf);
                          keyword = conf.keyword || "";
                          maxNotes = conf.max_notes || 0;
                        } catch (e) {
                          // Handle parsing error
                          console.error("Error parsing task configuration:", e);
                        }
                        
                        return (
                          <tr key={task.dag_run_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {keyword}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {maxNotes}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {task.dag_run_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                task.state === 'success' ? 'bg-green-100 text-green-800' :
                                task.state === 'running' ? 'bg-blue-100 text-blue-800' :
                                task.state === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {task.state === 'success' ? '成功' :
                                 task.state === 'running' ? '运行中' :
                                 task.state === 'failed' ? '失败' : task.state}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(task.start_date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(task.end_date)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                
                {/* Pagination for tasks */}
                {tasks.length > tasksPerPage && (
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
                      
                      {[...Array(Math.min(5, Math.ceil(tasks.length / tasksPerPage)))].map((_, i) => {
                        let pageNum: number = 0; // Initialize with default value
                        const totalPages = Math.ceil(tasks.length / tasksPerPage);
                        
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
                        disabled={currentPage === Math.ceil(tasks.length / tasksPerPage)}
                        className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                      >
                        下一页
                      </button>
                      <button 
                        onClick={() => paginate(Math.ceil(tasks.length / tasksPerPage))}
                        disabled={currentPage === Math.ceil(tasks.length / tasksPerPage)}
                        className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                      >
                        末页
                      </button>
                    </nav>
                  </div>
                )}
              </div>
              </>
            ) : (
              <p className="text-gray-500">没有找到笔记采集任务记录</p>
            )}
          </div>
        </>
      )}

      {/* Notes Tab Content */}
      {activeTab === '笔记' && (
        <>
          {/* Keyword Selection */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">选择关键字</h2>
              <button
                onClick={async () => {
                  setRefreshingKeywords(true);
                  try {
                    await fetchKeywords();
                  } finally {
                    setRefreshingKeywords(false);
                  }
                }}
                className={`flex items-center px-3 py-1 rounded text-[rgba(248,213,126,1)] border border-[rgba(248,213,126,1)] hover:bg-[rgba(248,213,126,1)] hover:text-white transition disabled:opacity-70 disabled:cursor-not-allowed ml-2`}
                disabled={refreshingKeywords}
                title="刷新关键词列表"
              >
                {refreshingKeywords ? (
                  <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                刷新关键词
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <select
                  value={selectedKeyword}
                  onChange={(e) => setSelectedKeyword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgba(248,213,126,1)] focus:border-[rgba(248,213,126,1)]"
                >
                  {keywords.map((kw) => (
                    <option key={kw} value={kw}>{kw}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Display Collected Notes */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">已采集的笔记</h2>
            {notes.length > 0 ? (
              <>
                <p className="mb-2">原始笔记数量: {notes.length}</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">笔记链接</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作者</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">点赞数</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">评论数</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">采集时间</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {notes
                        .slice((currentNotesPage - 1) * notesPerPage, currentNotesPage * notesPerPage)
                        .map((note) => (
                        <tr key={note.id}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{note.id}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{note.title}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            <a href={note.note_url} target="_blank" rel="noopener noreferrer" className="text-[rgba(248,213,126,1)] hover:underline break-all">
                              {note.note_url}
                            </a>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{note.author}</td>
                          <td className="px-3 py-2 text-sm text-gray-500 max-w-md">
                            <div className="line-clamp-3 hover:line-clamp-none">
                              {note.content || '无内容'}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{note.likes}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{note.comments}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatDate(note.collected_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination for notes */}
                  {notes.length > notesPerPage && (
                    <div className="flex justify-center mt-4">
                      <nav className="flex items-center">
                        <button 
                          onClick={() => paginateNotes(1)}
                          disabled={currentNotesPage === 1}
                          className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                        >
                          首页
                        </button>
                        <button 
                          onClick={() => paginateNotes(currentNotesPage - 1)}
                          disabled={currentNotesPage === 1}
                          className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                        >
                          上一页
                        </button>
                        
                        {[...Array(Math.min(5, Math.ceil(notes.length / notesPerPage)))].map((_, i) => {
                          let pageNum: number = 0; // Initialize with default value
                          const totalPages = Math.ceil(notes.length / notesPerPage);
                          
                          // Logic to show page numbers centered around current page
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentNotesPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentNotesPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentNotesPage - 2 + i;
                          }
                          
                          if (pageNum > 0 && pageNum <= totalPages) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => paginateNotes(pageNum)}
                                className={`px-3 py-1 mx-1 rounded ${currentNotesPage === pageNum ? 'bg-[rgba(248,213,126,1)] text-white' : 'border border-gray-300'}`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                          return null;
                        })}
                        
                        <button 
                          onClick={() => paginateNotes(currentNotesPage + 1)}
                          disabled={currentNotesPage === Math.ceil(notes.length / notesPerPage)}
                          className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                        >
                          下一页
                        </button>
                        <button 
                          onClick={() => paginateNotes(Math.ceil(notes.length / notesPerPage))}
                          disabled={currentNotesPage === Math.ceil(notes.length / notesPerPage)}
                          className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                        >
                          末页
                        </button>
                      </nav>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-yellow-600">⚠️ 没有找到相关笔记数据</p>
            )}
          </div>
        </>
      )}

      {/* Comments Tab Content */}
      {activeTab === '评论' && (
        <>
          {/* Keyword Selection and Comment Collection */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">选择关键字</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择关键字</label>
                <select
                  value={selectedKeyword}
                  onChange={(e) => setSelectedKeyword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgba(248,213,126,1)] focus:border-[rgba(248,213,126,1)]"
                >
                  {keywords.map((kw) => (
                    <option key={kw} value={kw}>{kw}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">采集评论笔记篇数</label>
                <input
                  type="number"
                  value={maxComments}
                  onChange={(e) => setMaxComments(parseInt(e.target.value))}
                  min={1}
                  max={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgba(248,213,126,1)] focus:border-[rgba(248,213,126,1)]"
                />
              </div>
            </div>
            <button
              onClick={handleCreateCommentsTask}
              disabled={loading || !selectedKeyword}
              className="px-4 py-2 bg-[rgba(248,213,126,1)] text-white rounded-md hover:bg-[rgba(248,213,126,0.8)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(248,213,126,1)]"
            >
              {loading ? '处理中...' : '创建笔记评论收集任务'}
            </button>
          </div>
        </>
      )}

      {/* Display Collected Comments - Only shown in the Comments tab */}
      {activeTab === '评论' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">已采集的评论</h2>
          {comments.length > 0 ? (
            <>
              <p className="mb-2">原始评论数量: {comments.length}</p>
              <div className="overflow-x-auto">
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
                    {comments
                      .slice((currentCommentsPage - 1) * commentsPerPage, currentCommentsPage * commentsPerPage)
                      .map((comment) => (
                      <tr key={comment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{comment.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comment.note_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <a href={comment.note_url} target="_blank" rel="noopener noreferrer" className="text-[rgba(248,213,126,1)] hover:underline break-all">
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
                {comments.length > commentsPerPage && (
                  <div className="flex justify-center mt-4">
                    <nav className="flex items-center">
                      <button 
                        onClick={() => paginateComments(1)}
                        disabled={currentCommentsPage === 1}
                        className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                      >
                        首页
                      </button>
                      <button 
                        onClick={() => paginateComments(currentCommentsPage - 1)}
                        disabled={currentCommentsPage === 1}
                        className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                      >
                        上一页
                      </button>
                      
                      {[...Array(Math.min(5, Math.ceil(comments.length / commentsPerPage)))].map((_, i) => {
                        let pageNum: number = 0; // Initialize with default value
                        const totalPages = Math.ceil(comments.length / commentsPerPage);
                        
                        // Logic to show page numbers centered around current page
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentCommentsPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentCommentsPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentCommentsPage - 2 + i;
                        }
                        
                        if (pageNum > 0 && pageNum <= totalPages) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => paginateComments(pageNum)}
                              className={`px-3 py-1 mx-1 rounded ${currentCommentsPage === pageNum ? 'bg-[rgba(248,213,126,1)] text-white' : 'border border-gray-300'}`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                        return null;
                      })}
                      
                      <button 
                        onClick={() => paginateComments(currentCommentsPage + 1)}
                        disabled={currentCommentsPage === Math.ceil(comments.length / commentsPerPage)}
                        className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                      >
                        下一页
                      </button>
                      <button 
                        onClick={() => paginateComments(Math.ceil(comments.length / commentsPerPage))}
                        disabled={currentCommentsPage === Math.ceil(comments.length / commentsPerPage)}
                        className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                      >
                        末页
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-yellow-600">⚠️ 没有找到相关评论数据</p>
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

export default DataCollect;
