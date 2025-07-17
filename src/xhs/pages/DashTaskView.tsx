import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  TableProps,
  Form,
  Modal,
  Upload,
} from "antd";
import {
  HomeOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import refresh from "../../img/refresh.svg";

import { useUserStore } from "../../store/userStore";
import {
  getIntentCustomersApi,
  getXhsNotesByKeywordApi,
  getXhsCommentsByKeywordApi,
  ReplyTemplate,
  updateReplyTemplateApi,
  createReplyTemplateApi,
  deleteReplyTemplateApi,
  getReplyTemplatesApi,
  getCommentIntents,
} from "../../api/mysql";
import { exportFilterResults, ExportData } from "../../utils/excelExport";
import VirtualList from "rc-virtual-list";
import { tencentCOSService } from "../../api/tencent_cos";
type TableRowSelection<T extends object = object> = TableProps<T>["rowSelection"];
const { Title, Text } = Typography;
const { TextArea } = Input;
const styles = {
  topData: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-around",
    flexDirection: "column" as const,
  },
  headerContainer: {
    display: "flex",
    flexWrap: "wrap" as const,
    backgroundColor: "#ffffff",
    paddingBottom: "16px",
  },
  titleSection: {
    minWidth: "300px",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleText: {
    fontSize: "1.25rem",
    color: "#333",
  },
  subtitleText: {
    fontSize: "0.875rem",
    color: "#999",
  },
  statsSection: {
    display: "flex",
    flexDirection: "row" as const,
    flex: "1 1 400px",
    minWidth: "400px",
    justifyContent: "flex-end",
    gap: "16px",
  },
  statsContainer: {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "8px",
  },
  statItem: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-around",
    flexDirection: "column" as const,
    minWidth: "80px",
  },
  statLabel: {
    fontSize: ".875rem",
    color: "#999999",
  },
  statValue: {
    fontSize: "1.5rem",
    color: "#333333",
  },
  divider: {
    backgroundColor: "#E5E5E5",
    width: "1px",
    height: "1.25rem",
    margin: "0 8px",
  },
  controlSection: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-around",
    flexDirection: "column" as const,
    minWidth: "120px",
  },
  controlLabel: {
    fontSize: ".875rem",
    color: "#999999",
  },
  controlButton: {
    background: "linear-gradient(135deg, #8389FC, #D477E1)",
    border: "1px solid #8389FC",
    borderRadius: "0.125rem",
  },
};
interface TaskDetail {
  id: string;
  status: string;
  keyword: string;
  email: string;
  noteCount: number;
  commentCount: number;
  progress: number;
  remainingTime: string;
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

interface AnalysisTask {
  dag_run_id: string;
  state: string;
  start_date: string;
  end_date: string;
  conf: string;
}

const DashTaskVeiw = () => {
  const { isAdmin, email } = useUserStore();
  const [searchParams] = useSearchParams();
  const taskKeyword = searchParams.get("keyword");
  const taskState = searchParams.get("state");
  const navigate = useNavigate();
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterResults, setFilterResults] = useState<FilterResult[]>([]);
  const [originalFilterResults, setOriginalFilterResults] = useState<FilterResult[]>([]); // 保存原始数据
  const [customerLevelFilter, setCustomerLevelFilter] = useState<string | undefined>(undefined); // 客户意向筛选
  const [replyTemplates, setReplyTemplates] = useState<ReplyTemplate[]>([]);
  const [selectedFilterRowKeys, setSelectedFilterRowKeys] = useState<React.Key[]>([]);
  const [selectedTemplateRowKeys, setSelectedTemplateRowKeys] = useState<React.Key[]>([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [editingTemplateKey, setEditingTemplateKey] = useState<string | null>(null); // 当前正在编辑的模板
  const [tempTemplateContent, setTempTemplateContent] = useState<string>(""); // 临时保存编辑内容
  const [analysisTask, setAnalysisTask] = useState<AnalysisTask | null>(null);
  // 分页相关状态
  const [currentFilterPage, setCurrentFilterPage] = useState(1);
  const [filterPageSize] = useState(5); // 每页显示5条数据
  const [refreshLoading, setRefreshLoading] = useState(false);

  // 存储评论数据
  const [commentsData, setCommentsData] = useState<any[]>([]);
  const [commentIds, setCommentIds] = useState<string[]>([]);

  // 存储分析意向结果
  const [intentResults, setIntentResults] = useState<any>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // 获取用户上下文
  //   const { isAdmin, email } = useUser();

  useEffect(() => {
    if (taskKeyword) {
      const initData = async () => {
        await fetchTaskDetail(taskKeyword); // 先获取任务详情并存储评论数据
      };
      initData();
    }
  }, [taskKeyword]);

  // 当评论数据更新时，更新筛选结果
  useEffect(() => {
    if (taskKeyword) {
      fetchFilterResults();
    }
  }, [commentsData, commentIds, taskKeyword, analysisComplete, intentResults]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchTaskDetail = async (taskKeyword: string) => {
    setLoading(true);
    try {
      // 并行获取评论和笔记数据
      const [commentsResponse, notesResponse] = await Promise.all([
        getXhsCommentsByKeywordApi(taskKeyword, !isAdmin && email ? email : undefined),
        getXhsNotesByKeywordApi(taskKeyword, !isAdmin && email ? email : undefined),
      ]);

      // 计算笔记数量
      const noteCount =
        notesResponse?.code === 0 && notesResponse?.data?.records
          ? notesResponse.data.records.length
          : 0;

      // 计算评论数量并存储评论数据
      let commentCount = 0;
      if (commentsResponse?.code === 0 && commentsResponse?.data?.records) {
        const records = commentsResponse.data.records;
        commentCount = records.length;

        // 存储评论数据
        setCommentsData(records);

        // 存储评论ID并获取分析意向结果
        const ids = records.map((comment: any) => comment.id?.toString() || "").filter((id) => id);
        setCommentIds(ids);

        if (ids.length > 0) {
          try {
            const commentIntentsResponse = await getCommentIntents(ids);

            // 设置意向分析结果
            if (commentIntentsResponse?.code === 0 && commentIntentsResponse?.data) {
              setIntentResults(commentIntentsResponse.data);
              setAnalysisComplete(true);
            } else {
              setIntentResults(null);
              setAnalysisComplete(false);
            }
          } catch (intentError) {
            console.error("获取意向分析结果失败:", intentError);
            setIntentResults(null);
            setAnalysisComplete(false);
          }
        }
      } else {
        // 清空数据
        setCommentsData([]);
        setCommentIds([]);
        setIntentResults(null);
        setAnalysisComplete(false);
      }

      // 创建任务详情对象
      const taskDetail: TaskDetail = {
        id: taskKeyword,
        status: taskState === "success" ? "成功" : taskState === "failed" ? "失败" : "运行中",
        keyword: taskKeyword,
        email: email || "user@example.com",
        noteCount: noteCount,
        commentCount: commentCount,
        progress: 0,
        remainingTime: "",
      };

      setTaskDetail(taskDetail);
      setLoading(false);
    } catch (error) {
      console.error("获取任务详情失败:", error);
      message.error("获取任务详情失败");
      setLoading(false);
    }
  };

  // 根据评论ID获取意向级别
  const getCustomerLevel = (commentId: string): string => {
    if (!analysisComplete || !intentResults?.records) {
      return "分析中";
    }

    // 在意向结果中查找匹配的评论
    const intentCustomer = intentResults.records.find(
      (record: any) => record.comment_id?.toString() === commentId
    );

    return intentCustomer?.intent || "未知";
  };

  const fetchFilterResults = () => {
    if (!taskKeyword) {
      console.log("taskKeyword为空，无法获取筛选结果");
      return;
    }
    console.log("使用存储的评论数据进行筛选结果处理");

    // 使用存储的评论数据而不是重新调用API
    if (commentsData && commentsData.length > 0) {
      console.log("使用存储的评论数据:", commentsData);
      console.log("分析完成状态:", analysisComplete);
      console.log("意向结果:", intentResults);

      // 将评论数据转换为FilterResult格式
      const transformedFilterResults: FilterResult[] = commentsData.map(
        (comment: any, index: number) => ({
          key: comment.id?.toString() || index.toString(),
          userName: comment.author || "未知用户",
          commentContent: comment.content || "无内容",
          likeCount: comment.likes || 0,
          customerLevel: getCustomerLevel(comment.id?.toString() || ""), // 使用分析结果或显示"分析中"
          followUpCount: Math.floor(Math.random() * 10) + 1, // 模拟跟评数量
          reachContent: comment.note_url || "无内容", // 触达内容使用note_url
        })
      );

      setOriginalFilterResults(transformedFilterResults);
      setFilterResults(transformedFilterResults);
      setCurrentFilterPage(1); // 重置到第一页
      console.log("转换后的筛选结果:", transformedFilterResults);
    } else {
      // 如果没有存储的数据，使用空数组
      setOriginalFilterResults([]);
      setFilterResults([]);
      setCurrentFilterPage(1); // 重置到第一页
      console.log("未找到存储的评论数据，使用空数组");
    }
  };

  // 筛选处理函数
  const handleCustomerLevelFilter = (value: string | undefined) => {
    if (!value) {
      // 如果清除选择，显示所有数据
      setCustomerLevelFilter(undefined);
      setFilterResults(originalFilterResults);
    } else {
      // 根据选择的客户意向级别筛选数据
      setCustomerLevelFilter(value);
      const filtered = originalFilterResults.filter((item) => item.customerLevel === value);
      setFilterResults(filtered);
    }
    setCurrentFilterPage(1); // 筛选后重置到第一页
  };

  const handleBack = () => {
    navigate("/xhs/dashboard");
  };

  const handleRefresh = async () => {
    if (taskKeyword) {
      setRefreshLoading(true);
      try {
        await fetchTaskDetail(taskKeyword);
        // fetchFilterResults会通过useEffect自动触发
      } catch (error) {
        console.error("刷新失败:", error);
        message.error("刷新失败，请稍后重试");
      } finally {
        setRefreshLoading(false);
      }
    }
  };

  const handleExportData = () => {
    if (!filterResults || filterResults.length === 0) {
      message.warning("暂无数据可导出");
      return;
    }

    try {
      // 转换数据格式
      const exportData: ExportData[] = filterResults.map((item) => ({
        userName: item.userName,
        commentContent: item.commentContent,
        likeCount: item.likeCount,
        customerLevel: item.customerLevel,
        reachContent: item.reachContent,
      }));

      // 导出数据
      const result = exportFilterResults(exportData, taskKeyword || "未知关键词");

      if (result.success) {
        message.success(`数据导出成功！文件名：${result.filename}`);
      } else {
        message.error(`导出失败：${result.error}`);
      }
    } catch (error) {
      console.error("导出数据失败:", error);
      message.error("导出数据失败，请稍后重试");
    }
  };

  const handleStartTask = () => {
    message.success("任务开始/重做功能开发中...");
  };

  // 响应式处理函数
  const getResponsiveStyles = () => {
    const isMobile = windowWidth <= 768;
    return {
      headerContainer: {
        ...styles.headerContainer,
        ...(isMobile && {
          flexDirection: "column" as const,
          gap: "12px",
        }),
      },
      statsSection: {
        ...styles.statsSection,
        ...(isMobile && {
          flexDirection: "column" as const,
          minWidth: "auto",
          flex: "none",
          gap: "12px",
        }),
      },
      controlSection: {
        ...styles.controlSection,
        ...(isMobile && {
          alignItems: "flex-start",
        }),
      },
    };
  };

  // 统计项组件
  const StatItem = ({
    label,
    value,
    showDivider = true,
  }: {
    label: string;
    value: string | number;
    showDivider?: boolean;
  }) => (
    <>
      <div style={styles.statItem}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </div>
      {showDivider && <div style={styles.divider} />}
    </>
  );

  // 筛选结果表格列定义
  const filterColumns = [
    {
      title: "用户名",
      dataIndex: "userName",
      key: "userName",
      render: (text: string) => <Text style={{ color: "#1890ff" }}>{text}</Text>,
      width: 150,
    },
    {
      title: "评论内容",
      dataIndex: "commentContent",
      key: "commentContent",
      width: 400,
    },
    {
      title: "点赞数",
      dataIndex: "likeCount",
      key: "likeCount",
      render: (count: number) => count.toLocaleString(),
      sorter: (a: FilterResult, b: FilterResult) => a.likeCount - b.likeCount, //第一下升序，第二下降序
    },
    {
      title: (
        <Select
          placeholder={"意向"}
          value={customerLevelFilter}
          onChange={handleCustomerLevelFilter}
          style={{
            width: 100,
            borderRadius: "4px",
          }}
          size="small"
          variant="outlined"
          allowClear
          options={[
            { value: "高意向", label: "高意向" },
            { value: "中意向", label: "中意向" },
            { value: "低意向", label: "低意向" },
            // { value: "分析中", label: "分析中" },
            // { value: "未知", label: "未知" },
          ]}
        />
      ),
      dataIndex: "customerLevel",
      key: "customerLevel",
      render: (level: string) => <Text style={{ color: "#333333" }}>{level}</Text>,
    },
    // {
    //   title: "跟评数量",
    //   dataIndex: "followUpCount",
    //   key: "followUpCount",
    //   sorter: (a: FilterResult, b: FilterResult) => a.followUpCount - b.followUpCount,
    // },
    {
      title: "触达内容",
      dataIndex: "reachContent",
      key: "reachContent",
      width: 300,
      render: (url: string) => {
        if (!url || url === "无内容") {
          return <Text type="secondary">无内容</Text>;
        }

        // 省略显示URL，只显示前30个字符
        const displayUrl = url.length > 30 ? `${url.substring(0, 30)}...` : url;

        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1890ff" }}
            title={url} // 鼠标悬停时显示完整URL
          >
            {displayUrl}
          </a>
        );
      },
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
  const onSelectedFilterChange = (selectedRowKeys: React.Key[]) => {
    console.log("筛选结果selectedRowKeys", selectedRowKeys);
    setSelectedFilterRowKeys(selectedRowKeys);
  };

  const filterRowSelection: TableRowSelection<FilterResult> = {
    selectedRowKeys: selectedFilterRowKeys,
    onChange: onSelectedFilterChange,
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #FDF3FC, #E7E9FE)",
      }}
    >
      {/* 面包屑导航 */}
      <Breadcrumb
        items={[
          {
            href: "/xhs/dashboard",
            title: <HomeOutlined />,
          },
          {
            title: taskKeyword,
          },
        ]}
        style={{
          height: "100%",
          backgroundColor: "#ffffff",
          paddingBottom: "16px",
        }}
      />
      {/* 标题和统计信息 */}
      <div style={getResponsiveStyles().headerContainer}>
        {/* 标题区域 */}
        <div style={styles.titleSection}>
          <Text style={styles.titleText}>{taskKeyword}</Text>
          {/* 目标邮箱选择 - 全局可用 */}

          <div className="flex flex-row gap-4 items-center">
            <Text style={{ fontSize: "14px" }}>目标邮箱：{email}</Text>
          </div>
        </div>

        {/* 统计和控制区域 */}
        <div style={getResponsiveStyles().statsSection}>
          {/* 统计项 */}
          <div style={styles.statsContainer}>
            <StatItem label="采集笔记" value={taskDetail.noteCount} />
            <StatItem label="采集评论" value={taskDetail.commentCount} />
            <StatItem label="分析状态" value={taskDetail.status} />
            {/* <StatItem label="任务用时" value={taskDetail.remainingTime} showDivider={false} /> */}
          </div>

          {/* 控制按钮 */}
          <div style={getResponsiveStyles().controlSection}>
            <Text style={styles.controlLabel}>任务控制</Text>
            <Button type="primary" onClick={handleStartTask} style={styles.controlButton}>
              开始/暂停
            </Button>
          </div>
        </div>
      </div>
      {/* 筛选结果 */}
      <Card
        title="筛选结果"
        extra={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button icon={<ExportOutlined />} onClick={handleExportData}>
              导出数据
            </Button>
            <Button
              icon={<img src={refresh} alt="refresh" />}
              onClick={handleRefresh}
              loading={refreshLoading}
            />
          </div>
        }
        className="m-4"
      >
        <Table
          columns={filterColumns}
          dataSource={filterResults}
          pagination={{
            current: currentFilterPage,
            pageSize: filterPageSize,
            total: filterResults.length,
            onChange: (page) => setCurrentFilterPage(page),
            showSizeChanger: false,
            showQuickJumper: false,
            showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            size: "small",
          }}
          size="small"
          rowSelection={filterRowSelection}
        />
      </Card>
      <TemplateMessage />
      {/* 回复模版 */}
    </div>
  );
};
const TemplateMessage = () => {
  const { email } = useUserStore();
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);
  const [templateContent, setTemplateContent] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTemplateLoading, setRefreshTemplateLoading] = useState(false);

