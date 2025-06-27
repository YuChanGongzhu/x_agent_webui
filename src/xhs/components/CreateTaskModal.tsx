import React, { useState } from 'react';
import { Modal, Button, Form, Input, Select, DatePicker, TimePicker, Tooltip, Checkbox, Steps, Popover, Upload } from 'antd';
import type { StepsProps, UploadProps } from 'antd';
import { QuestionCircleOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';

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
  
  // Steps configuration
  const steps = [
    { key: '采集任务', title: '采集任务' },
    { key: '过滤条件', title: '过滤条件' },
    { key: '回复模板', title: '回复模板' }
  ];
  
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
              initialValues={{}}
            >
              <div className="grid grid-cols-2 gap-4">
                <Form.Item 
                  name="targetSetting" 
                  label={
                    <span className="flex items-center">
                      <span className="text-red-500 mr-1">*</span>
                      目标设备
                      <Tooltip title="选择目标设备类型">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: '请选择目标设备' }]}
                >
                  <Select placeholder="Please select">
                    <Select.Option value="mobile">移动设备</Select.Option>
                    <Select.Option value="desktop">桌面设备</Select.Option>
                    <Select.Option value="tablet">平板设备</Select.Option>
                  </Select>
                </Form.Item>
                
                <Form.Item 
                  name="rankingPosition" 
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
                  <Select placeholder="Please select">
                    <Select.Option value="popular">热门排序</Select.Option>
                    <Select.Option value="latest">最新排序</Select.Option>
                    <Select.Option value="relevant">相关性排序</Select.Option>
                  </Select>
                </Form.Item>
                
                <Form.Item 
                  name="collectionKeyword" 
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
                  <Input placeholder="Please select" />
                </Form.Item>
                
                <Form.Item 
                  name="publishTime" 
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
                  <Select placeholder="Please select">
                    <Select.Option value="today">今天</Select.Option>
                    <Select.Option value="week">本周</Select.Option>
                    <Select.Option value="month">本月</Select.Option>
                    <Select.Option value="year">今年</Select.Option>
                  </Select>
                </Form.Item>
                
                <Form.Item 
                  name="collectionCount" 
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
                  <Select placeholder="Please select">
                    <Select.Option value="10">10篇</Select.Option>
                    <Select.Option value="20">20篇</Select.Option>
                    <Select.Option value="50">50篇</Select.Option>
                    <Select.Option value="100">100篇</Select.Option>
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
                  <Select placeholder="Please select">
                    <Select.Option value="text">图文</Select.Option>
                    <Select.Option value="video">视频</Select.Option>
                    <Select.Option value="all">全部</Select.Option>
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
