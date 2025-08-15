import React, { useState, useEffect } from "react";
import { Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import AddNewTaskContent from "./AddNewTaskContent";
import { NoteFormData } from "../types";
import { CONSTANTS } from "../constants";
import type { UploadFile } from "antd";
import { tencentCOSService } from "../../../../api/tencent_cos";
import { addNoteApi } from "../../../../api/mysql";
import { triggerDagRun } from "../../../../api/airflow";
import { useUserStore } from "../../../../store/userStore";
import { useMessage } from "./message";

interface AddNewTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddNewTaskModal: React.FC<AddNewTaskModalProps> = ({ visible, onClose, onSuccess }) => {
  const { email } = useUserStore();
  const message = useMessage();
  const [currentModalStep, setCurrentModalStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [noteData, setNoteData] = useState<Partial<NoteFormData>>(CONSTANTS.INITIAL_NOTE_DATA);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 样式对象
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
      backgroundColor: "#fafafa",
    },
    modalTitle: {
      fontSize: "18px",
      fontWeight: 600,
      color: "#333",
      margin: 0,
    },
    modalCloseButton: {
      background: "none",
      border: "none",
      fontSize: "20px",
      cursor: "pointer",
      color: "#999",
      padding: "4px",
      borderRadius: "4px",
      transition: "all 0.2s ease",
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
      backgroundColor: "#fafafa",
    },
  };

  // 实际上传图片到COS的方法
  const uploadImagesToCOS = async (fileList: UploadFile[], account: string): Promise<string[]> => {
    if (!fileList.length || !account || !email) return [];

    console.log(`开始上传 ${fileList.length} 张图片到COS...`);

    const uploadPromises = fileList.map(async (file) => {
      try {
        if (!file.originFileObj) {
          throw new Error(`文件 ${file.name} 缺少原始文件对象`);
        }

        const uploadPath = `${email}/${account}`;
        const cosService = tencentCOSService;
        const result = await cosService.uploadFile(
          file.originFileObj as File,
          uploadPath,
          undefined,
          "xhs-notes-resources-1347723456"
        );

        const customPath = `${email}/${account}/${file.name}`;
        return customPath;
      } catch (error) {
        console.error(`${file.name} 上传失败:`, error);
        throw error;
      }
    });

    try {
      const uploadedPaths = await Promise.all(uploadPromises);
      console.log("所有图片上传完成，使用自定义路径格式:", uploadedPaths);
      return uploadedPaths;
    } catch (error) {
      console.error("图片上传过程中出现错误:", error);
      throw error;
    }
  };

  // 提交笔记到服务器
  const submitNote = async (data: NoteFormData) => {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
    const escapedEmail = (email || "").replace(/@/g, "_at_").replace(/\./g, "_dot_");
    const dag_run_id = "notes_publish_" + escapedEmail + "_" + timestamp;

    setSubmitting(true);
    try {
      const result = await addNoteApi({
        email: email || "",
        title: data.note_title || "",
        content: data.note_content || "",
        author: data.account || "",
        device_id: data.device_id || "",
        img_list: data.images || "",
        status: 2,
      });

      if (result.code === 0 && result.message === "success") {
        message.success("笔记提交成功！");

        const conf = {
          email: email,
          device_id: data.device_id || "",
          note_title: data.note_title || "",
          note_content: data.note_content || "",
          note_tags_list: data.note_tags_list || [],
          note_at_users: data.at_users || "[]",
          note_visit_scale: data.visibility,
        };

        const promise = triggerDagRun("notes_publish", dag_run_id, conf);
        promise
          .then(() => {
            message.success("任务创建成功" + dag_run_id);
            // 重置状态
            setNoteData(CONSTANTS.INITIAL_NOTE_DATA);
            setFileList([]);
            setCurrentModalStep(0);
            onSuccess();
            onClose();
          })
          .catch((err) => {
            console.log("创建dag任务失败", err);
          });
      }
    } catch (error) {
      console.error("提交笔记失败:", error);
      message.error("提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  // 处理数据变化
  const handleDataChange = (data: Partial<NoteFormData>) => {
    setNoteData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  // 处理上一步点击
  const handlePreviousStep = () => {
    setCurrentModalStep(currentModalStep - 1);
  };

  // 处理保存草稿点击
  const handleSaveDraft = () => {
    console.log("保存草稿:", noteData);
    message.success("草稿保存成功！");
  };

  // 处理下一步/提交按钮点击
  const handleNextStepOrSubmit = async () => {
    if (currentModalStep < 1) {
      // 验证第一步数据
      if (!noteData.account) {
        message.error("请选择发布账号");
        return;
      }
      if (!noteData.note_title) {
        message.error("请填写笔记标题");
        return;
      }
      if (!noteData.note_content) {
        message.error("请填写笔记内容");
        return;
      }

      setCurrentModalStep(currentModalStep + 1);
    } else {
      // 提交笔记
      try {
        // 最终数据验证
        if (
          !noteData.note_title ||
          !noteData.note_content ||
          !noteData.visibility ||
          !noteData.account
        ) {
          message.error("请完善所有必填信息");
          return;
        }

        // 上传图片到COS
        let finalImageUrls = noteData.images || "";
        if (fileList.length > 0) {
          try {
            message.loading({ content: "正在上传图片...", key: "uploading", duration: 0 });
            const uploadedPaths = await uploadImagesToCOS(fileList, noteData.account);
            finalImageUrls = uploadedPaths.join(",");
            handleDataChange({ images: finalImageUrls });
            message.success({ content: "图片上传完成！", key: "uploading", duration: 2 });
          } catch (error) {
            message.error({ content: "图片上传失败，请重试", key: "uploading", duration: 3 });
            return;
          }
        }

        // 收集完整数据
        const completeData: NoteFormData = {
          note_title: noteData.note_title,
          note_content: noteData.note_content,
          note_tags_list: noteData.note_tags_list || [],
          at_users: noteData.at_users || "[]",
          images: finalImageUrls,
          visibility: noteData.visibility,
          account: noteData.account,
          device_id: noteData.device_id || "",
        };

        await submitNote(completeData);
      } catch (error) {
        console.error("提交失败:", error);
        message.error("提交失败，请检查网络连接");
      }
    }
  };

  // ESC键关闭弹窗
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && visible) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div style={styles.modalOverlay} className="modal-overlay-enter" onClick={onClose}>
      <div
        style={styles.modalContainer}
        className="modal-container-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 弹窗头部 */}
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>创建内容任务</h3>
          <button
            style={styles.modalCloseButton}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f5f5f5";
              e.currentTarget.style.color = "#333";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#999";
            }}
          >
            <CloseOutlined />
          </button>
        </div>

        {/* 弹窗内容 */}
        <div style={styles.modalBody}>
          <AddNewTaskContent
            currentStep={currentModalStep}
            setCurrentStep={setCurrentModalStep}
            onDataChange={handleDataChange}
            noteData={noteData}
            fileList={fileList}
            setFileList={setFileList}
          />
        </div>

        {/* 弹窗底部 */}
        <div style={styles.modalFooter}>
          {currentModalStep > 0 && <Button onClick={handlePreviousStep}>上一步</Button>}
          <Button onClick={handleSaveDraft}>保存草稿</Button>
          <Button type="primary" loading={submitting} onClick={handleNextStepOrSubmit}>
            {submitting ? "提交中..." : currentModalStep < 1 ? "下一步" : "提交笔记"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddNewTaskModal;
