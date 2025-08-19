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
  isDraft: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddNewTaskModal: React.FC<AddNewTaskModalProps> = ({
  visible,
  isDraft,
  onClose,
  onSuccess,
}) => {
  const { email } = useUserStore();
  const message = useMessage();
  const [currentModalStep, setCurrentModalStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [noteData, setNoteData] = useState<Partial<NoteFormData>>(CONSTANTS.INITIAL_NOTE_DATA);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 处理文件名中的逗号，替换为下划线
  const sanitizeFileName = (fileName: string): string => {
    // 替换中文逗号和英文逗号为下划线
    return fileName.replace(/[,，]/g, "_");
  };

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

        // 处理文件名，替换逗号为下划线
        const sanitizedFileName = sanitizeFileName(file.name);
        console.log(`原文件名: ${file.name} -> 处理后文件名: ${sanitizedFileName}`);

        const uploadPath = `${email}/${account}`;
        const cosService = tencentCOSService;

        // 创建一个新的File对象，使用处理后的文件名
        const sanitizedFile = new File([file.originFileObj], sanitizedFileName, {
          type: file.originFileObj.type,
          lastModified: file.originFileObj.lastModified,
        });

        const result = await cosService.uploadFile(
          sanitizedFile,
          uploadPath,
          undefined,
          "xhs-notes-resources-1347723456"
        );

        // 返回处理后的文件名（不带路径前缀）
        return sanitizedFileName;
      } catch (error) {
        console.error(`${file.name} 上传失败:`, error);
        throw error;
      }
    });

    try {
      const uploadedPaths = await Promise.all(uploadPromises);
      console.log("所有图片上传完成，文件名列表:", uploadedPaths);
      return uploadedPaths;
    } catch (error) {
      console.error("图片上传过程中出现错误:", error);
      throw error;
    }
  };

  // 提交笔记到服务器
  const submitNote = async (data: NoteFormData, forceDraft = false, skipLoadingState = false) => {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
    const escapedEmail = (email || "").replace(/@/g, "_at_").replace(/\./g, "_dot_");
    const dag_run_id = "notes_publish_" + escapedEmail + "_" + timestamp;

    if (!skipLoadingState) {
      setSubmitting(true);
    }
    try {
      // 处理图片列表格式 - 转换为逗号分隔的字符串格式
      let processedImageList = "";
      if (data.images) {
        // 直接使用逗号分隔的字符串格式
        processedImageList = data.images;
        console.log("图片列表（逗号分隔格式）:", processedImageList);
      }

      // 处理标签列表格式 - 转换为JSON字符串数组格式，由于user在填写的时候就已经转换成转义字符串格式了，所以这里就直接用data.at_users
      let processedTagsList = "";
      if (data.note_tags_list && data.note_tags_list.length > 0) {
        processedTagsList = JSON.stringify(data.note_tags_list);
      }
      // 判断是否为草稿状态：原本的 isDraft 或者 forceDraft 参数
      const isActuallyDraft = isDraft || forceDraft;

      const apiParams = {
        email: email || "",
        title: data.note_title || "",
        content: data.note_content || "",
        author: data.account || "",
        device_id: data.device_id || "",
        img_list: processedImageList,
        status: isActuallyDraft ? 0 : 2,
        visiable_scale: data.visibility,
        at_users: data.at_users || "[]",
        note_tags: processedTagsList,
      };

      console.log("发送到API的参数:", apiParams);
      const result = await addNoteApi(apiParams);

      //草稿箱不触发dag任务
      if (result.code === 0 && result.message === "success" && isActuallyDraft) {
        message.success("草稿保存成功！");
        setNoteData(CONSTANTS.INITIAL_NOTE_DATA);
        setFileList([]);
        setCurrentModalStep(0);
        onSuccess();
        onClose();
        return;
      }
      //非草稿箱触发dag
      if (result.code === 0 && result.message === "success" && !isActuallyDraft) {
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
      if (!skipLoadingState) {
        setSubmitting(false);
      }
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
  const handleSaveDraft = async () => {
    try {
      // 基本数据验证
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

      setSavingDraft(true);

      // 上传图片到COS
      let finalImageUrls = noteData.images || "";
      if (fileList.length > 0) {
        try {
          message.loading({ content: "正在上传图片...", key: "uploading", duration: 0 });
          const uploadedPaths = await uploadImagesToCOS(fileList, noteData.account);
          // 将文件名数组转换为逗号分隔的字符串格式
          finalImageUrls = uploadedPaths.join(",");
          handleDataChange({ images: finalImageUrls });
          console.log("最终图片字符串:", finalImageUrls);
          message.success({ content: "图片上传完成！", key: "uploading", duration: 2 });
        } catch (error) {
          message.error({ content: "图片上传失败，请重试", key: "uploading", duration: 3 });
          return;
        }
      }

      // 收集完整数据，status 设为 0（草稿状态）
      const completeData: NoteFormData = {
        note_title: noteData.note_title || "",
        note_content: noteData.note_content || "",
        note_tags_list: noteData.note_tags_list || [],
        at_users: noteData.at_users || "[]",
        images: finalImageUrls,
        visibility: noteData.visibility || "",
        account: noteData.account || "",
        device_id: noteData.device_id || "",
      };
      console.log("保存草稿完整数据:", completeData);

      // 调用 submitNote，传入 forceDraft = true 和 skipLoadingState = true
      await submitNote(completeData, true, true);
    } catch (error) {
      console.error("保存草稿失败:", error);
      message.error("保存草稿失败，请检查网络连接");
    } finally {
      setSavingDraft(false);
    }
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
            // 将文件名数组转换为逗号分隔的字符串格式
            finalImageUrls = uploadedPaths.join(",");
            handleDataChange({ images: finalImageUrls });
            console.log("最终图片字符串:", finalImageUrls);
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
        console.log("收集完整数据", completeData);

        // 提交笔记数据
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
          <Button loading={savingDraft} onClick={handleSaveDraft}>
            {savingDraft ? "保存中..." : "保存草稿"}
          </Button>
          <Button type="primary" loading={submitting} onClick={handleNextStepOrSubmit}>
            {submitting ? "提交中..." : currentModalStep < 1 ? "下一步" : "提交笔记"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddNewTaskModal;
