import React, { useState } from "react";
import { Button, Form, Input } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useUserStore } from "../../../../store/userStore";
import { triggerDagRun } from "../../../../api/airflow";
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
  const handleSubmit = async () => {
    console.log(textAreaValue);
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
    const escapedEmail = (email || "").replace(/@/g, "_at_").replace(/\./g, "_dot_");
    const dag_run_id = "reply_at_and_comment_" + escapedEmail + "_" + timestamp;
    try {
      const res = await triggerDagRun("reply_at_and_comment", dag_run_id, {
        reply_content: textAreaValue,
        email: email,
      });
      console.log(res);
      message.success("回复任务创建成功" + dag_run_id);
      onSuccess?.(); // 调用成功回调函数
      onClose();
    } catch (error) {
      console.log(error);
      message.error("回复失败");
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
          <Button onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit}>确定</Button>
        </div>
      </div>
    </div>
  );
};

export default ReplyModal;
