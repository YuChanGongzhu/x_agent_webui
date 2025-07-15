import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  Spin,
  message,
  Typography,
  Breadcrumb,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Select,
  Checkbox,
  Space,
  Divider,
  Input,
  Popconfirm,
} from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  HomeOutlined,
  ExportOutlined,
  PlayCircleOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface TaskDetail {
  id: string;
  status: string;
  keyword: string;
  email: string;
  noteCount: number;
  commentCount: number;
  progress: number;
  remainingTime: string;
  noteType: string;
  timeRange: string;
  sortBy: string;
  profileSentence: string;
  userProfileLevel: string[];
  createdAt: string;
}

interface FilterResult {
  key: string;
  userName: string;
  commentContent: string;
  likeCount: number;
  customerLevel: string;
  followUpCount: number;
  reachContent: string;
}

interface ReplyTemplate {
  key: string;
  content: string;
}

const DashTaskVeiw = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterResults, setFilterResults] = useState<FilterResult[]>([]);
  const [replyTemplates, setReplyTemplates] = useState<ReplyTemplate[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetail(taskId);
      fetchFilterResults();
      fetchReplyTemplates();
    }
  }, [taskId]);

  const fetchTaskDetail = async (id: string) => {
    setLoading(true);
    try {
      // 模拟API调用
      setTimeout(() => {
        const mockData: TaskDetail = {
          id: id,
          status: "运行中",
          keyword: "关键词1",
          email: "user@example.com",
          noteCount: 300,
          commentCount: 500,
          progress: 80,
          remainingTime: "5h",
          noteType: "图文",
          timeRange: "一周内",
          sortBy: "综合",
          profileSentence: "我是做医美的，想找有意向买面膜的客户",
          userProfileLevel: ["高意向", "中意向"],
          createdAt: "2024-01-15 10:30:00",
        };
        setTaskDetail(mockData);
        setLoading(false);
      }, 1000);
    } catch (error) {
      message.error("获取任务详情失败");
      setLoading(false);
    }
  };

  const fetchFilterResults = () => {
    // 模拟筛选结果数据
    const mockFilterResults: FilterResult[] = [
      {
        key: "1",
        userName: "TradeCode 99",
        commentContent: "Vel cras auctor at tortor imperdiet amet id s",
        likeCount: 3638066,
        customerLevel: "高意向",
        followUpCount: 1,
        reachContent: "Vel cras auctor at tortor imperdiet amet id s",
      },
      {
        key: "2",
        userName: "TradeCode 98",
        commentContent: "Quam aliquam odio ullamcorper ornare elei",
        likeCount: 6462020,
        customerLevel: "高意向",
        followUpCount: 5,
        reachContent: "Quam aliquam odio ullamcorper ornare elei",
      },
      {
        key: "3",
        userName: "TradeCode 97",
        commentContent: "Mauris quam tristique et parturient sapien.",
        likeCount: 8664948,
        customerLevel: "高意向",
        followUpCount: 2,
        reachContent: "Mauris quam tristique et parturient sapien.",
      },
    ];
    setFilterResults(mockFilterResults);
  };

  const fetchReplyTemplates = () => {
    // 模拟回复模版数据
    const mockTemplates: ReplyTemplate[] = [
      {
        key: "1",
        content: "Vel cras auctor at tortor imperdiet amet id sed rhoncus.",
      },
      {
        key: "2",
        content: "Quam aliquam odio ullamcorper ornare eleifend ipsum",
      },
      {
        key: "3",
        content: "Mauris quam tristique et parturient sapien.",
      },
    ];
    setReplyTemplates(mockTemplates);
  };

  const handleBack = () => {
    navigate("/xhs/dashboard");
  };

  const handleRefresh = () => {
    if (taskId) {
      fetchTaskDetail(taskId);
      fetchFilterResults();
      fetchReplyTemplates();
    }
  };

  const handleExportData = () => {
    message.success("数据导出功能开发中...");
  };

  const handleStartTask = () => {
    message.success("任务开始/重做功能开发中...");
  };

  const handleEditTemplate = (key: string) => {
    message.success(`编辑模版 ${key}`);
  };

  const handleDeleteTemplate = (key: string) => {
    setReplyTemplates(replyTemplates.filter((template) => template.key !== key));
    message.success("删除成功");
  };

  const handleAddTemplate = () => {
    const newTemplate: ReplyTemplate = {
      key: Date.now().toString(),
      content: "新增模版内容",
    };
    setReplyTemplates([...replyTemplates, newTemplate]);
  };

  // 筛选结果表格列定义
  const filterColumns = [
    {
      title: "",
      dataIndex: "select",
      width: 50,
      render: () => <Checkbox />,
    },
    {
      title: "用户名",
      dataIndex: "userName",
      key: "userName",
      render: (text: string) => <Text style={{ color: "#1890ff" }}>{text}</Text>,
    },
    {
      title: "评论内容",
      dataIndex: "commentContent",
      key: "commentContent",
      width: 300,
    },
    {
      title: "点赞数",
      dataIndex: "likeCount",
      key: "likeCount",
      render: (count: number) => count.toLocaleString(),
    },
    {
      title: "潜在客户",
      dataIndex: "customerLevel",
      key: "customerLevel",
      render: (level: string) => (
        <Select
          defaultValue={level}
          style={{ width: 80 }}
          size="small"
          options={[
            { value: "高意向", label: "高意向" },
            { value: "中意向", label: "中意向" },
            { value: "低意向", label: "低意向" },
          ]}
        />
      ),
    },
    {
      title: "跟进数量",
      dataIndex: "followUpCount",
      key: "followUpCount",
    },
    {
      title: "触达内容",
      dataIndex: "reachContent",
      key: "reachContent",
      width: 300,
    },
  ];

  // 回复模版表格列定义
  const templateColumns = [
    {
      title: "",
      dataIndex: "select",
      width: 50,
      render: () => <Checkbox />,
    },
    {
      title: "私信内容",
      dataIndex: "content",
      key: "content",
      render: (text: string, record: ReplyTemplate) => (
        <TextArea value={text} autoSize={{ minRows: 2, maxRows: 4 }} bordered={false} readOnly />
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      render: (_: any, record: ReplyTemplate) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditTemplate(record.key)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个模版吗？"
            onConfirm={() => handleDeleteTemplate(record.key)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!taskDetail) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Text type="secondary">任务不存在或已被删除</Text>
        <Button type="primary" onClick={handleBack} className="mt-4">
          返回任务列表
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 面包屑导航 */}
      <Breadcrumb
        items={[
          {
            href: "/xhs/dashboard",
            title: <HomeOutlined />,
          },
          {
            title: "智能获客",
          },
          {
            title: taskDetail.keyword,
          },
        ]}
        className="mb-4"
      />

      {/* 标题和统计信息 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Title level={2} className="m-0">
            {taskDetail.keyword}
          </Title>
          <Space>
            <Button icon={<ExportOutlined />} onClick={handleExportData}>
              导出数据
            </Button>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStartTask}
              style={{
                background: "linear-gradient(135deg, #8389FC, #D477E1)",
                border: "none",
              }}
            >
              开始/重做
            </Button>
          </Space>
        </div>

        <Text type="secondary" className="mb-4 block">
          目标邮箱：{taskDetail.email}
        </Text>

        {/* 统计卡片 */}
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="采集笔记"
                value={taskDetail.noteCount}
                valueStyle={{ color: "#3f8600" }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="采集评论"
                value={taskDetail.commentCount}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="任务进度"
                value={taskDetail.progress}
                suffix="%"
                valueStyle={{ color: "#cf1322" }}
              />
              <Progress percent={taskDetail.progress} size="small" className="mt-2" />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="任务剩余时间"
                value={taskDetail.remainingTime}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 筛选结果 */}
      <Card
        title="筛选结果"
        extra={
          <Button icon={<ExportOutlined />} onClick={handleExportData}>
            导出数据
          </Button>
        }
        className="mb-6"
      >
        <Table
          columns={filterColumns}
          dataSource={filterResults}
          pagination={false}
          size="small"
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
        />
      </Card>

      {/* 回复模版 */}
      <Card
        title="回复模版"
        extra={
          <Button
            type="primary"
            onClick={handleAddTemplate}
            style={{
              background: "linear-gradient(135deg, #8389FC, #D477E1)",
              border: "none",
            }}
          >
            添加模版
          </Button>
        }
      >
        <Table
          columns={templateColumns}
          dataSource={replyTemplates}
          pagination={false}
          size="small"
          showHeader={false}
        />
      </Card>
    </div>
  );
};

export default DashTaskVeiw;
