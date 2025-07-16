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
} from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  HomeOutlined,
  ExportOutlined,
  PlayCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import refresh from "../../img/refresh.svg";

import { useUserStore } from "../../store/userStore";
import {
  getIntentCustomersApi,
  getXhsNotesByKeywordApi,
  getXhsCommentsByKeywordApi,
} from "../../api/mysql";
import { triggerDagRun, getDagRuns } from "../../api/airflow";
import { exportFilterResults, ExportData } from "../../utils/excelExport";
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
    height: "40px",
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

interface ReplyTemplate {
  key: string;
  content: string;
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
        fetchReplyTemplates();
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
      console.log("fetchTaskDetail", taskKeyword);

      // 获取评论数据
      const commentsResponse = await getXhsCommentsByKeywordApi(
        taskKeyword,
        !isAdmin && email ? email : undefined
      );

      // 获取笔记数据
      const notesResponse = await getXhsNotesByKeywordApi(
        taskKeyword,
        !isAdmin && email ? email : undefined
      );

      console.log("评论数据response", commentsResponse);
      console.log("笔记数据response", notesResponse);

      // 计算笔记数量
      const noteCount =
        notesResponse &&
        notesResponse.code === 0 &&
        notesResponse.data &&
        notesResponse.data.records
          ? notesResponse.data.records.length
          : 0;

      // 计算评论数量并存储评论数据
      let commentCount = 0;
      if (
        commentsResponse &&
        commentsResponse.code === 0 &&
        commentsResponse.data &&
        commentsResponse.data.records
      ) {
        const records = commentsResponse.data.records;
        commentCount = records.length;

        // 存储评论数据
        setCommentsData(records);

        // 存储评论ID
        const ids = records.map((comment: any) => comment.id?.toString() || "").filter((id) => id);
        setCommentIds(ids);
        //告知分析意向客户，DAG开始运行
        const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
        const dagId = "comments_analyzer";
        const dagRunId = `${dagId}_${timestamp}`;
        const filteredComments = ids; // 使用刚刚提取的评论ID
        console.log("filteredComments", filteredComments);
        // Prepare configuration
        const conf = {
          profile_sentence: "",
          comment_ids: filteredComments, // No limit on comments
        };
        const analysisDagRunResponse = await triggerDagRun(dagId, dagRunId, conf);
        const newTask = {
          dag_run_id: analysisDagRunResponse.dag_run_id,
          state: analysisDagRunResponse.state,
          start_date: analysisDagRunResponse.start_date || new Date().toISOString(),
          end_date: analysisDagRunResponse.end_date || "",
          conf: JSON.stringify(conf),
        };
        setAnalysisTask(newTask);
        console.log("分析意向客户dagRunResponse", analysisDagRunResponse);

        //检查分析状态是否完成 如果完成就到下一步的分析意向结果
        setTimeout(() => {
          checkAnalysisStatus();
        }, 2000); // 等待2秒后检查状态，给DAG启动时间
        console.log("存储的评论数据:", records);
        console.log("存储的评论ID:", ids);
      } else {
        // 清空数据
        setCommentsData([]);
        setCommentIds([]);
      }

      // 创建任务详情对象
      const taskDetail: TaskDetail = {
        id: taskKeyword,
        status: taskState === "success" ? "成功" : taskState === "failed" ? "失败" : "运行中",
        keyword: taskKeyword,
        email: email || "user@example.com",
        noteCount: noteCount,
        commentCount: commentCount,
        progress: 0, // 暂时空着
        remainingTime: "",
      };

