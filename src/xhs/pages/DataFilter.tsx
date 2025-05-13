import React, { useState, useEffect } from 'react';
import { getKeywordsApi, getXhsCommentsByKeywordApi, XhsComment } from '../../api/mysql';

// Using the XhsComment interface from the API
type Comment = XhsComment;

const DataFilter: React.FC = () => {
  // State for keywords and selected keyword
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState('');
  
  // State for comments data
  const [originalComments, setOriginalComments] = useState<Comment[]>([]);
  const [filteredComments, setFilteredComments] = useState<Comment[]>([]);
  
  // State for filter conditions
  const [minLikes, setMinLikes] = useState(0);
  const [minLength, setMinLength] = useState(2);
  const [filterKeywords, setFilterKeywords] = useState('');
  
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

  // Fetch comments when selected keyword changes
  useEffect(() => {
    if (selectedKeyword) {
      fetchComments(selectedKeyword);
    }
  }, [selectedKeyword]);

  // Fetch comments from API
  const fetchComments = async (keyword: string) => {
    try {
      setLoading(true);
      // Get comments from real API endpoint
      const response = await getXhsCommentsByKeywordApi(keyword);
      
      // Check if response has data
      if (response && response.data) {
        // Extract comments from the response
        const extractedComments = response.data.records;
        
        if (extractedComments && extractedComments.length > 0) {
          setOriginalComments(extractedComments);
          setFilteredComments(extractedComments);
        } else {
          // No comments found in the response
          setOriginalComments([]);
          setFilteredComments([]);
          setError(`未找到关键词 "${keyword}" 的评论数据`);
        }
      } else {
        // No data in the response
        setOriginalComments([]);
        setFilteredComments([]);
        setError('未找到评论数据');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('获取评论数据失败');
      setOriginalComments([]);
      setFilteredComments([]);
      setLoading(false);
    }
  };

  // Apply filters to comments
  const applyFilters = () => {
    if (!originalComments.length) return;

    try {
      setLoading(true);
      
      // Start with the original comments
      let filtered = [...originalComments];
      
      // Filter by minimum likes
      if (minLikes > 0) {
        filtered = filtered.filter(comment => comment.like_count >= minLikes);
      }
      
      // Filter by minimum comment length
      if (minLength > 0) {
        filtered = filtered.filter(comment => comment.content.length >= minLength);
      }
      
      // Filter by keywords
      if (filterKeywords.trim()) {
        const keywords = filterKeywords.split(',').map(k => k.trim()).filter(k => k);
        if (keywords.length > 0) {
          const pattern = new RegExp(keywords.join('|'), 'i');
          filtered = filtered.filter(comment => pattern.test(comment.content));
        }
      }
      
      // Remove duplicates (based on content)
      const uniqueContents = new Set();
      filtered = filtered.filter(comment => {
        if (uniqueContents.has(comment.content)) {
          return false;
        }
        uniqueContents.add(comment.content);
        return true;
      });
      
      // Update filtered comments
      setFilteredComments(filtered);
      setLoading(false);
    } catch (err) {
      setError('应用过滤条件时出错');
      setLoading(false);
    }
  };

  // Apply filters when filter conditions change
  useEffect(() => {
    applyFilters();
  }, [minLikes, minLength, filterKeywords]);

  // Pass data to analysis page
  const handlePassToAnalysis = () => {
    // In a real application, this would store the data in a global state or context
    // For demonstration, we'll just simulate success
    if (filteredComments.length > 0) {
      // Store in sessionStorage for demo purposes
      sessionStorage.setItem('filtered_comments', JSON.stringify(filteredComments));
      setSuccess('数据已传递到分析页面，请切换到分析标签页查看');
    } else {
      setError('没有可传递的数据');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-blue-700">本页面用于过滤和处理小红书评论数据。</p>
      </div>

      {/* Keyword Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">选择关键字</h2>
        <select
          value={selectedKeyword}
          onChange={(e) => setSelectedKeyword(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
        >
          {keywords.map((keyword) => (
            <option key={keyword} value={keyword}>{keyword}</option>
          ))}
        </select>
      </div>

      {/* Filter Conditions */}
      {originalComments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">过滤条件设置</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最小点赞数</label>
              <input
                type="number"
                value={minLikes}
                onChange={(e) => setMinLikes(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最小评论长度</label>
              <input
                type="number"
                value={minLength}
                onChange={(e) => setMinLength(parseInt(e.target.value) || 2)}
                min={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">筛选关键词（用逗号分隔）</label>
              <input
                type="text"
                value={filterKeywords}
                onChange={(e) => setFilterKeywords(e.target.value)}
                placeholder="例如：优惠,折扣,价格"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Display Original and Filtered Comments */}
      {originalComments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">评论数据</h2>
            <div className="text-sm text-gray-500">
              <span className="mr-4">原始评论数量: {originalComments.length}</span>
              <span>过滤后评论数量: {filteredComments.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">笔记链接</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作者</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">点赞数</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredComments.map((comment) => (
                  <tr key={comment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{comment.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <a href={comment.note_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                        {comment.note_url}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                      <div className="truncate max-w-xs md:max-w-md">{comment.content}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comment.nickname}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comment.like_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <button
              onClick={handlePassToAnalysis}
              disabled={loading || filteredComments.length === 0}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              传递到分析页面
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <p className="text-gray-700">加载中...</p>
          </div>
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

export default DataFilter;
