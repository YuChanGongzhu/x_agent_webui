import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  id: number;
  note_id: number;
  content: string;
  author: string;
  likes: number;
}

interface Task {
  dag_run_id: string;
  state: string;
  start_date: string;
  end_date: string;
  note: string;
  conf: string;
}

const DataCollect: React.FC = () => {
  // State for form inputs
  const [keyword, setKeyword] = useState('');
  const [maxNotes, setMaxNotes] = useState(100);
  const [maxComments, setMaxComments] = useState(50);
  
  // State for data
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // State for loading and errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch keywords on component mount
  useEffect(() => {
    fetchKeywords();
  }, []);

  // Fetch keywords from API
  const fetchKeywords = async () => {
    try {
      setLoading(true);
      // In a real application, this would be an API call
      // const response = await axios.get('/api/keywords');
      // setKeywords(response.data);
      
      // Mock data for demonstration
      setTimeout(() => {
        setKeywords(['美妆', '护肤', '时尚', '旅行', '美食']);
        setSelectedKeyword('美妆');
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('获取关键词失败');
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
      // In a real application, this would be an API call
      // const response = await axios.post('/api/tasks/notes', {
      //   keyword,
      //   max_notes: maxNotes
      // });
      
      // Mock successful response
      setTimeout(() => {
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '_');
        const newTask = {
          dag_run_id: `xhs_notes_${timestamp}`,
          state: 'running',
          start_date: new Date().toISOString(),
          end_date: '',
          note: '',
          conf: JSON.stringify({ keyword, max_notes: maxNotes })
        };
        
        setTasks([newTask, ...tasks]);
        setSuccess(`成功创建笔记采集任务，任务ID: ${newTask.dag_run_id}`);
        setLoading(false);
        setKeyword('');
      }, 1000);
    } catch (err) {
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
      // In a real application, this would be an API call
      // const response = await axios.post('/api/tasks/comments', {
      //   keyword: selectedKeyword,
      //   max_comments: maxComments
      // });
      
      // Mock successful response
      setTimeout(() => {
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '_');
        const newTask = {
          dag_run_id: `xhs_comments_${timestamp}`,
          state: 'running',
          start_date: new Date().toISOString(),
          end_date: '',
          note: '',
          conf: JSON.stringify({ keyword: selectedKeyword, max_comments: maxComments })
        };
        
        setTasks([newTask, ...tasks]);
        setSuccess(`成功创建笔记评论收集任务，任务ID: ${newTask.dag_run_id}`);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError('创建笔记评论收集任务失败');
      setLoading(false);
    }
  };

  // Fetch recent tasks
  useEffect(() => {
    fetchRecentTasks();
  }, []);

  const fetchRecentTasks = async () => {
    try {
      setLoading(true);
      // In a real application, this would be an API call
      // const response = await axios.get('/api/tasks/recent');
      // setTasks(response.data);
      
      // Mock data for demonstration
      setTimeout(() => {
        const mockTasks = [
          {
            dag_run_id: 'xhs_notes_20230715_123045',
            state: 'success',
            start_date: '2023-07-15T12:30:45Z',
            end_date: '2023-07-15T12:45:30Z',
            note: '',
            conf: JSON.stringify({ keyword: '美妆', max_notes: 100 })
          },
          {
            dag_run_id: 'xhs_comments_20230714_093012',
            state: 'running',
            start_date: '2023-07-14T09:30:12Z',
            end_date: '',
            note: '',
            conf: JSON.stringify({ keyword: '护肤', max_comments: 50 })
          }
        ];
        setTasks(mockTasks);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('获取最近任务失败');
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
      // In a real application, this would be an API call
      // const response = await axios.get(`/api/notes?keyword=${keyword}`);
      // setNotes(response.data);
      
      // Mock data for demonstration
      setTimeout(() => {
        const mockNotes = Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          title: `${keyword}相关笔记 ${i + 1}`,
          content: `这是一篇关于${keyword}的笔记内容，包含了很多有用的信息...`,
          author: `用户${i + 1}`,
          likes: Math.floor(Math.random() * 1000),
          comments: Math.floor(Math.random() * 100),
          keyword: keyword,
          note_url: `https://example.com/note/${i + 1}`,
          collected_at: new Date().toISOString()
        }));
        setNotes(mockNotes);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('获取笔记数据失败');
      setLoading(false);
    }
  };

  const fetchComments = async (keyword: string) => {
    try {
      setLoading(true);
      // In a real application, this would be an API call
      // const response = await axios.get(`/api/comments?keyword=${keyword}`);
      // setComments(response.data);
      
      // Mock data for demonstration
      setTimeout(() => {
        const mockComments = Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          note_id: Math.floor(i / 2) + 1,
          content: `这是对${keyword}笔记的评论，我觉得很有用...`,
          author: `评论用户${i + 1}`,
          likes: Math.floor(Math.random() * 100)
        }));
        setComments(mockComments);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('获取评论数据失败');
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-blue-700">本页面用于从小红书收集数据并创建数据采集任务</p>
      </div>

      {/* Create Notes Collection Task */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">创建笔记采集任务</h2>
        <form onSubmit={handleCreateNotesTask} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">关键字</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="输入关键字"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">采集笔记数量</label>
              <input
                type="number"
                value={maxNotes}
                onChange={(e) => setMaxNotes(parseInt(e.target.value))}
                min={1}
                max={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {loading ? '处理中...' : '创建笔记采集任务'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">最近的笔记采集任务</h2>
        {tasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    配置
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.dag_run_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.conf}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">没有找到笔记采集任务记录</p>
        )}
      </div>

      <div className="border-t border-gray-200 my-6"></div>

      {/* Keyword Selection and Comment Collection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">选择关键字</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择关键字</label>
            <select
              value={selectedKeyword}
              onChange={(e) => setSelectedKeyword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
        <button
          onClick={handleCreateCommentsTask}
          disabled={loading || !selectedKeyword}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          {loading ? '处理中...' : '创建笔记评论收集任务'}
        </button>
      </div>

      <div className="border-t border-gray-200 my-6"></div>

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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作者</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">点赞数</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">评论数</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">采集时间</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {notes.map((note) => (
                    <tr key={note.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{note.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <a href={note.note_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {note.title}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{note.author}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{note.likes}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{note.comments}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(note.collected_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-yellow-600">⚠️ 没有找到相关笔记数据</p>
        )}
      </div>

      <div className="border-t border-gray-200 my-6"></div>

      {/* Display Collected Comments */}
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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作者</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">点赞数</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {comments.map((comment) => (
                    <tr key={comment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{comment.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comment.note_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">{comment.content}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comment.author}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comment.likes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-yellow-600">⚠️ 没有找到相关评论数据</p>
        )}
      </div>

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
