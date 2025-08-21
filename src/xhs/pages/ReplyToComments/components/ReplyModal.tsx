import React, { useState } from "react";
import { Button, Form, Input } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useUserStore } from "../../../../store/userStore";
import { triggerDagRun, getDagRunDetail } from "../../../../api/airflow";
import { useMessage } from "../../../../components/message";
const { TextArea } = Input;
const styles = {
  modalOverlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
    width: "90%",
    maxWidth: "800px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const,
  },
  modalHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #f0f0f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#333",
    margin: 0,
  },
  modalBody: {
    padding: "24px",
    flex: 1,
    overflow: "auto",
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #f0f0f0",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
};
const layout = {
  labelCol: { span: 3 },
  wrapperCol: { span: 21 },
};
const ReplyModal = ({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  const message = useMessage();
  const { email } = useUserStore();
  const [form] = Form.useForm();
  const [textAreaValue, setTextAreaValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 轮询检查任务状态
  const pollTaskStatus = async (dagId: string, dagRunId: string): Promise<void> => {
    const maxRetries = 60; // 最多轮询60次
    const pollInterval = 2000; // 每2秒轮询一次
    let retries = 0;

    const checkStatus = async (): Promise<void> => {
      try {
        const response = await getDagRunDetail(dagId, dagRunId);
        const status = response?.state;

        console.log(`轮询状态 (${retries + 1}/${maxRetries}):`, status);

        if (status === "success") {
          message.success("评论回复成功！");
          setSubmitting(false);
          onSuccess?.(); // 只有成功时才调用回调刷新列表
          onClose();
          return;
        } else if (status === "failed") {
          message.error("回复失败，请重试");
          setSubmitting(false);
          return;
        } else if (status === "running") {
          retries++;
          if (retries >= maxRetries) {
            message.warning("任务执行时间较长，请稍后手动刷新查看结果");
            setSubmitting(false);
            onClose();
            return;
          }
          // 继续轮询
          setTimeout(checkStatus, pollInterval);
        } else {
          // 其他状态继续轮询
          retries++;
          if (retries >= maxRetries) {
            message.warning("任务状态检查超时，请稍后手动刷新查看结果");
            setSubmitting(false);
            onClose();
            return;
          }
          setTimeout(checkStatus, pollInterval);
        }
      } catch (error) {
        console.error("获取任务状态失败:", error);
        message.error("无法获取任务状态，请稍后手动刷新查看结果");
        setSubmitting(false);
        onClose();
        return;
      }
    };

    checkStatus();
  };

  const handleSubmit = async () => {
    if (!textAreaValue.trim()) {
      message.error("请输入回复内容");
      return;
    }

    setSubmitting(true);
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
    const escapedEmail = (email || "").replace(/@/g, "_at_").replace(/\./g, "_dot_");
    const dag_run_id = "reply_at_and_comment_" + escapedEmail + "_" + timestamp;

    try {
      const res = await triggerDagRun("reply_at_and_comment", dag_run_id, {
        reply_content: textAreaValue,
        email: email,
      });
      console.log(res);
      message.info("回复任务已创建，正在处理中...");

      // 开始轮询任务状态
      await pollTaskStatus("reply_at_and_comment", dag_run_id);
    } catch (error) {
      console.log(error);
      message.error("创建回复任务失败");
      setSubmitting(false);
    }
  };
  if (!visible) return null;
  const onFormFinish = (values: any) => {
    console.log(values);
  };
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div style={styles.modalHeader}>
          <div>编辑回复内容</div>
          <div>
            <Button onClick={onClose} icon={<CloseOutlined />} type="text" />
          </div>
        </div>
        {/* 内容 */}
        <div style={styles.modalBody}>
          <Form {...layout} form={form} onFinish={onFormFinish}>
            <Form.Item
              name="content"
              label="回复内容"
              rules={[{ required: true, message: "请输入回复内容" }]}
            >
              <TextArea
                showCount
                value={textAreaValue}
                onChange={(e: any) => setTextAreaValue(e.target.value)}
                autoSize={{ minRows: 3, maxRows: 5 }}
              />
            </Form.Item>
          </Form>
        </div>
        {/* 底部 */}
        <div style={styles.modalFooter}>
          <Button onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} type="primary" loading={submitting} disabled={submitting}>
            {submitting ? "处理中..." : "确定"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReplyModal;