  // 组件初始化时获取模板和评论数据
  useEffect(() => {
    // 当email可用时获取模板
    if (email) {
      console.log(`Email available, fetching templates for: ${email}`);
      fetchTemplates();
    }
  }, [email]); // 依赖于email变化

  const handleDeselectAllTemplates = () => {
    setSelectedTemplateIds([]);
  };

  // 添加选择/取消选择所有模板的函数
  const handleSelectAllTemplates = () => {
    if (templates.length > 0) {
      const allTemplateIds = templates.map((template) => template.id);
      setSelectedTemplateIds(allTemplateIds);
    }
  };

  // 刷新模板功能
  const handleRefreshTemplates = async () => {
    setRefreshTemplateLoading(true);
    try {
      await fetchTemplates();
      message.success("模板列表已刷新");
    } catch (error) {
      console.error("刷新模板失败:", error);
      message.error("刷新模板失败，请稍后重试");
    } finally {
      setRefreshTemplateLoading(false);
    }
  };

  // 渲染模板列表项
  const renderTemplateItem = (template: ReplyTemplate) => (
    <div
      key={template.id}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0",
        borderBottom: "1px solid #f0f0f0",
        minHeight: "48px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
        <Checkbox
          checked={selectedTemplateIds.includes(template.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedTemplateIds([...selectedTemplateIds, template.id]);
            } else {
              setSelectedTemplateIds(selectedTemplateIds.filter((id) => id !== template.id));
            }
          }}
          style={{ marginRight: "12px" }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "#333",
              fontSize: "14px",
              lineHeight: "1.4",
              wordBreak: "break-word",
            }}
          >
            {template.content}
          </div>
          {template.image_urls && (
            <div style={{ marginTop: "8px" }}>
              <img
                src={template.image_urls}
                alt="模板图片"
                style={{
                  maxWidth: "80px",
                  maxHeight: "60px",
                  objectFit: "contain",
                  borderRadius: "4px",
                }}
              />
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "12px" }}>
        <Button
          type="text"
          icon={<EditOutlined />}
          size="small"
          style={{
            color: "#8389FC",
            padding: "4px",
            minWidth: "28px",
            height: "28px",
          }}
          onClick={() => {
            setEditingTemplate(template);
            setTemplateContent(template.content);

            // 如果模板有图片URL，加载图片
            if (template.image_urls) {
              loadImageFromCOS(template.image_urls);
            } else {
              // 清空之前可能存在的图片
              setImageUrl("");
              setImageFile(null);
            }

            setIsModalVisible(true);
          }}
        />
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          size="small"
          style={{
            color: "#ff4d4f",
            padding: "4px",
            minWidth: "28px",
            height: "28px",
          }}
          onClick={() => handleDeleteTemplate(template.id)}
        />
      </div>
    </div>
  );
  // 处理模板更新
  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    // 确保有email才能更新模板
    if (!email) {
      message.error("用户邮箱不能为空，无法更新模板");
      return;
    }

    try {
      setLoading(true);

      // 如果有新图片，先上传到腾讯云COS
      let imageUrlCOS = imageUrl;
      console.log("Initial imageUrl value:", imageUrl);

      if (imageFile) {
        // 使用现有模板ID上传图片
        console.log("Uploading new image file:", imageFile.name);
        imageUrlCOS = await uploadImageToCOS(editingTemplate.id);
        console.log("After upload, imageUrlCOS:", imageUrlCOS);
        if (!imageUrlCOS) {
          message.error("图片上传失败，请重试");
          return;
        }
      } else {
        console.log("No new image file, using existing imageUrl");
      }

      const response = await updateReplyTemplateApi(editingTemplate.id, {
        content: templateContent,
        email: email, // 使用当前用户的邮箱
        image_urls: imageUrlCOS, // 添加图片URL字段
      });

      console.log(`Updating template ${editingTemplate.id} for user: ${email}`);

      if (response.code === 0) {
        message.success("更新模板成功");
        setTemplateContent("");
        setImageUrl("");
        setImageFile(null);
        setEditingTemplate(null);
        setIsModalVisible(false);
        fetchTemplates(); // 刷新模板列表
      } else {
        message.error(response.message || "更新模板失败");
      }
    } catch (error) {
      console.error("更新模板失败:", error);
      message.error("更新模板失败");
    } finally {
      setLoading(false);
    }
  };
  // 处理模板创建
  const handleAddTemplate = async () => {
    // 确保有email才能创建模板
    if (!email) {
      message.error("用户邮箱不能为空，无法创建模板");
      return;
    }

    try {
      setLoading(true);

      // 先创建不带图片的模板
      const response = await createReplyTemplateApi({
        content: templateContent,
        email: email,
      });

      if (response.code !== 0) {
        message.error(response.message || "添加模板失败");
        return;
      }

      // 如果没有图片，直接完成
      if (!imageFile) {
        message.success("添加模板成功");
        setTemplateContent("");
        setIsModalVisible(false);
        fetchTemplates(); // 刷新模板列表
        return;
      }

      // 如果有图片，需要获取最新创建的模板ID
      const templatesResponse = await getReplyTemplatesApi({
        page: 1,
        page_size: 10,
        email: email,
      });

      if (!templatesResponse.data?.records || templatesResponse.data.records.length === 0) {
        message.warning("创建模板成功，但无法上传图片，请稍后编辑模板添加图片");
        setTemplateContent("");
        setImageUrl("");
        setImageFile(null);
        setIsModalVisible(false);
        fetchTemplates();
        return;
      }

      // 假设最新的模板就是我们刚创建的（按创建时间排序，最新的在最前面）
      const latestTemplate = templatesResponse.data.records[0];

      // 上传图片
      const imageUrlCOS = await uploadImageToCOS(latestTemplate.id);
      if (!imageUrlCOS) {
        message.warning("模板创建成功，但图片上传失败");
        setTemplateContent("");
        setImageUrl("");
        setImageFile(null);
        setIsModalVisible(false);
        fetchTemplates();
        return;
      }

      // 更新模板添加图片URL
      const updateResponse = await updateReplyTemplateApi(latestTemplate.id, {
        content: templateContent,
        email: email,
        image_urls: imageUrlCOS,
      });

      if (updateResponse.code === 0) {
        message.success("添加模板成功");
      } else {
        message.warning("模板创建成功，但更新图片失败");
      }

      setTemplateContent("");
      setImageUrl("");
      setImageFile(null);
      setIsModalVisible(false);
      fetchTemplates(); // 刷新模板列表
    } catch (error) {
      console.error("添加模板失败:", error);
      message.error("添加模板失败");
    } finally {
      setLoading(false);
    }
  };
  // 处理模板删除
  const handleDeleteTemplate = async (id: number) => {
    // 确保有email才能删除模板
    if (!email) {
      message.error("用户邮箱不能为空，无法删除模板");
      return;
    }

    try {
      setLoading(true);
      const response = await deleteReplyTemplateApi(id, email);

      console.log(`Deleting template ${id} for user: ${email}`);

      if (response.code === 0) {
        message.success("删除模板成功");
        fetchTemplates(); // 刷新模板列表
      } else {
        message.error(response.message || "删除模板失败");
      }
    } catch (error) {
      console.error("删除模板失败:", error);
      message.error("删除模板失败");
    } finally {
      setLoading(false);
    }
  };
  // 处理图片上传
  const handleImageUpload = async (file: File): Promise<boolean> => {
    if (!email) {
      message.error("用户邮箱不能为空，无法上传图片");
      return false;
    }

    try {
      setUploadLoading(true);

      // 检查文件类型
      const isImage = file.type.startsWith("image/");
      if (!isImage) {
        message.error("只能上传图片文件!");
        return false;
      }

      // 检查文件大小，限制为5MB
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error("图片必须小于5MB!");
        return false;
      }

      // 保存文件以供后续上传
      setImageFile(file);

      // 创建本地预览URL
      const objectUrl = URL.createObjectURL(file);
      setImageUrl(objectUrl);

      return false; // 返回false阻止Upload组件默认上传行为
    } catch (error) {
      console.error("处理图片上传失败:", error);
      message.error("处理图片上传失败");
      return false;
    } finally {
      setUploadLoading(false);
    }
  };
  // 清除图片
  const handleRemoveImage = () => {
    setImageUrl("");
    setImageFile(null);
  };
  // 从腾讯云COS获取图片并显示
  const loadImageFromCOS = async (imageUrl: string) => {
    if (!imageUrl) return;

    try {
      console.log("Loading image from URL:", imageUrl);

      // 直接设置图片URL而不尝试从腾讯云COS获取
      // 这样可以避免解析URL时的问题
      setImageUrl(imageUrl);
      setImageFile(null); // 不需要文件对象，因为我们直接使用URL

      console.log("Image URL set successfully");
    } catch (error) {
      console.error("加载图片失败:", error);
      message.error("加载图片失败");
    }
  };
  // 上传图片到腾讯云COS
  const uploadImageToCOS = async (templateId: number): Promise<string> => {
    if (!imageFile || !email) return "";

    try {
      setUploadLoading(true);

      // 创建腾讯云COS服务实例
      const cosService = tencentCOSService;

      // 构建上传路径：email/模板序号/图片名称
      // 使用实际的模板ID
      const uploadPath = `${email}/${templateId}`;

      // 上传文件到腾讯云COS
      const result = await cosService.uploadFile(imageFile, uploadPath);

      return result.url;
    } catch (error) {
      console.error("上传图片到腾讯云COS失败:", error);
      message.error("上传图片失败");
      return "";
    } finally {
      setUploadLoading(false);
    }
  };
  // 从后端获取模板
  const fetchTemplates = async () => {
    try {
      // 确保有email才能获取模板
      if (!email) {
        message.error("用户邮箱不能为空，无法获取模板");
        return;
      }

      setLoading(true);
      const response = await getReplyTemplatesApi({
        page: 1,
        page_size: 1000, // 获取所有模板
        email: email, // 使用当前用户的邮箱
      });

      console.log(`Fetching templates for user: ${email}`);
      console.log("response123", response.data);
      setTemplates(response.data?.records || []);
    } catch (error) {
      console.error("获取模板失败:", error);
      message.error("获取模板失败");
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Card
        extra={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateContent("");
                setImageUrl("");
                setImageFile(null);
                setIsModalVisible(true);
              }}
              style={{
                border: "1px solid #999999",
                color: "#333333",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.color = "#8389fc";
                e.currentTarget.style.borderColor = "#8389fc";
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.color = "#333333";
                e.currentTarget.style.borderColor = "#999999";
              }}
            >
              添加模板
            </Button>
            <Button
              icon={<img src={refresh} alt="refresh" />}
              onClick={handleRefreshTemplates}
              loading={refreshTemplateLoading}
            />
          </div>
        }
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "91%",
              }}
            >
              <Checkbox
                checked={selectedTemplateIds.length === templates.length && templates.length > 0}
                indeterminate={
                  selectedTemplateIds.length > 0 && selectedTemplateIds.length < templates.length
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    handleSelectAllTemplates();
                  } else {
                    handleDeselectAllTemplates();
                  }
                }}
              />
              <span style={{ fontSize: "16px", fontWeight: "500" }}>私信内容</span>
            </div>
            <div
              style={{
                width: "9%",
                borderLeft: "1px solid #e0e0e0",
                boxSizing: "border-box",
                paddingLeft: "1.25rem",
                fontSize: "1rem",
                color: "#666666",
              }}
            >
              操作
            </div>
          </div>
        </div>
        <Spin spinning={loading}>
          <div
            style={{
              backgroundColor: "white",
              minHeight: "200px",
            }}
          >
            {templates.length > 0 ? (
              <VirtualList
                data={templates}
                height={370}
                itemHeight={80}
                itemKey="id"
                style={{ paddingRight: "12px" }}
              >
                {(item: ReplyTemplate) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #f0f0f0",
                      minHeight: "48px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                      <Checkbox
                        checked={selectedTemplateIds.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTemplateIds([...selectedTemplateIds, item.id]);
                          } else {
                            setSelectedTemplateIds(
                              selectedTemplateIds.filter((id) => id !== item.id)
                            );
                          }
                        }}
                        style={{ marginRight: "12px" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            color: "#333",
                            fontSize: "14px",
                            lineHeight: "1.4",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.content}
                        </div>
                        {item.image_urls && (
                          <div style={{ marginTop: "8px" }}>
                            <img
                              src={item.image_urls}
                              alt="模板图片"
                              style={{
                                maxWidth: "80px",
                                maxHeight: "60px",
                                objectFit: "contain",
                                borderRadius: "4px",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginLeft: "12px",
                      }}
                    >
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        size="small"
                        style={{
                          color: "#8389FC",
                          padding: "4px",
                          minWidth: "28px",
                          height: "28px",
                        }}
                        onClick={() => {
                          setEditingTemplate(item);
                          setTemplateContent(item.content);

                          // 如果模板有图片URL，加载图片
                          if (item.image_urls) {
                            loadImageFromCOS(item.image_urls);
                          } else {
                            // 清空之前可能存在的图片
                            setImageUrl("");
                            setImageFile(null);
                          }

                          setIsModalVisible(true);
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        style={{
                          color: "#ff4d4f",
                          padding: "4px",
                          minWidth: "28px",
                          height: "28px",
                        }}
                        onClick={() => handleDeleteTemplate(item.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                )}
              </VirtualList>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: "#999",
                  fontSize: "14px",
                }}
              >
                暂无模板
              </div>
            )}
          </div>
        </Spin>
      </Card>
      <Modal
        title={editingTemplate ? "编辑模板" : "添加模板"}
        open={isModalVisible}
        onOk={editingTemplate ? handleUpdateTemplate : handleAddTemplate}
        onCancel={() => {
          setIsModalVisible(false);
          setTemplateContent("");
          setImageUrl("");
          setImageFile(null);
          setEditingTemplate(null);
        }}
        confirmLoading={loading || uploadLoading}
        okText={editingTemplate ? "更新" : "添加"}
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="模板内容" required>
            <TextArea
              rows={6}
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              placeholder="请输入模板内容..."
            />
          </Form.Item>
          <Form.Item label="图片（可选）">
            <div className="flex flex-col space-y-2">
              <Upload
                name="image"
                listType="picture-card"
                className="avatar-uploader"
                showUploadList={false}
                beforeUpload={handleImageUpload}
                accept="image/*"
              >
                {imageUrl ? (
                  <div className="relative">
                    <img src={imageUrl} alt="模板图片" style={{ width: "100%" }} />
                    <div
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                    >
                      X
                    </div>
                  </div>
                ) : (
                  <div>
                    {uploadLoading ? <Spin /> : <PlusOutlined />}
                    <div style={{ marginTop: 8 }}>上传图片</div>
                  </div>
                )}
              </Upload>
              {imageUrl && (
                <Button icon={<DeleteOutlined />} onClick={handleRemoveImage} danger>
                  移除图片
                </Button>
              )}
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
export default DashTaskVeiw;
