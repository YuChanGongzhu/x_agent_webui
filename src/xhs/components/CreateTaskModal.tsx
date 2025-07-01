import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Input, Select, DatePicker, TimePicker, Tooltip, Checkbox, Steps, Popover, Upload, Image, message } from 'antd';
import type { StepsProps, UploadProps } from 'antd';
import { QuestionCircleOutlined, PlusOutlined, UploadOutlined, EditOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons';
import { useUser } from '../../context/UserContext';
import { UserProfileService } from '../../management/userManagement/userProfileService';
import {
  getReplyTemplatesApi,
  createReplyTemplateApi,
  updateReplyTemplateApi,
  deleteReplyTemplateApi,
  ReplyTemplate
} from '../../api/mysql';
import { tencentCOSService } from '../../api/tencent_cos';

// Define the steps of the task creation process
type TaskCreationStep = '采集任务' | '分析要求' | '回复模板';

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
  isEditing?: boolean;
  templateId?: number; // Backend template ID
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
    { id: '1', content: '', isEditing: true },
    { id: '2', content: '', isEditing: false },
    { id: '3', content: '', isEditing: false }
  ]);
  const [messageTemplates, setMessageTemplates] = useState<TemplateItem[]>([
    { id: '1', content: '', isEditing: true },
    { id: '2', content: '', isEditing: false }
  ]);
  
  // Add state for data collection options (from DataCollect.tsx)
  const [availableEmails, setAvailableEmails] = useState<string[]>([]);
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
  
  // Add state for 分析要求 step
  const [intentTypes] = useState<{value: string, label: string}[]>([
    { value: 'high', label: '高等级' },
    { value: 'medium', label: '中等级' },
    { value: 'low', label: '低等级' }
  ]);
  const [selectedIntentTypes, setSelectedIntentTypes] = useState<string[]>([]);
  const [profileSentence, setProfileSentence] = useState('');
  
  // Get user context
  const { isAdmin, email } = useUser();
  
  // Steps configuration
  const steps = [
    { key: '采集任务', title: '采集任务' },
    { key: '分析要求', title: '分析要求' },
    { key: '回复模板', title: '回复模板' }
  ];
  
  // Fetch available emails and keywords on component mount
  useEffect(() => {
    fetchAvailableEmails();
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
  
  // Add state for image upload
  const [uploadLoading, setUploadLoading] = useState(false);
  const [currentImageFile, setCurrentImageFile] = useState<{index: number, file: File} | null>(null);

  // Fetch templates from backend when modal is opened
  useEffect(() => {
    if (visible && email && currentStep === '回复模板') {
      fetchTemplates();
    }
  }, [visible, email, currentStep]);

  // Fetch templates from backend
  const fetchTemplates = async () => {
    if (!email) {
      message.error('用户邮箱不能为空，无法获取模板');
      return;
    }

    try {
      const response = await getReplyTemplatesApi({
        page: 1,
        page_size: 20,
        email: email
      });

      if (response.data?.records && response.data.records.length > 0) {
        // Map backend templates to our format
        const templates = response.data.records.map((template: ReplyTemplate) => ({
          id: template.id.toString(),
          content: template.content || '',
          imageUrl: template.image_urls || undefined,
          isEditing: false,
          templateId: template.id
        }));
        
        // Update our template state
        setCommentTemplates(templates);
      }
    } catch (error) {
      console.error('获取模板失败:', error);
      message.error('获取模板失败');
    }
  };

  // Handle next step button click
  const handleNextStep = async () => {
    try {
      // Validate form fields for current step
      await form.validateFields();
      
      // Move to next step based on current step
      if (currentStep === '采集任务') {
        setCurrentStep('分析要求');
      } else if (currentStep === '分析要求') {
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
    if (currentStep === '分析要求') {
      setCurrentStep('采集任务');
    } else if (currentStep === '回复模板') {
      setCurrentStep('分析要求');
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
  
  // Toggle template edit mode
  const toggleTemplateEditMode = (templateType: 'comment' | 'message', id: string) => {
    if (templateType === 'comment') {
      const template = commentTemplates.find(t => t.id === id);
      
      // If we're saving a template that was in edit mode
      if (template && template.isEditing) {
        // Save the template to backend
        saveTemplate(template);
      } else {
        // Just toggle edit mode
        setCommentTemplates(prev => 
          prev.map(template => 
            template.id === id 
              ? { ...template, isEditing: !template.isEditing } 
              : template
          )
        );
      }
    } else {
      setMessageTemplates(prev => 
        prev.map(template => 
          template.id === id 
            ? { ...template, isEditing: !template.isEditing } 
            : template
        )
      );
    }
  };
  
  // Save template to backend
  const saveTemplate = async (template: TemplateItem) => {
    if (!email) {
      message.error('用户邮箱不能为空，无法保存模板');
      return;
    }
    
    try {
      // If template has a backend ID, update it
      if (template.templateId) {
        // If we have a new image file to upload
        let imageUrl = template.imageUrl;
        if (currentImageFile && currentImageFile.index.toString() === template.id) {
          imageUrl = await uploadImageToCOS(template.templateId, currentImageFile.file);
          setCurrentImageFile(null);
        }
        
        const response = await updateReplyTemplateApi(template.templateId, {
          content: template.content,
          email: email,
          image_urls: imageUrl
        });
        
        if (response.code === 0) {
          message.success('更新模板成功');
          // Toggle edit mode off
          setCommentTemplates(prev => 
            prev.map(t => 
              t.id === template.id 
                ? { ...t, isEditing: false } 
                : t
            )
          );
        } else {
          message.error(response.message || '更新模板失败');
        }
      } 
      // Otherwise create a new template
      else {
        const response = await createReplyTemplateApi({
          content: template.content,
          email: email
        });
        
        if (response.code !== 0) {
          message.error(response.message || '添加模板失败');
          return;
        }
        
        // If we have an image to upload, we need to get the new template ID
        if (currentImageFile && currentImageFile.index.toString() === template.id) {
          const templatesResponse = await getReplyTemplatesApi({
            page: 1,
            page_size: 10,
            email: email
          });
          
          if (!templatesResponse.data?.records || templatesResponse.data.records.length === 0) {
            message.warning('创建模板成功，但无法上传图片');
            setCurrentImageFile(null);
            return;
          }
          
          // Get the latest template (should be the one we just created)
          const latestTemplate = templatesResponse.data.records[0];
          
          // Upload the image
          const imageUrl = await uploadImageToCOS(latestTemplate.id, currentImageFile.file);
          setCurrentImageFile(null);
          
          if (!imageUrl) {
            message.warning('模板创建成功，但图片上传失败');
            return;
          }
          
          // Update the template with the image URL
          const updateResponse = await updateReplyTemplateApi(latestTemplate.id, {
            content: template.content,
            email: email,
            image_urls: imageUrl
          });
          
          if (updateResponse.code === 0) {
            message.success('添加模板成功');
          } else {
            message.warning('模板创建成功，但更新图片失败');
          }
        } else {
          message.success('添加模板成功');
        }
        
        // Toggle edit mode off
        setCommentTemplates(prev => 
          prev.map(t => 
            t.id === template.id 
              ? { ...t, isEditing: false } 
              : t
          )
        );
      }
      
      // Refresh templates
      fetchTemplates();
    } catch (error) {
      console.error('保存模板失败:', error);
      message.error('保存模板失败');
    }
  };
  
  // Function to delete a template
  const deleteTemplate = async (templateType: 'comment' | 'message', id: string) => {
    if (templateType === 'comment') {
      const template = commentTemplates.find(t => t.id === id);
      
      // If it has a backend ID, delete it from backend
      if (template && template.templateId && email) {
        try {
          const response = await deleteReplyTemplateApi(template.templateId, email);
          
          if (response.code === 0) {
            message.success('删除模板成功');
            setCommentTemplates(prev => prev.filter(t => t.id !== id));
          } else {
            message.error(response.message || '删除模板失败');
          }
        } catch (error) {
          console.error('删除模板失败:', error);
          message.error('删除模板失败');
          return;
        }
      } else {
        // Just remove from local state
        setCommentTemplates(prev => prev.filter(t => t.id !== id));
      }
    } else {
      // For message templates, just remove from local state
      setMessageTemplates(prev => prev.filter(t => t.id !== id));
    }
  };
  
  // Upload image to COS
  const uploadImageToCOS = async (templateId: number, file: File): Promise<string> => {
    if (!file || !email) return '';

    try {
      setUploadLoading(true);

      // Create Tencent COS service instance
      const cosService = tencentCOSService;

      // Build upload path: email/templateId
      const uploadPath = `${email}/${templateId}`;

      // Upload file to Tencent COS
      const result = await cosService.uploadFile(file, uploadPath);

      return result.url;
    } catch (error) {
      console.error('上传图片到腾讯云COS失败:', error);
      message.error('上传图片失败');
      return '';
    } finally {
      setUploadLoading(false);
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
      
      case '分析要求':
        return (
          <div className="p-4">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                userProfileLevel: selectedIntentTypes,
                filterKeywords: profileSentence
              }}
            >
              <div className="space-y-6">
                {/* 用户意向等级 */}
                <Form.Item
                  name="userProfileLevel"
                  label={
                    <span className="flex items-center">
                      <span className="text-red-500 mr-1">*</span>
                      用户意向等级
                      <Tooltip title="选择用户意向等级">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </span>
                  }
                  rules={[{ required: true, message: '请选择用户意向等级' }]}
                >
                  <div className="flex space-x-4">
                    <Checkbox.Group 
                      onChange={(checkedValues) => {
                        setSelectedIntentTypes(checkedValues as string[]);
                      }}
                    >
                      <div className="flex space-x-4">
                        {intentTypes.map(type => (
                          <Checkbox key={type.value} value={type.value}>{type.label}</Checkbox>
                        ))}
                      </div>
                    </Checkbox.Group>
                  </div>
                </Form.Item>
                
                <Form.Item
                  name="filterKeywords"
                  label={
                    <span className="flex items-center">
                      输入用户画像
                      <Tooltip title="输入用户画像，例如我是做医美的，想找有意向买面膜的客户">
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
                    onChange={(e) => {
                      setProfileSentence(e.target.value);
                    }}
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
            >
              <div className="space-y-6">
                {/* 评论区模版 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-base font-medium">评论区模版</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {commentTemplates.map((template, index) => (
                      <div key={template.id} className="flex items-start">
                        <div className="flex-grow">
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
                            disabled={!template.isEditing}
                          />
                          {/* Show image preview */}
                          {template.imageUrl && (
                            <div className="mt-2 relative">
                              <Image 
                                src={template.imageUrl} 
                                alt="Template image" 
                                width={100}
                                height={100}
                                style={{ objectFit: 'cover' }}
                              />
                              {/* Show delete button only in edit mode */}
                              {template.isEditing && (
                                <Button 
                                  type="text" 
                                  danger
                                  icon={<DeleteOutlined />} 
                                  size="small"
                                  className="absolute top-0 right-0 bg-white bg-opacity-75"
                                  onClick={() => {
                                    const newTemplates = [...commentTemplates];
                                    newTemplates[index].imageUrl = undefined;
                                    setCommentTemplates(newTemplates);
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="ml-2 flex items-start">
                          {template.isEditing && (
                            <Upload
                              listType="picture"
                              maxCount={1}
                              beforeUpload={(file) => {
                                // Store the file for later upload when saving
                                setCurrentImageFile({
                                  index,
                                  file
                                });
                                
                                // Create a preview URL
                                const newTemplates = [...commentTemplates];
                                newTemplates[index].imageUrl = URL.createObjectURL(file);
                                setCommentTemplates(newTemplates);
                                
                                return false; // Prevent auto upload
                              }}
                              showUploadList={false} // Hide the default upload list
                            >
                              <Button 
                                type="text" 
                                icon={<UploadOutlined />} 
                                className="text-blue-500 hover:text-blue-700"
                                loading={uploadLoading}
                              >
                                上传图片(可选)
                              </Button>
                            </Upload>
                          )}
                          <Button 
                            type="text" 
                            icon={template.isEditing ? <SaveOutlined /> : <EditOutlined />}
                            onClick={() => toggleTemplateEditMode('comment', template.id)}
                            className={template.isEditing ? "text-green-500 hover:text-green-700" : "text-blue-500 hover:text-blue-700"}
                            loading={template.isEditing && uploadLoading}
                          >
                            {template.isEditing ? '保存' : '编辑'}
                          </Button>
                          <Button
                            type="text"
                            danger
                            onClick={() => deleteTemplate('comment', template.id)}
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-center">
                      <Button 
                        type="text" 
                        icon={<PlusOutlined />} 
                        onClick={() => {
                          const newId = (commentTemplates.length + 1).toString();
                          setCommentTemplates([
                            ...commentTemplates, 
                            { id: newId, content: '', isEditing: true }
                          ]);
                        }}
                      >
                        添加模板
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* 私信回复模版 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-base font-medium">私信回复模版</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {messageTemplates.map((template, index) => (
                      <div key={template.id} className="flex items-start">
                        <div className="flex-grow">
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
                            disabled={!template.isEditing}
                          />
                          {/* Show image preview */}
                          {template.imageUrl && (
                            <div className="mt-2 relative">
                              <Image 
                                src={template.imageUrl} 
                                alt="Template image" 
                                width={100}
                                height={100}
                                style={{ objectFit: 'cover' }}
                              />
                              {/* Show delete button only in edit mode */}
                              {template.isEditing && (
                                <Button 
                                  type="text" 
                                  danger
                                  icon={<DeleteOutlined />} 
                                  size="small"
                                  className="absolute top-0 right-0 bg-white bg-opacity-75"
                                  onClick={() => {
                                    const newTemplates = [...messageTemplates];
                                    newTemplates[index].imageUrl = undefined;
                                    setMessageTemplates(newTemplates);
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="ml-2 flex items-start">
                          {template.isEditing && (
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
                              showUploadList={false} // Hide the default upload list
                            >
                              <Button type="text" icon={<UploadOutlined />} className="text-blue-500 hover:text-blue-700">
                                上传图片(可选)
                              </Button>
                            </Upload>
                          )}
                          <Button 
                            type="text" 
                            icon={template.isEditing ? <SaveOutlined /> : <EditOutlined />}
                            onClick={() => toggleTemplateEditMode('message', template.id)}
                            className={template.isEditing ? "text-green-500 hover:text-green-700" : "text-blue-500 hover:text-blue-700"}
                          >
                            {template.isEditing ? '保存' : '编辑'}
                          </Button>
                          <Button
                            type="text"
                            danger
                            onClick={() => deleteTemplate('message', template.id)}
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-center">
                      <Button 
                        type="text" 
                        icon={<PlusOutlined />} 
                        onClick={() => {
                          const newId = (messageTemplates.length + 1).toString();
                          setMessageTemplates([
                            ...messageTemplates, 
                            { id: newId, content: '', isEditing: true }
                          ]);
                        }}
                      >
                        添加模板
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
