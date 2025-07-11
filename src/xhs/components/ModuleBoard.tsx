import React, { useState } from 'react';

interface Module {
  id: number;
  name: string;
}

const ModuleBoard: React.FC = () => {
  // 模拟模版数据
  const [modules, setModules] = useState<Module[]>([
    { id: 1, name: '模版1' },
    { id: 2, name: '模版2' },
    { id: 3, name: '模版3' },
    { id: 4, name: '模版4' },
  ]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full">
      {/* 标题和添加按钮 */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">模版库</h2>
        <button
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md flex items-center"
        >
          <span className="mr-1">+</span> 添加模版
        </button>
      </div>

      {/* 模版列表 */}
      <div className="space-y-4">
        {modules.map((module) => (
          <div
            key={module.id}
            className="flex justify-between items-center py-4 px-2 border-b border-gray-200 last:border-0"
          >
            <div className="text-gray-800">{module.name}</div>
            <div className="flex space-x-2">
              {/* 编辑按钮 */}
              <button className="p-1">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              
              {/* 删除按钮 */}
              <button className="p-1">
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              
              {/* 使用模版按钮 */}
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-md text-sm">
                使用模版
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModuleBoard;