import React, { CSSProperties, useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ContentTopUserMessage from "../../components/ContentTopUserMessage";
import { Table, Button, Tag, Space } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined, LoadingOutlined } from "@ant-design/icons";
import "./contentCreationManagement.module.css";
import { useUserStore } from "../../../store/userStore";
import { getNoteApi, deleteNoteApi } from "../../../api/mysql";
import AddNewTaskModal from "./components/AddNewTaskModal";
import DataReport from "./components/DataReport";
import StatsItem from "./components/StatsItem";
import { useMessage } from "./components/message";
// 样式对象
const styles = {
  pageContainer: {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    padding: "16px",
    backgroundColor: "#f5f5f5",
    boxSizing: "border-box" as const,
  } as CSSProperties,

  topSection: {
    width: "100%",
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
    flex: "0 0 auto",
  } as CSSProperties,

  chartsSection: {
    width: "100%",
    display: "flex",
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: "16px",
    flex: "0 0 auto",
  } as CSSProperties,

  chartsSectionMobile: {
    flexDirection: "column" as const,
    gap: "12px",
  } as CSSProperties,

  tableSection: {
    width: "100%",
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    padding: "16px",
    flex: "1 1 auto",
    display: "flex",
    flexDirection: "column" as const,
  } as CSSProperties,

  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "16px",
    fontWeight: 600,
    marginBottom: "16px",
    color: "#333",
    gap: "16px",
  } as CSSProperties,

  tableHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  } as CSSProperties,
};

// 模拟数据
const mockdata = [
  { time: "2025-01-01", value: 100 },
  { time: "2025-01-02", value: 200 },
  { time: "2025-01-03", value: 300 },
  { time: "2025-01-04", value: 400 },
  { time: "2025-01-05", value: 500 },
  { time: "2025-01-06", value: 600 },
];