      setTaskDetail(taskDetail);
      console.log("任务详情设置完成:", taskDetail);
      setLoading(false);
    } catch (error) {
      console.error("获取任务详情失败:", error);
      message.error("获取任务详情失败");
      setLoading(false);
    }
  };
  // 获取分析意向结果
  const fetchIntentResults = async () => {
    if (!taskKeyword) return;

    try {
      console.log("开始获取分析意向结果");
      const response = await getIntentCustomersApi({
        email: !isAdmin && email ? email : undefined,
        keyword: taskKeyword,
      });

      console.log("分析意向结果:", response);

      if (response && response.code === 0 && response.data) {
        setIntentResults(response.data);
        setAnalysisComplete(true);
        message.success("意向客户分析结果已更新");
      } else {
        console.log("暂无分析结果数据");
        setIntentResults(null);
        setAnalysisComplete(false);
      }
    } catch (err) {
      console.error("获取分析意向结果失败:", err);
      message.error("获取分析意向结果失败");
      setIntentResults(null);
      setAnalysisComplete(false);
    }
  };

  //查看分析意向客户任务状态
  const checkAnalysisStatus = async () => {
    if (!analysisTask) return;
    try {
      // Get the DAG ID from the dag_run_id (format: dagId_timestamp)
      const dagId = "comments_analyzer";
      const dagRunId = analysisTask.dag_run_id;

      // Get the specific DAG run status from Airflow API
      const response = await getDagRuns(dagId, 100, "-start_date");

      // Find the specific DAG run by ID
      const specificDagRun =
        response && response.dag_runs
          ? response.dag_runs.find((run: any) => run.dag_run_id === dagRunId)
          : null;
      console.log("Analysis task status response:", response);
      console.log("Looking for DAG run ID:", dagRunId);

      if (specificDagRun) {
        console.log("Found specific DAG run:", specificDagRun);
        const currentState = specificDagRun.state;

        // Update the analysis task with the current state
        setAnalysisTask({
          ...analysisTask,
          state: currentState,
          end_date: specificDagRun.end_date || analysisTask.end_date,
        });

        if (currentState === "success") {
          message.success("分析任务已完成！");
          // 分析完成后获取结果
          await fetchIntentResults();
        } else if (currentState === "failed") {
          message.error("分析任务失败，请检查日志");
          setAnalysisComplete(false);
        } else {
          // Still running
          message.info("分析任务在执行中");
          setAnalysisComplete(false);
        }
      } else {
        message.error("无法获取任务状态，请稍后再试");
        setAnalysisComplete(false);
      }
    } catch (err) {
      console.error("Error checking analysis task status:", err);
      message.error("检查分析任务状态失败");
      setAnalysisComplete(false);
    }
  };

  // 根据评论ID获取意向级别
  const getCustomerLevel = (commentId: string) => {
    if (!analysisComplete || !intentResults || !intentResults.records) {
      return "分析中";
    }

    // 在意向结果中查找匹配的评论
    // 分析意向结果中的comment_id对应小红书评论数据中的id
    const intentCustomer = intentResults.records.find(
      (record: any) => record.comment_id?.toString() === commentId
    );

    console.log(`查找评论ID ${commentId} 的意向结果:`, intentCustomer);

    // 返回intent字段，不是intent_level
    return intentCustomer ? intentCustomer.intent : "未知";
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
      // 如果有分析任务，先检查分析状态
      if (analysisTask) {
        await checkAnalysisStatus();
      } else {
        // 如果没有分析任务，重新获取任务详情
        await fetchTaskDetail(taskKeyword);
      }
      fetchReplyTemplates();
      // fetchFilterResults会通过useEffect自动触发
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

  const handleEditTemplate = (key: string) => {
    const template = replyTemplates.find((t) => t.key === key);
    if (template) {
      setEditingTemplateKey(key);
      setTempTemplateContent(template.content);
      console.log("编辑模版", key);
    }
  };

  const handleSaveTemplate = (key: string) => {
    setReplyTemplates((templates) =>
      templates.map((t) => (t.key === key ? { ...t, content: tempTemplateContent } : t))
    );
    setEditingTemplateKey(null);
    setTempTemplateContent("");
    message.success("保存成功");
  };

  const handleCancelEdit = () => {
    setEditingTemplateKey(null);
    setTempTemplateContent("");
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

  // 回复模版表格列定义
  const templateColumns = [
    {
      title: "私信内容",
      dataIndex: "content",
      key: "content",
      render: (text: string, record: ReplyTemplate) => {
        const isEditing = editingTemplateKey === record.key;
        return (
          <TextArea
            value={isEditing ? tempTemplateContent : text}
            onChange={(e) => {
              if (isEditing) {
                setTempTemplateContent(e.target.value);
              }
            }}
            autoSize={{ minRows: 2, maxRows: 6 }}
            readOnly={!isEditing}
            style={{
              border: isEditing ? "1px solid #1890ff" : "1px solid #d9d9d9",
              backgroundColor: isEditing ? "#f6ffed" : "#fafafa",
            }}
          />
        );
      },
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_: any, record: ReplyTemplate) => {
        const isEditing = editingTemplateKey === record.key;
        return (
          <Space>
            {isEditing ? (
              <>
                <Button
                  type="link"
                  icon={<CheckOutlined />}
                  onClick={() => handleSaveTemplate(record.key)}
                  style={{ color: "#52c41a" }}
                >
                  保存
                </Button>
                <Button
                  type="link"
                  icon={<CloseOutlined />}
                  onClick={handleCancelEdit}
                  style={{ color: "#ff4d4f" }}
                >
                  取消
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </Space>
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

  const onSelectedTemplateChange = (selectedRowKeys: React.Key[]) => {
    console.log("回复模版selectedRowKeys", selectedRowKeys);
    setSelectedTemplateRowKeys(selectedRowKeys);
  };

  const filterRowSelection: TableRowSelection<FilterResult> = {
    selectedRowKeys: selectedFilterRowKeys,
    onChange: onSelectedFilterChange,
  };

  const templateRowSelection: TableRowSelection<ReplyTemplate> = {
    selectedRowKeys: selectedTemplateRowKeys,
    onChange: onSelectedTemplateChange,
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
            title: "智能获客",
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
            <StatItem label="任务用时" value={taskDetail.remainingTime} showDivider={false} />
          </div>

          {/* 控制按钮 */}
          <div style={styles.controlSection}>
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
            <Button icon={<img src={refresh} alt="refresh" />} onClick={handleRefresh} />
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

      {/* 回复模版 */}
      <Card
        title="回复模版"
        extra={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button onClick={handleAddTemplate}>添加模版</Button>
            <Button icon={<img src={refresh} alt="refresh" />} onClick={handleRefresh} />
          </div>
        }
        className="mt-4 ml-4 mr-4"
      >
        <Table
          columns={templateColumns}
          dataSource={replyTemplates}
          pagination={false}
          size="small"
          showHeader={false}
          rowSelection={templateRowSelection}
        />
      </Card>
    </div>
  );
};

export default DashTaskVeiw;
