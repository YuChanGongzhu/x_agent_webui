import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button, List, Typography, Space, Tag, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useUserStore } from "../../../store/userStore";
import { getNoteApi, deleteNoteApi } from "../../../api/mysql";
import { useMessage } from "./components/message";

const { Text } = Typography;

const Drafts = () => {
  const navigate = useNavigate();
  const { email } = useUserStore();
  const message = useMessage();
  const [draftList, setDraftList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取草稿数据
  const fetchDraftList = useCallback(async () => {
    if (!email) return;

    try {
      setLoading(true);
      const res = await getNoteApi({
        email,
        action: "get_all",
      });
      console.log("草稿数据:", res);
      if (res.data && res.data.templates) {
        // 筛选出status为0的草稿数据
        const drafts = res.data.templates.filter((note: any) => note.status === 0);
        setDraftList(drafts);
      }
    } catch (error) {
      console.error("获取草稿数据失败:", error);
      message.error("获取草稿数据失败");
    } finally {
      setLoading(false);
    }
  }, [email]); // 保持 email 依赖

  // 初始化获取草稿数据 - 直接依赖 email 避免循环
  useEffect(() => {
    if (email) {
      fetchDraftList();
    }
  }, [email]); // 直接依赖 email，避免 fetchDraftList 的循环依赖

  // 删除草稿
  const handleDelete = async (draftId: number) => {
    try {
      const res = await deleteNoteApi({ id: draftId.toString() });
      console.log("删除草稿结果:", res);
      if (res.code === 0 && res.message === "success") {
        message.success("删除草稿成功");
        // 刷新草稿列表
        fetchDraftList();
      } else {
        message.error("删除草稿失败");
      }
    } catch (error) {
      console.error("删除草稿出错:", error);
      message.error("删除草稿出错，请稍后重试");
    }
  };

  // 编辑草稿
  const handleEdit = (draft: any) => {
    console.log("编辑草稿:", draft);
    // TODO: 实现编辑草稿功能
    message.info("编辑功能开发中");
  };

  // 格式化时间显示
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "-";
    const date = new Date(timeStr);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      {/* 页面头部 */}
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "16px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/xhs/dashboard/contentCreationManagement")}
              type="text"
            />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>草稿箱</h2>
          </div>
          <Button
            type="primary"
            onClick={() => navigate("/xhs/dashboard/contentCreationManagement")}
          >
            新建笔记
          </Button>
        </div>
      </div>

      {/* 草稿列表 */}
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          padding: "16px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <List
          loading={loading}
          dataSource={draftList}
          locale={{ emptyText: "暂无草稿" }}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: "16px 0",
                borderBottom: "1px solid #f0f0f0",
              }}
              actions={[
                <Tooltip title="编辑" key="edit">
                  <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(item)} />
                </Tooltip>,
                <Tooltip title="删除" key="delete">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(item.id)}
                  />
                </Tooltip>,
              ]}
            >
              <List.Item.Meta
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Text strong style={{ fontSize: "16px" }}>
                      {item.title || "未命名草稿"}
                    </Text>
                    <Tag color="blue">草稿</Tag>
                  </div>
                }
                description={
                  <div>
                    <Text type="secondary" style={{ display: "block", marginBottom: "8px" }}>
                      {item.content
                        ? item.content.length > 100
                          ? item.content.substring(0, 100) + "..."
                          : item.content
                        : "暂无内容"}
                    </Text>
                    <Space size="large">
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        创建时间: {formatTime(item.created_at)}
                      </Text>
                      {item.author && (
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          作者: {item.author}
                        </Text>
                      )}
                    </Space>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </div>
    </div>
  );
};

export default Drafts;