const ContentCreationManagement = () => {
  const { email, userDeviceNickNameList } = useUserStore();
  const message = useMessage();

  // 状态管理
  const [tableLoading, setTableLoading] = useState(false);
  const [showAddNewTask, setShowAddNewTask] = useState(false);
  const [noteList, setNoteList] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const navigate = useNavigate();
  // 获取小红书笔记数据
  const fetchNoteList = useCallback(
    async (page = 1, pageSize = 10, showLoading = true) => {
      if (!email) return;

      try {
        if (showLoading) {
          setTableLoading(true);
        }
        const res = await getNoteApi({
          email,
          action: "get_all",
          page,
          page_size: pageSize,
        });
        console.log("小红书笔记数据:", res);
        if (res.data && res.data.templates) {
          setNoteList(res.data.templates);
          // 更新分页信息
          setPagination({
            current: page,
            pageSize: pageSize,
            total: res.data.total || res.data.templates.length,
          });
        }
      } catch (error) {
        console.error("获取笔记数据失败:", error);
      } finally {
        if (showLoading) {
          setTableLoading(false);
        }
      }
    },
    [email]
  );

  // 初始化获取数据（第一次进入页面显示加载状态）
  useEffect(() => {
    fetchNoteList(1, 10, true); // 第一次加载显示loading
  }, [fetchNoteList]);

  // 30秒轮询更新数据（静默刷新，不显示loading）
  useEffect(() => {
    if (!email) return;

    const interval = setInterval(() => {
      fetchNoteList(pagination.current, pagination.pageSize, false); // 轮询时不显示loading
    }, 30000); // 30秒

    return () => clearInterval(interval);
  }, [fetchNoteList, email, pagination.current, pagination.pageSize]);

  // 状态渲染函数
  const renderStatus = (status: number | null) => {
    const statusConfig = {
      0: { color: "blue", text: "草稿" },
      1: { color: "green", text: "成功" },
      2: { color: "orange", text: "等待" },
      [-1]: { color: "red", text: "失败" },
    };

    if (status === null || status === undefined) {
      return <Tag color="default">未知</Tag>;
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: "default",
      text: "未知",
    };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 操作处理函数
  const handleEdit = (record: any) => {
    console.log("编辑记录:", record);
  };

  const handleDelete = async (record: any) => {
    console.log("删除记录:", record);
    try {
      const res = await deleteNoteApi({ id: record.key });
      console.log("删除笔记结果:", res);
      if (res.code === 0 && res.message === "success") {
        message.success("删除笔记成功");
        // 刷新当前页面数据
        fetchNoteList(pagination.current, pagination.pageSize, true);
      } else {
        message.error("删除笔记失败");
      }
    } catch (error) {
      console.error("删除笔记出错:", error);
      message.error("删除笔记出错，请稍后重试");
    }
  };

  // 格式化笔记数据为表格数据
  const formatNoteDataForTable = useMemo(() => {
    return noteList.map((note, index) => ({
      key: note.id || index,
      noteTitle: note.title || "-",
      noteContent: note.content || "-",
      publishAccount: note.author || "-",
      publishHost: note.device_id || "-",
      status: note.status,
      publishTime: note.created_at || "-",
      originalData: note,
    }));
  }, [noteList]);

  const columns = [
    {
      title: "笔记标题",
      dataIndex: "noteTitle",
      key: "noteTitle",
      width: 150,
      ellipsis: true,
    },
    {
      title: "笔记内容",
      dataIndex: "noteContent",
      key: "noteContent",
      width: 200,
      ellipsis: true,
      render: (text: string) => (text === "/" ? "-" : text),
    },
    {
      title: "发布账号",
      dataIndex: "publishAccount",
      key: "publishAccount",
      width: 120,
      render: (text: string) => (text === "/" ? "-" : text),
    },
    {
      title: "发布主机",
      dataIndex: "publishHost",
      key: "publishHost",
      width: 120,
      render: (text: string) => (text === "/" ? "-" : text),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 80,
      align: "center" as const,
      render: renderStatus,
    },
    {
      title: "发布时间",
      dataIndex: "publishTime",
      key: "publishTime",
      width: 160,
    },
    // {
    //   title: "操作",
    //   key: "action",
    //   width: 120,
    //   align: "center" as const,
    //   render: (_: any, record: any) => (
    //     <Space size="small">
    //       <Button
    //         type="text"
    //         size="small"
    //         icon={<EditOutlined />}
    //         title="编辑"
    //         onClick={() => handleEdit(record)}
    //       />
    //       <Button
    //         type="text"
    //         size="small"
    //         icon={<DeleteOutlined />}
    //         danger
    //         title="删除"
    //         onClick={() => handleDelete(record)}
    //       />
    //     </Space>
    //   ),
    // },
  ];

  // 检测屏幕宽度（简单的响应式逻辑）
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1200);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1200);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleModalSuccess = () => {
    // 提交完笔记后刷新笔记列表（回到第一页，显示loading）
    fetchNoteList(1, pagination.pageSize, true);
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.topSection}>
        <ContentTopUserMessage />
      </div>

      <div
        style={{
          ...styles.chartsSection,
          ...(isMobile ? styles.chartsSectionMobile : {}),
        }}
      >
        <DataReport
          title="内容阅读量"
          tooltipText="显示最近7天的内容阅读量趋势"
          total={100}
          chartData={mockdata}
          bottomChildren={<StatsItem label="总阅读量" value="2.1万" />}
        />
        <DataReport
          title="内容发布量"
          total={100}
          chartData={mockdata.map((item) => ({ ...item, value: item.value * 0.3 }))}
          bottomChildren={<StatsItem label="今日发布" value="12" />}
        />
        <DataReport
          title="互动数据统计"
          total={100}
          chartData={mockdata.map((item) => ({ ...item, value: item.value * 0.5 }))}
          bottomChildren={
            <div
              style={{
                display: "flex",
                gap: "16px",
                flexWrap: "wrap",
                justifyContent: "space-around",
              }}
            >
              <StatsItem label="今日互动" value="300" />
              <StatsItem label="今日点赞" value="180" />
              <StatsItem label="今日评论" value="85" />
              <StatsItem label="今日收藏" value="35" />
            </div>
          }
        />
      </div>

      <div style={styles.tableSection}>
        <div style={styles.tableHeader}>
          <span>内容创作管理</span>
          <div style={styles.tableHeaderRight}>
            <Button onClick={() => navigate("/xhs/pages/contentCreationManagement/drafts")}>
              草稿箱
            </Button>
            <Button
              type="primary"
              icon={userDeviceNickNameList.length > 0 ? <PlusOutlined /> : <LoadingOutlined />}
              disabled={userDeviceNickNameList.length === 0}
              onClick={() => {
                console.log("点击添加新笔记");
                setShowAddNewTask(true);
              }}
            >
              添加新笔记
            </Button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <Table
            dataSource={formatNoteDataForTable}
            columns={columns}
            loading={tableLoading}
            scroll={{ x: 1000 }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
              onChange: (page, pageSize) => {
                console.log("分页变化:", { page, pageSize });
                fetchNoteList(page, pageSize || pagination.pageSize, true); // 手动分页显示loading
              },
              onShowSizeChange: (current, size) => {
                console.log("页面大小变化:", { current, size });
                fetchNoteList(1, size, true); // 改变页面大小时回到第一页，显示loading
              },
            }}
            locale={{
              emptyText: noteList.length === 0 ? "暂无笔记数据" : "暂无数据",
            }}
          />
        </div>
      </div>

      {/* 添加新任务弹窗 */}
      <AddNewTaskModal
        visible={showAddNewTask}
        onClose={() => setShowAddNewTask(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default ContentCreationManagement;
