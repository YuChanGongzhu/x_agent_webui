import React, { useState, useEffect } from 'react';
import { getXhsCommentsByKeywordApi, XhsComment, KeywordsResponse, getCommentsKeyword } from '../../api/mysql';



// Simple spinner component
const Spinner = () => (
  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-[rgba(248,213,126,1)]"></div>
);

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

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [commentsPerPage] = useState(10);

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
      const response = await getCommentsKeyword();

      if (response && response.data) {
        const extractedKeywords = response.data;

        if (extractedKeywords.length > 0) {
          setKeywords(extractedKeywords);
          setSelectedKeyword(extractedKeywords[0]);
        } else {
          setKeywords([]);
          setError('未找到关键词');
        }
      } else {
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
      const response = await getXhsCommentsByKeywordApi(keyword);

      if (response && response.data) {
        const extractedComments = response.data.records;

        if (extractedComments && extractedComments.length > 0) {
          setOriginalComments(extractedComments);
          setFilteredComments(extractedComments);
        } else {
          setOriginalComments([]);
          setFilteredComments([]);
          setError(`未找到关键词 "${keyword}" 的评论数据`);
        }
      } else {
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

  // Change page for comments pagination
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Apply filters to comments
  const applyFilters = () => {
    if (!originalComments.length) return;

    try {
      setLoading(true);

      let filtered = [...originalComments];

      if (minLikes > 0) {
        filtered = filtered.filter(comment => comment.like_count >= minLikes);
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
      setLoading(false);
    } catch (err) {
      setError('应用过滤条件时出错');
      setLoading(false);
    }
  };

  // Apply filters when filter conditions change
  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [minLikes, minLength, filterKeywords, originalComments]);

  // Pass data to analysis page
  const handlePassToAnalysis = () => {
    if (filteredComments.length > 0) {
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
      <div className="bg-white rounded-lg shadow-md p-6 mb-2">
        <h2 className="text-lg font-semibold mb-4">选择关键字 {loading && <Spinner />}</h2>
        <select
          value={selectedKeyword}
          onChange={(e) => setSelectedKeyword(e.target.value)}
          disabled={loading}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgba(248,213,126,1)] focus:border-[rgba(248,213,126,1)]"
        >
          {keywords.map((keyword) => (
            <option key={keyword} value={keyword}>
              {keyword}
            </option>
          ))}
        </select>
      </div>

      {/* Filter Conditions */}
      {originalComments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">过滤条件设置 {loading && <Spinner />}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最小点赞数</label>
              <input
                type="number"
                value={minLikes}
                onChange={(e) => setMinLikes(parseInt(e.target.value) || 0)}
                min={0}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgba(248,213,126,1)] focus:border-[rgba(248,213,126,1)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最小评论长度</label>
              <input
                type="number"
                value={minLength}
                onChange={(e) => setMinLength(parseInt(e.target.value) || 2)}
                min={2}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgba(248,213,126,1)] focus:border-[rgba(248,213,126,1)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">筛选关键词（用逗号分隔）</label>
              <input
                type="text"
                value={filterKeywords}
                onChange={(e) => setFilterKeywords(e.target.value)}
                placeholder="例如：优惠,折扣,价格"
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[rgba(248,213,126,1)] focus:border-[rgba(248,213,126,1)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Display Original and Filtered Comments */}
      {originalComments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">评论数据 {loading && <Spinner />}</h2>
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
                  .slice((currentPage - 1) * commentsPerPage, currentPage * commentsPerPage)
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
            {filteredComments.length > commentsPerPage && (
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

                  {[...Array(Math.min(5, Math.ceil(filteredComments.length / commentsPerPage)))].map((_, i) => {
                    let pageNum: number = 0;
                    const totalPages = Math.ceil(filteredComments.length / commentsPerPage);

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
                    disabled={currentPage === Math.ceil(filteredComments.length / commentsPerPage)}
                    className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                  >
                    下一页
                  </button>
                  <button
                    onClick={() => paginate(Math.ceil(filteredComments.length / commentsPerPage))}
                    disabled={currentPage === Math.ceil(filteredComments.length / commentsPerPage)}
                    className="px-3 py-1 mx-1 rounded border border-gray-300 disabled:opacity-50"
                  >
                    末页
                  </button>
                </nav>
              </div>
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={handlePassToAnalysis}
              disabled={loading || filteredComments.length === 0}
              className="px-4 py-2 bg-[rgba(248,213,126,1)] text-white rounded-md hover:bg-[rgba(248,213,126,0.8)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(248,213,126,1)] flex items-center justify-center"
            >
              {loading ? <><Spinner /><span className="ml-2">处理中...</span></> : '传递到分析页面'}
            </button>
          </div>
        </div>
      )}

      {/* Loading spinner shown in appropriate places */}

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
