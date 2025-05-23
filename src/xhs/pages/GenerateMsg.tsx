import React, { useState } from 'react';
import { triggerDagRun, getDagRuns } from '../../api/airflow';

interface Message {
  id: number;
  content: string;
  type: 'text' | 'image';
  createdAt: string;
}

const GenerateMsg: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedMessages, setGeneratedMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('请输入提示词');
      return;
    }

    try {
      setLoading(true);
      
      // Create timestamp for unique dag_run_id
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '_');
      const dag_run_id = `xhs_content_generator_${timestamp}`;
      
      // Prepare configuration
      const conf = {
        prompt: prompt,
        type: 'text'
      };
      
      // Trigger DAG run using Airflow API
      const response = await triggerDagRun(
        "xhs_content_generator", 
        dag_run_id,
        conf
      );
      
      // Create a new message with the DAG run information
      const newMessage: Message = {
        id: Date.now(),
        content: `已提交生成请求，任务ID: ${response.dag_run_id}。\n\n提示词：${prompt}\n\n请稍后刷新页面查看生成结果。`,
        type: 'text',
        createdAt: new Date().toISOString()
      };
      
      setGeneratedMessages([newMessage, ...generatedMessages]);
      setSuccess('内容生成请求已提交！');
      setPrompt('');
      setLoading(false);
      
      // Optional: Poll for results
      // You could implement a polling mechanism to check for results
      // using getDagRuns and update the message when content is ready
    } catch (err) {
      console.error('Error generating content:', err);
      setError('内容生成请求失败');
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">小红书内容生成</h1>
      
      {/* 生成表单 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">创建新内容</h2>
        <form onSubmit={handleGenerate}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">提示词</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              rows={4}
              placeholder="例如：分享一款好用的面霜，适合干皮使用..."
            ></textarea>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {loading ? '生成中...' : '生成内容'}
          </button>
        </form>
      </div>

      {/* 已生成内容列表 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">已生成内容</h2>
        {generatedMessages.length > 0 ? (
          <div className="space-y-4">
            {generatedMessages.map((message) => (
              <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">内容 #{message.id}</h3>
                  <span className="text-sm text-gray-500">{formatDate(message.createdAt)}</span>
                </div>
                <div className="whitespace-pre-line text-gray-700">{message.content}</div>
                <div className="mt-3 flex space-x-2">
                  <button className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200">
                    复制内容
                  </button>
                  <button className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200">
                    导出
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">暂无生成内容</p>
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

export default GenerateMsg;
