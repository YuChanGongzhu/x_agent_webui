import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Input, Select, DatePicker, TimePicker, Tooltip, Checkbox, Steps, Popover, Upload } from 'antd';
import type { StepsProps, UploadProps } from 'antd';
import { QuestionCircleOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useUser } from '../../context/UserContext';
import { UserProfileService } from '../../management/userManagement/userProfileService';

// Define the steps of the task creation process
type TaskCreationStep = '采集任务' | '过滤条件' | '回复模板';

// Props for the CreateTaskModal component
interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onFinish: (values: any) => void;
}

// Interface for template item
interface TemplateItem {
  id: string;
  content: string;
  imageUrl?: string;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  visible,
  onClose,
  onFinish
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState<TaskCreationStep>('采集任务');
  // Add state for template items
  const [commentTemplates, setCommentTemplates] = useState<TemplateItem[]>([
    { id: '1', content: '' },
    { id: '2', content: '' },
    { id: '3', content: '' }
  ]);
  const [messageTemplates, setMessageTemplates] = useState<TemplateItem[]>([
    { id: '1', content: '' },
    { id: '2', content: '' }
  ]);
  
  // Add state for data collection options (from DataCollect.tsx)
  const [availableEmails, setAvailableEmails] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [noteTypes] = useState<{value: string, label: string}[]>([
    { value: '图文', label: '图文' },
    { value: '视频', label: '视频' },
    { value: '全部', label: '全部' }
  ]);
  const [sortOptions] = useState<{value: string, label: string}[]>([
    { value: '最新', label: '最新' },
    { value: '热门', label: '热门' },
    { value: '相关性', label: '相关性' }
  ]);
  const [timeRanges] = useState<{value: string, label: string}[]>([
    { value: '一天内', label: '一天内' },
    { value: '三天内', label: '三天内' },
    { value: '一周内', label: '一周内' },
    { value: '一月内', label: '一月内' }
  ]);
  const [noteCounts] = useState<{value: number, label: string}[]>([
    { value: 10, label: '10篇' },
    { value: 20, label: '20篇' },
    { value: 50, label: '50篇' },
    { value: 100, label: '100篇' }
  ]);
  
  // Get user context
  const { isAdmin, email } = useUser();
  
  // Steps configuration
  const steps = [
    { key: '采集任务', title: '采集任务' },
    { key: '过滤条件', title: '过滤条件' },
    { key: '回复模板', title: '回复模板' }
  ];
  
  // Fetch available emails and keywords on component mount
  useEffect(() => {
    fetchAvailableEmails();
    fetchKeywords();
  }, [isAdmin, email]);
  
