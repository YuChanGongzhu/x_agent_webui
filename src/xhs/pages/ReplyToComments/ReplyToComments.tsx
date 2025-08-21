import React, { useState, useEffect } from "react";
import { Button, Table, message, Empty } from "antd";
import ReplyModal from "./components/ReplyModal";
import { getRepliedCommentApi } from "../../../api/mysql";
import { useUserStore } from "../../../store/userStore";
import { getDagRunDetail } from "../../../api/airflow";
// 封装样式
const styles = {
  container: {
    height: "100%",
    width: "100%",
    padding: "20px",
    boxSizing: "border-box" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    backgroundColor: "#f9f9f9",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
  title: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#333",
  },
  tableContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    padding: "16px",
    overflow: "hidden",
  },
  empty: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "200px",
    color: "#999",
  },
};
const ReplyToComments = () => {
  const { email, isAdmin } = useUserStore();
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [repliedCommentList, setRepliedCommentList] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 表格列定义
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "评论用户",
      dataIndex: "user_name",
      key: "user_name",
      ellipsis: true,
    },
    {
      title: "评论内容",
      dataIndex: "comment_content",
      key: "comment_content",
      ellipsis: true,
    },
    {
      title: "回复内容",
      dataIndex: "reply_content",
      key: "reply_content",
      ellipsis: true,
    },
    {
      title: "用户邮箱",
      dataIndex: "userInfo",
      key: "userInfo",
      ellipsis: true,
    },
    {
      title: "设备ID",
      dataIndex: "device_id",
      key: "device_id",
      ellipsis: true,
    },
    {
      title: "回复时间",
      dataIndex: "reply_time",
      key: "reply_time",
      width: 180,
    },
  ];

  // 获取数据
  const fetchRepliedCommentList = async () => {
    setLoading(true);
    try {
      const res = await getRepliedCommentApi({ email, page: currentPage, page_size: pageSize });
      if (res?.data?.records) {
        if (isAdmin) {
          setRepliedCommentList(res.data.records);
        } else {
          setRepliedCommentList(res.data.records.filter((item: any) => item.userInfo === email));
        }
        setTotal(res.data.total || 0);
        setError(null); // 清除错误
      } else {
        setRepliedCommentList([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("获取回复评论失败：", err);
      setError("获取回复小红书评论的任务数据失败");
      setRepliedCommentList([]);
      message.error("数据加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!email) return;
    fetchRepliedCommentList();
  }, [email, currentPage, pageSize]);

  // 处理分页变化
  const handleTableChange = (pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handleReply = () => {
    console.log("打开跟评回复模态框");
    setShowReplyModal(true);
  };

  return (
    <div style={styles.container}>
      {/* 顶部操作栏 */}
      <div style={styles.header}>
        <div style={styles.title}>跟评回复</div>
        <Button type="primary" onClick={handleReply}>
          跟评回复
        </Button>
      </div>

      {/* 表格区域 */}
      <div style={styles.tableContainer}>
        <Table
          dataSource={repliedCommentList}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条数据`,
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: (
              <div style={styles.empty}>
                {error ? (
                  <span style={{ color: "red" }}>{error}</span>
                ) : (
                  <Empty description="暂无数据" />
                )}
              </div>
            ),
          }}
          scroll={{ x: "max-content" }}
        />
      </div>

      {/* 回复模态框 */}
      <ReplyModal
        visible={showReplyModal}
        onClose={() => setShowReplyModal(false)}
        onSuccess={fetchRepliedCommentList}
      />
    </div>
  );
};

export default ReplyToComments;
