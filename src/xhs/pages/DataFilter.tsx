import React, { useState, useEffect } from 'react';
import { getXhsCommentsByKeywordApi, XhsComment, KeywordsResponse, getCommentsKeyword } from '../../api/mysql';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useKeyword } from '../../context/KeywordContext';
import SortUpOrDownButton from '../../components/BaseComponents/SortUpOrDownButton';
import Tooltipwrap from '../../components/BaseComponents/Tooltipwrap'
import notifi from '../../utils/notification';

// Simple spinner component
const Spinner = () => (
  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-[rgba(248,213,126,1)]"></div>
);

// Using the XhsComment interface from the API
type Comment = XhsComment;

const DataFilter: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, email } = useUser(); // Get user info from context
  const { latestKeyword, setLatestKeyword } = useKeyword(); // Get shared keyword context

  // State for keywords and selected keyword
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState('');

  // State for comments data
  const [originalComments, setOriginalComments] = useState<Comment[]>([]);
  const [filteredComments, setFilteredComments] = useState<Comment[]>([]);
  const [sortFilteredComments, setSortFilteredComments] = useState<Comment[]>([]);
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

  // Fetch keywords when component mounts or when email/admin status changes
  useEffect(() => {
    fetchKeywords();
  }, [email, isAdmin]); // Add email and isAdmin to dependency array

  // Fetch keywords from API
  const fetchKeywords = async () => {
    try {
      setLoading(true);
      // Filter keywords by email for non-admin users
      const response = await getCommentsKeyword(!isAdmin && email ? email : undefined);

      if (response && response.data) {
        const extractedKeywords = response.data;

        console.log(`Comments keywords for ${!isAdmin && email ? `email: ${email}` : 'admin'}:`, extractedKeywords);

        if (extractedKeywords.length > 0) {
          //获取到的关键字列表需要倒序
          const extractedKeywordsReverse = extractedKeywords.reverse();
          setKeywords(extractedKeywordsReverse);

          // 使用共享的最新关键词或默认选择第一个
          const keywordToSelect = latestKeyword && extractedKeywordsReverse.includes(latestKeyword)
            ? latestKeyword
            : extractedKeywordsReverse[0];

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

  // Change page for comments pagination
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

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
      setSortFilteredComments(filtered);
      setLoading(false);
    } catch (err) {
      notifi('应用过滤条件时出错', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [minLikes, minLength, filterKeywords, originalComments]);

  const handlePassToAnalysis = () => {
    if (filteredComments.length > 0) {
      sessionStorage.setItem('filtered_comments', JSON.stringify(filteredComments));
      notifi('数据已传递到分析页面', 'success');

      // Navigate to the analysis page after a 1-second delay
      setTimeout(() => {
        navigate('/xhs/analyze');
      }, 1000); // 1000ms = 1 second
    } else {
      notifi('没有可传递的数据', 'error');
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
          onChange={(e) => {
            const newKeyword = e.target.value;
            setSelectedKeyword(newKeyword);
            // 更新共享的最新关键词
            setLatestKeyword(newKeyword);
          }}
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
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><span className="inline-flex items-center"><span>采集时间</span><SortUpOrDownButton onUp={() => {
                    const sortFilteredComments = [...filteredComments].sort((a, b) => {
                      return new Date(a.collect_time || 0).getTime() - new Date(b.collect_time || 0).getTime();
                    })
                    setFilteredComments(sortFilteredComments);
                  }} onDown={() => {
                    const sortFilteredComments = [...filteredComments].sort((a, b) => {
                      return new Date(b.collect_time || 0).getTime() - new Date(a.collect_time || 0).getTime();
                    })
                    setFilteredComments(sortFilteredComments);
                  }} onReset={() => {
                    setFilteredComments(sortFilteredComments)
                  }} /></span></th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><span className="inline-flex items-center"><span>评论时间</span><SortUpOrDownButton onUp={() => {
                    const sortFilteredComments = [...filteredComments].sort((a, b) => {
                      return new Date(a.comment_time || 0).getTime() - new Date(b.comment_time || 0).getTime();
                    })
                    setFilteredComments(sortFilteredComments);
                  }} onDown={() => {
                    const sortFilteredComments = [...filteredComments].sort((a, b) => {
                      return new Date(b.comment_time || 0).getTime() - new Date(a.comment_time || 0).getTime();
                    })
                    setFilteredComments(sortFilteredComments);
                  }} onReset={() => {
                    setFilteredComments(sortFilteredComments)
                  }} /></span></th>
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
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{comment.collect_time ? formatDate(comment.collect_time) : '未采集'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatDate(comment.comment_time)}</td>
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
    </div>
  );
};

export default DataFilter;