  // Fetch available emails
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
        } else {
          console.error('获取用户列表失败');
          // 如果获取失败，至少添加当前用户的邮箱
          if (email) {
            setAvailableEmails([email]);
          }
        }
      } catch (err) {
        console.error('获取用户列表出错:', err);
        if (email) {
          setAvailableEmails([email]);
        }
      }
    } else {
      // 非管理员只能看到自己的邮箱
      if (email) {
        setAvailableEmails([email]);
      }
    }
  };
  
  // Fetch keywords
  const fetchKeywords = async () => {
    try {
      // This would typically be an API call
      // For now, we'll use some sample data
      const keywordList = ['小红书', '美妆', '穿搭', '旅行', '美食'];
      setKeywords(keywordList);
    } catch (error) {
      console.error('Error fetching keywords:', error);
    }
  };
  
  // Handle next step button click
  const handleNextStep = async () => {
    try {
      // Validate form fields for current step
      await form.validateFields();
      
      // Move to next step based on current step
      if (currentStep === '采集任务') {
        setCurrentStep('过滤条件');
      } else if (currentStep === '过滤条件') {
        setCurrentStep('回复模板');
      } else {
        // Final step, submit the form
        const values = await form.validateFields();
        onFinish(values);
      }
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };
  
  // Handle previous step button click
  const handlePrevStep = () => {
    if (currentStep === '过滤条件') {
      setCurrentStep('采集任务');
    } else if (currentStep === '回复模板') {
      setCurrentStep('过滤条件');
    }
  };
  
  // Handle save progress button click
  const handleSaveProgress = async () => {
    try {
      const values = await form.validateFields();
      console.log('Saved progress:', values);
      // Here you would typically save the progress
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };
  
  // Handle finish button click
  const handleFinish = async () => {
    try {
      const values = await form.validateFields();
      onFinish(values);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };
  
  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case '采集任务':
        return (
          <div className="p-4">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                targetEmail: email || (availableEmails.length > 0 ? availableEmails[0] : ''),
                sortBy: sortOptions.length > 0 ? sortOptions[0].value : '',
                timeRange: timeRanges.length > 0 ? timeRanges[0].value : '',
                noteCount: noteCounts.length > 0 ? noteCounts[0].value : 10,
                noteType: noteTypes.length > 0 ? noteTypes[0].value : ''
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <Form.Item 
                  name="targetEmail" 
                  label={
                    <span className="flex items-center">
                      <span className="text-red-500 mr-1">*</span>
                      目标邮箱
                      <Tooltip title="选择目标邮箱">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: '请选择目标邮箱' }]}
                >
                  <Select placeholder="请选择目标邮箱">
                    {availableEmails.map(email => (
                      <Select.Option key={email} value={email}>{email}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item 
                  name="sortBy" 
                  label={
                    <span className="flex items-center">
                      <span className="text-red-500 mr-1">*</span>
                      排序依据
                      <Tooltip title="选择排序方式">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: '请选择排序依据' }]}
                >
                  <Select placeholder="请选择排序方式">
                    {sortOptions.map(option => (
                      <Select.Option key={option.value} value={option.value}>{option.label}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item 
                  name="keyword" 
                  label={
                    <span className="flex items-center">
                      <span className="text-red-500 mr-1">*</span>
                      采集关键词
                      <Tooltip title="输入要采集的关键词">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: '请输入采集关键词' }]}
                >
                  <Input 
                    placeholder="请输入采集关键词" 
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </Form.Item>
                
                <Form.Item 
                  name="timeRange" 
                  label={
                    <span className="flex items-center">
                      <span className="text-red-500 mr-1">*</span>
                      发布时间
                      <Tooltip title="选择发布时间范围">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: '请选择发布时间' }]}
                >
                  <Select placeholder="请选择发布时间范围">
                    {timeRanges.map(option => (
                      <Select.Option key={option.value} value={option.value}>{option.label}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item 
                  name="noteCount" 
                  label={
                    <span className="flex items-center">
                      <span className="text-red-500 mr-1">*</span>
                      采集笔记数量
                      <Tooltip title="选择要采集的笔记数量">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: '请选择采集笔记数量' }]}
                >
                  <Select placeholder="请选择采集笔记数量">
                    {noteCounts.map(option => (
                      <Select.Option key={option.value} value={option.value}>{option.label}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item 
                  name="taskTime" 
                  label={
                    <span className="flex items-center">
                      任务定时
                      <Tooltip title="选择任务执行时间（可选）">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                      <span className="text-gray-400 ml-1">(optional)</span>
                    </span>
                  }
                >
                  <div className="flex space-x-2">
                    <DatePicker 
                      className="flex-1" 
                      placeholder="2020/05/06"
                      format="YYYY/MM/DD"
                    />
                    <TimePicker 
                      className="flex-1" 
                      placeholder="Select time" 
                      format="HH:mm"
                    />
                  </div>
                </Form.Item>
                
                <Form.Item 
                  name="noteType" 
                  label={
                    <span className="flex items-center">
                      <span className="text-red-500 mr-1">*</span>
                      笔记类型
                      <Tooltip title="选择笔记类型">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: '请选择笔记类型' }]}
                >
                  <Select placeholder="请选择笔记类型">
                    {noteTypes.map(option => (
                      <Select.Option key={option.value} value={option.value}>{option.label}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            </Form>
          </div>
        );
      
      case '过滤条件':
        return (
          <div className="p-4">
            <Form
              form={form}
              layout="vertical"
              initialValues={{}}
            >
              <div className="space-y-6">
                {/* 最小点赞数 */}
                <Form.Item
                  name="minLikes"
                  label={
                    <span className="flex items-center">
                      <span className="text-red-500 mr-1">*</span>
                      最小点赞数
                      <Tooltip title="设置最小点赞数量">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: '请设置最小点赞数' }]}
                >
                  <div className="flex items-center">
                    <Input 
                      placeholder="0" 
                      type="number" 
                      min={0}
                      className="flex-1"
                    />
                    <div className="bg-gray-100 px-3 py-1 rounded-r border border-l-0 border-gray-300">
                      <span>≥</span>
                    </div>
                  </div>
                </Form.Item>
                
                {/* 最小评论数量 */}
                <Form.Item
                  name="minComments"
                  label={
                    <span className="flex items-center">
                      <span className="text-red-500 mr-1">*</span>
                      最小评论数量
                      <Tooltip title="设置最小评论数量">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: '请设置最小评论数量' }]}
                >
                  <div className="flex items-center">
                    <Input 
                      placeholder="0" 
                      type="number" 
                      min={0}
                      className="flex-1"
                    />
                    <div className="bg-gray-100 px-3 py-1 rounded-r border border-l-0 border-gray-300">
                      <span>≥</span>
                    </div>
                  </div>
                </Form.Item>
                
                {/* 用户画像等级 */}
                <Form.Item
                  name="userProfileLevel"
                  label={
                    <span className="flex items-center">
                      <span className="text-red-500 mr-1">*</span>
                      用户画像等级
                      <Tooltip title="选择用户画像等级">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: '请选择用户画像等级' }]}
                >
                  <div className="flex space-x-4">
                    <Checkbox.Group>
                      <div className="flex space-x-4">
                        <Checkbox value="high">高等级</Checkbox>
                        <Checkbox value="medium">中等级</Checkbox>
                        <Checkbox value="low">低等级</Checkbox>
                      </div>
                    </Checkbox.Group>
                  </div>
                </Form.Item>
                
                {/* 筛选关键词 */}
                <Form.Item
                  name="filterKeywords"
                  label={
                    <span className="flex items-center">
                      筛选关键词
                      <Tooltip title="输入筛选关键词，多个关键词用逗号分隔">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </span>
                  }
                >
                  <Input.TextArea 
                    placeholder="例如：品牌，价格，评价，等等" 
                    rows={4}
                    maxLength={100}
                    showCount
                  />
                </Form.Item>
              </div>
            </Form>
          </div>
        );
      
      case '回复模板':
        return (
          <div className="p-4">
            <Form
              form={form}
              layout="vertical"
              initialValues={{}}
            >
              <div className="grid grid-cols-2 gap-6">
                {/* 评论区模版 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-base font-medium">评论区模版</h3>
                    <span className="text-sm text-gray-500">操作</span>
                  </div>
                  
                  {/* 模板项目 */}
                  <div className="space-y-3">
                    {commentTemplates.map((template, index) => (
                      <div key={template.id} className="flex">
                        <Input.TextArea 
                          placeholder="请输入评论模板" 
                          autoSize 
                          className="flex-grow"
                          value={template.content}
                          onChange={(e) => {
                            const newTemplates = [...commentTemplates];
                            newTemplates[index].content = e.target.value;
                            setCommentTemplates(newTemplates);
                          }}
                        />
                        <div className="ml-2 flex items-start">
                          <Upload
                            listType="picture"
                            maxCount={1}
                            beforeUpload={(file) => {
                              // You would typically upload to server here
                              // For now just update the state with file info
                              const newTemplates = [...commentTemplates];
                              newTemplates[index].imageUrl = URL.createObjectURL(file);
                              setCommentTemplates(newTemplates);
                              return false; // Prevent auto upload
                            }}
                          >
                            <Button type="text" icon={<UploadOutlined />} className="text-blue-500 hover:text-blue-700">
                              上传图片(可选)
                            </Button>
                          </Upload>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-center">
                      <Button 
                        type="text" 
                        icon={<PlusOutlined />} 
                        className="text-gray-500"
                        onClick={() => {
                          setCommentTemplates([
                            ...commentTemplates, 
                            { id: Date.now().toString(), content: '' }
                          ]);
                        }}
                      >
                        新增
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* 私信回复模版 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-base font-medium">私信回复模版</h3>
                    <span className="text-sm text-gray-500">操作</span>
                  </div>
                  
                  {/* 模板项目 */}
                  <div className="space-y-3">
                    {messageTemplates.map((template, index) => (
                      <div key={template.id} className="flex">
                        <Input.TextArea 
                          placeholder="请输入私信模板" 
                          autoSize 
                          className="flex-grow"
                          value={template.content}
                          onChange={(e) => {
                            const newTemplates = [...messageTemplates];
                            newTemplates[index].content = e.target.value;
                            setMessageTemplates(newTemplates);
                          }}
                        />
                        <div className="ml-2 flex items-start">
                          <Upload
                            listType="picture"
                            maxCount={1}
                            beforeUpload={(file) => {
                              // You would typically upload to server here
                              // For now just update the state with file info
                              const newTemplates = [...messageTemplates];
                              newTemplates[index].imageUrl = URL.createObjectURL(file);
                              setMessageTemplates(newTemplates);
                              return false; // Prevent auto upload
                            }}
                          >
                            <Button type="text" icon={<UploadOutlined />} className="text-blue-500 hover:text-blue-700">
                              上传图片(可选)
                            </Button>
                          </Upload>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-center">
                      <Button 
                        type="text" 
                        icon={<PlusOutlined />} 
                        className="text-gray-500"
                        onClick={() => {
                          setMessageTemplates([
                            ...messageTemplates, 
                            { id: Date.now().toString(), content: '' }
                          ]);
                        }}
                      >
                        新增
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Form>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // Custom dot render function with popover
  const customDot: StepsProps['progressDot'] = (dot, { status, index }) => (
    <Popover
      content={
        <span>
          {steps[index]?.title || ''}
        </span>
      }
    >
      {dot}
    </Popover>
  );

  // Render step indicators using Ant Design Steps component with dots
  const renderStepIndicators = () => {
    const currentIndex = steps.findIndex(step => step.key === currentStep);
    
    return (
      <div className="mb-8">
        <Steps 
          current={currentIndex}
          progressDot={customDot}
          items={steps.map(step => ({
            title: step.title,
          }))}
        />
      </div>
    );
  };
  
  return (
    <Modal
      title="创建任务"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
      closeIcon={<span className="text-xl">×</span>}
    >
      {renderStepIndicators()}
      {renderStepContent()}
      
      <div className="flex justify-end p-2 border-t border-gray-100">
        <div className="flex space-x-2">
          {currentStep === '回复模板' && (
            <Button 
              onClick={handleSaveProgress}
              className="border border-gray-300 rounded"
              style={{ backgroundColor: 'white' }}
            >
              保存为任务模版
            </Button>
          )}
          <Button 
            onClick={handleSaveProgress}
            className="border border-gray-300 rounded"
            style={{ backgroundColor: 'white' }}
          >
            保存当前进度
          </Button>
          {currentStep !== '采集任务' && (
            <Button 
              onClick={handlePrevStep}
              className="border border-gray-300 rounded"
              style={{ backgroundColor: 'white' }}
            >
              上一步
            </Button>
          )}
          <Button 
            type="primary" 
            onClick={currentStep === '回复模板' ? handleFinish : handleNextStep}
            className="rounded"
            style={{ backgroundColor: '#7c3aed' }}
          >
            {currentStep === '回复模板' ? '提交任务' : '下一步'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateTaskModal;
