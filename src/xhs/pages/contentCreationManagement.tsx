import React, { CSSProperties, useState } from "react";
import ContentTopUserMessage from "../components/ContentTopUserMessage";
import ContentDashEcharts from "../components/ContentDashEcharts";
import {
  Tooltip,
  Table,
  Button,
  Tag,
  Space,
  Form,
  Input,
  Select,
  Image,
  Upload,
  message,
} from "antd";
import type { UploadFile, UploadProps } from "antd";
import {
  InfoCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckOutlined,
  PlusOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import "./contentCreationManagement.module.css";
import { useUserStore } from "../../store/userStore";
import { tencentCOSService } from "../../api/tencent_cos";
import { addNoteApi } from "../../api/mysql";
import { triggerDagRun } from "../../api/airflow";
// 类型定义
type FileType = Parameters<NonNullable<UploadProps["beforeUpload"]>>[0];

// 常量定义
const CONSTANTS = {
  MAX_FILE_SIZE: 5, // MB
  MAX_IMAGE_COUNT: 9,
  MAX_TITLE_LENGTH: 20,
  MAX_CONTENT_LENGTH: 1000,
  SUPPORTED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif"],
  TOPIC_SEPARATOR_REGEX: /[,，]/, // 中英文逗号
  INITIAL_NOTE_DATA: {
    note_title: "",
    note_content: "",
    note_tags_list: [] as string[],
    at_users: "",
    images: "",
    visibility: "公开可见",
    account: "",
    device_id: "",
  },
} as const;

// 工具函数：将文件转换为base64
const getBase64 = (file: FileType): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

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

  dataReportCard: {
    flex: 1,
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    minHeight: "200px",
  } as CSSProperties,

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "16px",
    fontWeight: 600,
    color: "#333",
  } as CSSProperties,

  chartContainer: {
    flex: 1,
    minHeight: "120px",
  } as CSSProperties,

  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "8px",
    fontSize: "12px",
    color: "#666",
  } as CSSProperties,

  statsItem: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "4px",
  } as CSSProperties,

  statsLabel: {
    color: "#999",
    fontSize: "11px",
  } as CSSProperties,

  statsValue: {
    color: "#333",
    fontWeight: 600,
    fontSize: "14px",
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

  // 自定义弹窗样式
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
  } as CSSProperties,

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
  } as CSSProperties,

  modalHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #f0f0f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fafafa",
  } as CSSProperties,

  modalTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#333",
    margin: 0,
  } as CSSProperties,

  modalCloseButton: {
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#999",
    padding: "4px",
    borderRadius: "4px",
    transition: "all 0.2s ease",
  } as CSSProperties,

  modalBody: {
    padding: "24px",
    flex: 1,
    overflow: "auto",
  } as CSSProperties,

  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #f0f0f0",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    backgroundColor: "#fafafa",
  } as CSSProperties,

  // 正方形单选按钮样式
  squareRadioGroup: {
    display: "flex",
    gap: "8px",
  } as CSSProperties,

  squareRadioButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "20px",
    minHeight: "20px",
    padding: "2px",
    borderRadius: "4px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#d9d9d9",
    backgroundColor: "#fff",
    color: "#666",
    cursor: "pointer",
    transition: "all 0.2s ease",
    userSelect: "none" as const,
    boxSizing: "border-box" as const,
  } as CSSProperties,

  squareRadioLabel: {
    marginLeft: "8px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    userSelect: "none" as const,
  } as CSSProperties,

  squareRadioButtonActive: {
    backgroundColor: "#1890ff",
    borderColor: "#1890ff",
    color: "#fff",
  } as CSSProperties,

  modalProgressHeaderLeft: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1e293b",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  } as CSSProperties,

  modalProgressHeaderRight: {
    fontSize: "14px",
    color: "#64748b",
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: "6px",
    transition: "all 0.2s ease",
    backgroundColor: "#f1f5f9",
    border: "1px solid transparent",
    fontWeight: "500",
  } as CSSProperties,

  // 进度指示器容器
  progressIndicatorContainer: {
    border: "1px solid red",
    position: "absolute",
    bottom: "-1px",
    left: "0",
    right: "0",
    height: "3px",
    // backgroundColor: "#e2e8f0",
    // backgroundColor: "red",
    borderRadius: "0 0 12px 12px",
    overflow: "hidden",
  } as CSSProperties,

  // 进度条
  progressBar: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: "0 0 12px 12px",
    transition: "width 0.3s ease",
    background: "linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)",
    boxShadow: "0 0 8px rgba(59, 130, 246, 0.3)",
  } as CSSProperties,

  // 步骤圆点
  stepDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#3b82f6",
    marginRight: "4px",
    boxShadow: "0 0 4px rgba(59, 130, 246, 0.4)",
  } as CSSProperties,
};

// 统计项组件
const StatsItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={styles.statsItem}>
    <div style={styles.statsLabel}>{label}</div>
    <div style={styles.statsValue}>{value}</div>
  </div>
);

// 正方形单选按钮组件
const SquareRadioGroup: React.FC<{
  options: { value: number; label: string }[];
  value: number;
  onChange: (value: number) => void;
}> = ({ options, value, onChange }) => (
  <div style={styles.squareRadioGroup}>
    {options.map((option) => {
      const isActive = value === option.value;
      return (
        <div
          key={option.value}
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          onClick={() => onChange(option.value)}
        >
          <div
            style={{
              ...styles.squareRadioButton,
              ...(isActive ? styles.squareRadioButtonActive : {}),
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = "#40a9ff";
                e.currentTarget.style.color = "#40a9ff";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = "#d9d9d9";
                e.currentTarget.style.color = "#666";
              }
            }}
          >
            {isActive && <CheckOutlined style={{ fontSize: "14px" }} />}
          </div>
          <span style={styles.squareRadioLabel}>{option.label}</span>
        </div>
      );
    })}
  </div>
);

interface DataReportProps {
  title: string;
  tooltipText?: React.ReactNode;
  total: number;
  chartData: { time: string; value: number }[];
  bottomChildren: React.ReactNode;
}
const mockdata = [
  {
    time: "2025-01-01",
    value: 100,
  },
  {
    time: "2025-01-02",
    value: 200,
  },
  {
    time: "2025-01-03",
    value: 300,
  },
  {
    time: "2025-01-04",
    value: 400,
  },
  {
    time: "2025-01-05",
    value: 500,
  },
  {
    time: "2025-01-06",
    value: 600,
  },
];
const mockTableData = [
  {
    noteTitle: "TradeCode 99",
    noteLink: "Vel cras auctor at to",
    noteContent: "Vel cras auctor at to",
    publishAccount: "Vel cras auctor at to",
    publishHost: "Vel cras auctor at to",
    readCount: 3638066,
    interactionCount: 3638066,
    status: "成功",
    publishTime: "2021-02-05 08:28:36",
  },
  {
    noteTitle: "TradeCode 98",
    noteLink: "Quam aliquam odio",
    noteContent: "Quam aliquam odio",
    publishAccount: "/",
    publishHost: "/",
    readCount: 0,
    interactionCount: 0,
    status: "等待",
    publishTime: "2021-02-03 19:49:33",
  },
  {
    noteTitle: "TradeCode 97",
    noteLink: "Mauris quam tristique",
    noteContent: "Mauris quam tristique",
    publishAccount: "/",
    publishHost: "/",
    readCount: 0,
    interactionCount: 0,
    status: "失败",
    publishTime: "2021-02-02 19:17:15",
  },
  {
    noteTitle: "TradeCode 96",
    noteLink: "Fermentum porttitor",
    noteContent: "Fermentum porttitor",
    publishAccount: "/",
    publishHost: "/",
    readCount: 2592335,
    interactionCount: 2592335,
    status: "成功",
    publishTime: "2021-02-02 09:46:33",
  },
  {
    noteTitle: "TradeCode 95",
    noteLink: "Sed at ornare scelerisque",
    noteContent: "Sed at ornare scelerisque",
    publishAccount: "/",
    publishHost: "/",
    readCount: 6337875,
    interactionCount: 6337875,
    status: "成功",
    publishTime: "2021-02-02 07:57:01",
  },
  {
    noteTitle: "TradeCode 94",
    noteLink: "Molestie est pharetra",
    noteContent: "Molestie est pharetra",
    publishAccount: "/",
    publishHost: "/",
    readCount: 4927239,
    interactionCount: 4927239,
    status: "成功",
    publishTime: "2021-02-02 05:01:54",
  },
  {
    noteTitle: "TradeCode 93",
    noteLink: "Et adipiscing vitae a",
    noteContent: "Et adipiscing vitae a",
    publishAccount: "/",
    publishHost: "/",
    readCount: 6241243,
    interactionCount: 6241243,
    status: "成功",
    publishTime: "2021-02-02 00:18:11",
  },
];
//数据报表组件
const DataReport = ({ title, tooltipText, total, chartData, bottomChildren }: DataReportProps) => {
  return (
    <div style={styles.dataReportCard}>
      <div style={styles.cardHeader}>
        <span>{title}</span>
        {tooltipText && (
          <Tooltip title={tooltipText}>
            <InfoCircleOutlined style={{ color: "#999", cursor: "help" }} />
          </Tooltip>
        )}
      </div>
      <div style={styles.chartContainer}>
        <ContentDashEcharts dataKey={chartData} height={120} />
      </div>
      <div style={styles.cardFooter}>{bottomChildren}</div>
    </div>
  );
};
// 进度步骤组件
const ProgressSteps: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = ["编辑笔记", "发布设置"];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexDirection: "column",
        marginBottom: "5px",
      }}
    >
      {/* 步骤指示器 */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        {/* 第一个步骤圆点 */}
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: currentStep >= 0 ? "#3b82f6" : "#cbd5e1",
            transition: "all 0.3s ease",
            marginLeft: "30px",
          }}
        />

        {/* 连接线 */}
        <div
          style={{
            height: "2px",
            flex: 1,
            backgroundColor: currentStep > 0 ? "#3b82f6" : "#e2e8f0",
            transition: "background-color 0.3s ease",
          }}
        />

        {/* 第二个步骤圆点 */}
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: currentStep >= 1 ? "#3b82f6" : "#cbd5e1",
            transition: "all 0.3s ease",
            marginRight: "30px",
          }}
        />
      </div>

      {/* 步骤标题 */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {steps.map((step, index) => (
          <div
            style={{
              width: "70px",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: currentStep === index ? "600" : "500",
              color: currentStep >= index ? "#3b82f6" : "#64748b",
              transition: "all 0.3s ease",
            }}
            key={index}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
};

//任务弹窗内容
interface AddNewTaskContentProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  onDataChange: (data: Partial<NoteFormData>) => void;
  noteData: Partial<NoteFormData>;
  fileList: UploadFile[];
  setFileList: (fileList: UploadFile[]) => void;
}

// 笔记数据接口定义
interface NoteFormData {
  note_title: string;
  note_content: string;
  note_tags_list: string[]; // 话题数组：["美食", "bbw", "好吃的"]
  at_users: string; // @用户数组的JSON字符串格式：'["用户1", "用户2"]'
  images: string; // 图片路径字符串，格式：email/123.jpg,email/789.png
  visibility: string;
  account: string;
  device_id: string;
}

const AddNewTaskContent: React.FC<AddNewTaskContentProps> = ({
  currentStep,
  setCurrentStep,
  onDataChange,
  noteData,
  fileList,
  setFileList,
}) => {
  const { email, userDeviceNickNameList } = useUserStore();
  const [form] = Form.useForm();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [uploading, setUploading] = useState(false);

  // 图片预览处理
  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as FileType);
    }
    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
  };

  // 文件上传前的验证
  const beforeUpload = (file: FileType) => {
    const isValidType = CONSTANTS.SUPPORTED_IMAGE_TYPES.includes(file.type as any);
    if (!isValidType) {
      message.error("只能上传 JPG/PNG/GIF 格式的图片!");
      return false;
    }

    const isLtMaxSize = file.size / 1024 / 1024 < CONSTANTS.MAX_FILE_SIZE;
    if (!isLtMaxSize) {
      message.error(`图片大小不能超过 ${CONSTANTS.MAX_FILE_SIZE}MB!`);
      return false;
    }

    return true;
  };

  // 文件列表变化处理
  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    // 处理上传状态
    setFileList(newFileList);

    // 实时更新图片路径
    const imagePaths = generateImagePaths(newFileList);
    onDataChange({
      images: imagePaths,
    });
  };

  // 生成图片路径字符串
  const generateImagePaths = (fileList: UploadFile[], account?: string) => {
    if (!email) return "";

    const currentAccount = account || noteData.account;
    if (!currentAccount) return "";

    const successfulFiles = fileList.filter((file) => file.status === "done" && file.name);
    const paths = successfulFiles.map((file) => `${email}/${currentAccount}/${file.name}`);
    return paths.join(",");
  };

  // 解析话题字符串为数组
  const parseTopics = (topicString: string): string[] => {
    if (!topicString || typeof topicString !== "string") return [];

    // 支持中英文逗号分隔，清除多余空格
    return topicString
      .split(CONSTANTS.TOPIC_SEPARATOR_REGEX) // 按中英文逗号分割
      .map((topic) => topic.trim()) // 清除每个话题的前后空格
      .filter((topic) => topic.length > 0); // 过滤空字符串
  };

  // 格式化话题数组为显示字符串
  const formatTopicsForDisplay = (topics: string[]): string => {
    return topics.join(", ");
  };

  // 解析@用户字符串为数组
  const parseAtUsers = (userString: string): string[] => {
    if (!userString || typeof userString !== "string") return [];

    // 支持中英文逗号分隔，清除多余空格
    return userString
      .split(CONSTANTS.TOPIC_SEPARATOR_REGEX) // 按中英文逗号分割
      .map((user) => user.trim()) // 清除每个用户名的前后空格
      .filter((user) => user.length > 0); // 过滤空字符串
  };

  // 安全解析@用户JSON字符串
  const safeParseAtUsers = (atUsersJson: string): string[] => {
    if (!atUsersJson || typeof atUsersJson !== "string") {
      return [];
    }

    try {
      const parsed = JSON.parse(atUsersJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("解析@用户JSON失败:", error, atUsersJson);
      return [];
    }
  };

  // 格式化@用户数组为显示字符串
  const formatAtUsersForDisplay = (users: string[]): string => {
    if (!Array.isArray(users)) {
      console.warn("formatAtUsersForDisplay: 输入不是数组", users);
      return "";
    }
    return users.join(", ");
  };

  // 模拟上传逻辑（只生成预览，不实际上传）
  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;

    try {
      setUploading(true);

      // 检查是否选择了账号
      if (!noteData.account) {
        message.error("请先选择发布账号！");
        onError(new Error("请先选择发布账号"));
        setUploading(false);
        return;
      }

      // 模拟上传进度
      let percent = 0;
      const timer = setInterval(() => {
        percent += 20;
        onProgress({ percent });
        if (percent >= 100) {
          clearInterval(timer);
          // 只生成本地预览，不实际上传
          setTimeout(() => {
            const response = {
              url: URL.createObjectURL(file), // 本地预览URL
              name: file.name,
              // 生成预期的服务器路径（但不实际上传）
              serverPath: `${email}/${noteData.account}/${file.name}`,
              status: "ready", // 标记为准备上传状态
            };
            onSuccess(response);
            message.success(`${file.name} 准备就绪，将在提交时上传！`);
            setUploading(false);
          }, 300);
        }
      }, 100);
    } catch (error) {
      console.error("准备上传失败:", error);
      onError(error);
      message.error(`${file.name} 准备失败！`);
      setUploading(false);
    }
  };

  // 删除文件处理
  const handleRemove = (file: UploadFile) => {
    const newFileList = fileList.filter((item) => item.uid !== file.uid);
    setFileList(newFileList);
    message.success("图片删除成功！");
  };

  //上传按钮
  const uploadButton = (
    <button
      style={{
        border: 0,
        background: "none",
        cursor: uploading ? "not-allowed" : "pointer",
        opacity: uploading ? 0.6 : 1,
      }}
      type="button"
      disabled={uploading}
    >
      <PlusOutlined />
      <div style={{ marginTop: 8, fontSize: "14px", color: "#666" }}>
        {uploading ? "上传中..." : "上传图片"}
      </div>
    </button>
  );
  //form表单
  const layout = {
    labelCol: { span: 5 },
    wrapperCol: { span: 20 },
  };

  // 表单字段变化处理
  const onFormValuesChange = (changedValues: any, allValues: any) => {
    // 映射表单字段到我们的数据结构
    const updatedData: Partial<NoteFormData> = {};

    if ("title" in changedValues) {
      updatedData.note_title = changedValues.title;
    }
    if ("content" in changedValues) {
      updatedData.note_content = changedValues.content;
    }
    if ("topic" in changedValues) {
      // 解析话题字符串为数组
      const topicsArray = parseTopics(changedValues.topic);
      updatedData.note_tags_list = topicsArray;
      console.log("话题解析结果:", topicsArray);
    }
    if ("user" in changedValues) {
      // 解析@用户字符串为数组，并转换为JSON字符串存储
      const usersArray = parseAtUsers(changedValues.user);
      updatedData.at_users = JSON.stringify(usersArray);
      console.log("@用户解析结果:", usersArray);
      console.log("@用户存储格式:", updatedData.at_users);
    }
    if ("visibility" in changedValues) {
      updatedData.visibility = changedValues.visibility;
    }
    if ("account" in changedValues) {
      updatedData.account = changedValues.account;

      // 查找对应的device_id
      let deviceId = "";
      userDeviceNickNameList.forEach((item) => {
        if (typeof item === "object" && item !== null) {
          const entries = Object.entries(item);
          if (entries.length > 0) {
            const [deviceIdKey, nickname] = entries[0];
            if (nickname === changedValues.account) {
              deviceId = deviceIdKey;
            }
          }
        }
      });

      updatedData.device_id = deviceId;
      console.log(`账号变更为 ${changedValues.account}，对应设备ID: ${deviceId}`);

      // 账号变更时，更新所有图片的路径
      if (fileList.length > 0) {
        const updatedImagePaths = generateImagePaths(fileList, changedValues.account);
        updatedData.images = updatedImagePaths;
        console.log(`更新图片路径:`, updatedImagePaths);
        message.info(`已更新 ${fileList.length} 张图片的存储路径`);
      }
    }

    onDataChange(updatedData);
  };

  // 表单提交处理
  const onFinish = (values: any) => {
    console.log("表单提交:", values);
    console.log("完整数据:", noteData);
  };

  // 处理清空所有图片
  const handleClearAllImages = () => {
    setFileList([]);
    onDataChange({ images: "" }); // 同时清空数据中的图片路径
    message.success("已清空所有图片");
  };

  // 渲染当前步骤的内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // 编辑笔记步骤
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* 第一步：选择账号 */}
            <div
              style={{
                paddingTop: "20px",
                paddingRight: "20px",
                border: "1px solid #e8e8e8",
                borderRadius: "8px",
                backgroundColor: "#fafafa",
              }}
            >
              <Form
                {...layout}
                form={form}
                onValuesChange={onFormValuesChange}
                initialValues={{
                  account: noteData.account,
                }}
              >
                <Form.Item
                  label="选择小红书账号"
                  name="account"
                  rules={[{ required: true, message: "请选择发布账号" }]}
                >
                  <Select placeholder="请选择要发布的账号" size="large">
                    {userDeviceNickNameList.map((item, index) => {
                      // 处理新的数据格式：{ "设备ID": "昵称" }
                      if (typeof item === "object" && item !== null) {
                        // 获取对象的第一个键值对
                        const entries = Object.entries(item);
                        if (entries.length > 0) {
                          const [deviceId, nickname] = entries[0];
                          return (
                            <Select.Option key={index} value={nickname as string}>
                              📱 {nickname as string}
                            </Select.Option>
                          );
                        }
                      }

                      // 兼容字符串格式（如果有的话）
                      if (typeof item === "string") {
                        return (
                          <Select.Option key={index} value={item}>
                            📱 {item}
                          </Select.Option>
                        );
                      }

                      // 如果格式不匹配，返回null
                      return null;
                    })}
                  </Select>
                </Form.Item>
              </Form>
            </div>

            {/* 第二步：内容编辑区域 - 只有选择了账号才显示 */}
            {noteData.account && (
              <div style={{ display: "flex", flexDirection: "row", gap: "20px" }}>
                {/* 图片上传区域 */}
                <div
                  style={{
                    padding: "10px",
                    border: "1px solid #e8e8e8",
                    borderRadius: "8px",
                    flex: 1,
                  }}
                >
                  <div style={{ marginBottom: "20px" }}>
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        marginBottom: "8px",
                        color: "#333",
                      }}
                    >
                      添加图片
                    </h3>
                    <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                      最多可上传{CONSTANTS.MAX_IMAGE_COUNT}
                      张图片，支持JPG、PNG、GIF格式，单张图片不超过
                      {CONSTANTS.MAX_FILE_SIZE}MB
                    </p>
                  </div>
                  <div className="upload-container">
                    <Upload
                      customRequest={handleUpload}
                      listType="picture-card"
                      fileList={fileList}
                      onPreview={handlePreview}
                      onChange={handleChange}
                      onRemove={handleRemove}
                      beforeUpload={beforeUpload}
                      multiple
                      accept="image/*"
                      showUploadList={{
                        showPreviewIcon: true,
                        showRemoveIcon: true,
                        showDownloadIcon: false,
                      }}
                    >
                      {fileList.length >= CONSTANTS.MAX_IMAGE_COUNT ? null : uploadButton}
                    </Upload>
                  </div>
                  {/* 图片预览模态框 */}
                  {previewImage && (
                    <Image
                      wrapperStyle={{ display: "none" }}
                      preview={{
                        visible: previewOpen,
                        onVisibleChange: (visible) => setPreviewOpen(visible),
                        afterOpenChange: (visible) => !visible && setPreviewImage(""),
                      }}
                      src={previewImage}
                    />
                  )}
                  {/* 操作按钮 */}
                  {fileList.length > 0 && (
                    <div
                      style={{
                        marginTop: "16px",
                        display: "flex",
                        gap: "8px",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button size="small" onClick={handleClearAllImages}>
                        清空所有
                      </Button>
                    </div>
                  )}
                </div>

                {/* 表单编辑区域 */}
                <div
                  style={{
                    flex: 1,
                    border: "1px solid #e8e8e8",
                    borderRadius: "8px",
                    padding: "10px",
                  }}
                >
                  <Form
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 20 }}
                    form={form}
                    onFinish={onFinish}
                    onValuesChange={onFormValuesChange}
                    initialValues={{
                      title: noteData.note_title,
                      content: noteData.note_content,
                      topic: noteData.note_tags_list
                        ? formatTopicsForDisplay(noteData.note_tags_list)
                        : "",
                      user: formatAtUsersForDisplay(safeParseAtUsers(noteData.at_users || "")),
                    }}
                  >
                    <Form.Item
                      label="标题"
                      name="title"
                      rules={[
                        { required: true, message: "请输入笔记标题" },
                        {
                          max: CONSTANTS.MAX_TITLE_LENGTH,
                          message: `标题不能超过${CONSTANTS.MAX_TITLE_LENGTH}个字符`,
                        },
                      ]}
                    >
                      <Input.TextArea
                        showCount
                        maxLength={CONSTANTS.MAX_TITLE_LENGTH}
                        placeholder="请输入吸引人的笔记标题..."
                        autoSize={{ minRows: 1, maxRows: 2 }}
                      />
                    </Form.Item>
                    <Form.Item
                      label="正文内容"
                      name="content"
                      rules={[
                        { required: true, message: "请输入笔记内容" },
                        {
                          max: CONSTANTS.MAX_CONTENT_LENGTH,
                          message: `内容不能超过${CONSTANTS.MAX_CONTENT_LENGTH}个字符`,
                        },
                      ]}
                    >
                      <Input.TextArea
                        showCount
                        maxLength={CONSTANTS.MAX_CONTENT_LENGTH}
                        placeholder="分享你的想法和体验..."
                        autoSize={{ minRows: 4, maxRows: 8 }}
                      />
                    </Form.Item>
                  </Form>
                </div>
              </div>
            )}

            {/* 未选择账号时的提示 */}
            {!noteData.account && (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  border: "2px dashed #d9d9d9",
                  borderRadius: "8px",
                  backgroundColor: "#fafafa",
                  color: "#999",
                }}
              >
                <div style={{ fontSize: "16px", marginBottom: "8px" }}>📱 请先选择发布账号</div>
                <div style={{ fontSize: "14px" }}>选择账号后即可开始编辑笔记内容和上传图片</div>
              </div>
            )}
          </div>
        );

      case 1:
        // 发布设置步骤
        return (
          <div style={{ padding: "20px" }}>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={onFormValuesChange}
              initialValues={{
                visibility: noteData.visibility,
                account: noteData.account,
              }}
            >
              <Form.Item
                label="可见范围"
                name="visibility"
                rules={[{ required: true, message: "请选择可见范围" }]}
              >
                <Select placeholder="请选择可见范围">
                  <Select.Option value="公开可见">🌍 公开可见</Select.Option>
                  <Select.Option value="仅自己可见">🔒 仅自己可见</Select.Option>
                  <Select.Option value="仅互关好友可见">👥 仅互关好友可见</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                label="#话题"
                name="topic"
                extra={
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    <div>多个话题请用逗号分隔，如：美食,生活,推荐</div>
                    {noteData.note_tags_list && noteData.note_tags_list.length > 0 && (
                      <div style={{ marginTop: "4px", color: "#1890ff" }}>
                        已解析话题: {JSON.stringify(noteData.note_tags_list)}
                        <span style={{ marginLeft: "8px", color: "#52c41a" }}>
                          ({noteData.note_tags_list.length}个话题)
                        </span>
                      </div>
                    )}
                  </div>
                }
              >
                <Input.TextArea
                  showCount
                  placeholder="添加相关话题，增加曝光度..."
                  autoSize={{ minRows: 1, maxRows: 2 }}
                />
              </Form.Item>
              <Form.Item label="@用户" name="user" extra="@好友一起互动，多个用户请用逗号分隔">
                <Input.TextArea
                  showCount
                  placeholder="@你想要互动的用户，多个用户用逗号分隔..."
                  autoSize={{ minRows: 1, maxRows: 2 }}
                />
              </Form.Item>
            </Form>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <ProgressSteps currentStep={currentStep} />
      {renderStepContent()}
    </div>
  );
};
//表格任务组件
const ContentCreationManagement = () => {
  const { email } = useUserStore();
  const [formRef] = Form.useForm();
  // 状态管理
  const [currentModalStep, setCurrentModalStep] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [statusValue, setStatusValue] = useState(1);
  const [showAddNewTask, setShowAddNewTask] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 统一的表单数据状态
  const [noteData, setNoteData] = useState<Partial<NoteFormData>>(CONSTANTS.INITIAL_NOTE_DATA);

  // 图片相关状态（从子组件移到父组件）
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 实际上传图片到COS的方法
  const uploadImagesToCOS = async (fileList: UploadFile[], account: string): Promise<string[]> => {
    if (!fileList.length || !account || !email) return [];

    console.log(`开始上传 ${fileList.length} 张图片到COS...`);
    console.log("fileList", fileList);

    const uploadPromises = fileList.map(async (file) => {
      try {
        // 检查文件对象
        if (!file.originFileObj) {
          throw new Error(`文件 ${file.name} 缺少原始文件对象`);
        }

        console.log(`开始上传文件: ${file.name}`);

        // 构建上传路径：email/account （不包含文件名）
        const uploadPath = `${email}/${account}`;
        console.log(`上传路径: ${uploadPath}`);

        // 使用腾讯云COS服务上传文件
        const cosService = tencentCOSService;
        const result = await cosService.uploadFile(
          file.originFileObj as File,
          uploadPath,
          undefined,
          "xhs-notes-resources-1347723456"
        );

        console.log(`${file.name} 上传成功:`, result);
        console.log("result.url", result.url);
        return result.url; // 返回COS上的实际URL
      } catch (error) {
        console.error(`${file.name} 上传失败:`, error);
        throw error;
      }
    });

    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      console.log("所有图片上传完成:", uploadedUrls);
      return uploadedUrls;
    } catch (error) {
      console.error("图片上传过程中出现错误:", error);
      throw error;
    }
  };

  // 处理数据变化
  const handleDataChange = (data: Partial<NoteFormData>) => {
    setNoteData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  // 提交笔记到服务器
  const submitNote = async (data: NoteFormData) => {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
    // 转义email中的@和.字符
    const escapedEmail = (email || "").replace(/@/g, "_at_").replace(/\./g, "_dot_");
    const dag_run_id = "notes_publish_" + escapedEmail + "_" + timestamp;
    setSubmitting(true);
    try {
      console.log("=== 开始提交笔记 ===");
      console.log("提交数据:", JSON.stringify(data, null, 2));

      const result = await addNoteApi({
        email: email || "",
        title: data.note_title || "",
        content: data.note_content || "",
        author: data.account || "",
        device_id: data.device_id || "",
        img_list: data.images || "", // 添加缺少的 img_list 参数
      });

      if (result.code === 0 && result.message === "success") {
        console.log("提交成功:", result);
        message.success("笔记提交成功！");
        // 创建dag任务
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
            // 成功就提示成功
            message.success("任务创建成功" + dag_run_id);
            // 重置状态
            setNoteData(CONSTANTS.INITIAL_NOTE_DATA);
            setFileList([]); // 同时清空文件列表

            // 关闭弹窗
            setShowAddNewTask(false);
            setCurrentModalStep(0);
          })
          .catch((err) => {
            console.log("创建dag任务失败", err);
          });
      }

      // // 重置状态
      // setNoteData(CONSTANTS.INITIAL_NOTE_DATA);
      // setFileList([]); // 同时清空文件列表

      // // 关闭弹窗
      // setShowAddNewTask(false);
      // setCurrentModalStep(0);
    } catch (error) {
      console.error("提交笔记失败:", error);
      message.error("提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
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

      console.log("第一步验证通过，进入下一步");
      setCurrentModalStep(currentModalStep + 1);
    } else {
      // 提交笔记
      try {
        // 最终数据验证
        if (!noteData.note_title) {
          message.error("请填写笔记标题");
          return;
        }
        if (!noteData.note_content) {
          message.error("请填写笔记内容");
          return;
        }
        if (!noteData.visibility) {
          message.error("请选择可见范围");
          return;
        }
        if (!noteData.account) {
          message.error("请选择发布账号");
          return;
        }

        // 第一步完成时，先上传图片到COS
        let finalImageUrls = noteData.images || "";
        if (fileList.length > 0) {
          try {
            message.loading({ content: "正在上传图片...", key: "uploading", duration: 0 });
            console.log("开始上传图片到COS...");

            const uploadedUrls = await uploadImagesToCOS(fileList, noteData.account);

            // 更新图片路径为实际的COS URL
            finalImageUrls = uploadedUrls.join(",");
            console.log("图片上传完成，最终COS URLs:", finalImageUrls);

            // 更新状态中的图片路径
            handleDataChange({
              images: finalImageUrls,
            });

            message.success({ content: "图片上传完成！", key: "uploading", duration: 2 });
          } catch (error) {
            message.error({ content: "图片上传失败，请重试", key: "uploading", duration: 3 });
            console.error("图片上传失败:", error);
            return; // 上传失败时不进入下一步
          }
        }

        // 收集完整数据（使用最新的图片URL）
        const completeData: NoteFormData = {
          note_title: noteData.note_title,
          note_content: noteData.note_content,
          note_tags_list: noteData.note_tags_list || [],
          at_users: noteData.at_users || "[]", // 默认为空数组的JSON字符串
          images: finalImageUrls, // 使用最终的COS URL
          visibility: noteData.visibility,
          account: noteData.account,
          device_id: noteData.device_id || "",
        };

        console.log("=== 提交笔记数据 ===");
        console.log("完整数据对象:", completeData);
        console.log("最终图片路径字符串:", completeData.images);
        console.log("图片数量:", completeData.images ? completeData.images.split(",").length : 0);
        console.log("话题数组:", completeData.note_tags_list);
        console.log("话题数量:", completeData.note_tags_list.length);
        console.log("@用户JSON字符串:", completeData.at_users);
        // 安全解析@用户数组用于日志输出
        const parsedAtUsers = (() => {
          try {
            return completeData.at_users ? JSON.parse(completeData.at_users) : [];
          } catch (error) {
            console.warn("解析@用户数据失败:", error);
            return [];
          }
        })();
        console.log("@用户数组:", parsedAtUsers);
        console.log("选择的账号:", completeData.account);
        console.log("对应设备ID:", completeData.device_id);
        console.log("用户邮箱:", email);

        // 提交到服务器
        await submitNote(completeData);
      } catch (error) {
        console.error("提交失败:", error);
        message.error("提交失败，请检查网络连接");
      }
    }
  };

  // 处理弹窗关闭
  const handleCloseModal = () => {
    setShowAddNewTask(false);
  };

  // 处理弹窗背景点击
  const handleOverlayClick = () => {
    setShowAddNewTask(false);
  };

  // 处理弹窗内容点击（阻止事件冒泡）
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // ESC键关闭弹窗
  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showAddNewTask) {
        setShowAddNewTask(false);
      }
    };

    if (showAddNewTask) {
      document.addEventListener("keydown", handleEsc);
      // 防止页面滚动
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [showAddNewTask]);
  // 状态渲染函数
  const renderStatus = (status: string) => {
    const statusConfig = {
      成功: { color: "green", text: "成功" },
      失败: { color: "red", text: "失败" },
      等待: { color: "orange", text: "等待" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: "default",
      text: status,
    };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 操作处理函数
  const handleView = (record: any) => {
    console.log("查看记录:", record);
    // 这里可以添加查看详情的逻辑
  };

  const handleEdit = (record: any) => {
    console.log("编辑记录:", record);
    // 这里可以添加编辑的逻辑
  };

  const handleDelete = (record: any) => {
    console.log("删除记录:", record);
    // 这里可以添加删除确认的逻辑
  };

  // 格式化数字显示
  const formatNumber = (num: number) => {
    if (num === 0) return "-";
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toLocaleString();
  };

  const columns = [
    {
      title: "笔记标题",
      dataIndex: "noteTitle",
      key: "noteTitle",
      width: 120,
      ellipsis: true,
    },
    {
      title: "笔记链接",
      dataIndex: "noteLink",
      key: "noteLink",
      width: 120,
      ellipsis: true,
      render: (text: string) => (text === "/" ? "-" : text),
    },
    {
      title: "笔记内容",
      dataIndex: "noteContent",
      key: "noteContent",
      width: 120,
      ellipsis: true,
      render: (text: string) => (text === "/" ? "-" : text),
    },
    {
      title: "发布账号",
      dataIndex: "publishAccount",
      key: "publishAccount",
      width: 100,
      render: (text: string) => (text === "/" ? "-" : text),
    },
    {
      title: "发布主机",
      dataIndex: "publishHost",
      key: "publishHost",
      width: 100,
      render: (text: string) => (text === "/" ? "-" : text),
    },
    {
      title: "阅读量",
      dataIndex: "readCount",
      key: "readCount",
      width: 80,
      align: "right" as const,
      render: (count: number) => formatNumber(count),
    },
    {
      title: "互动量",
      dataIndex: "interactionCount",
      key: "interactionCount",
      width: 80,
      align: "right" as const,
      render: (count: number) => formatNumber(count),
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
      width: 140,
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      align: "center" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            title="查看"
            onClick={() => handleView(record)}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            title="编辑"
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            danger
            title="删除"
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];
  // 检测屏幕宽度（简单的响应式逻辑）
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1200);
  //勾选
  const statusOptions = [
    { value: 1, label: "全部" },
    { value: 2, label: "已发布" },
    { value: 3, label: "待发布" },
  ];
  const statusChange = (value: number) => {
    console.log("statusChange", value);
    setStatusValue(value);
  };
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1200);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
            <SquareRadioGroup options={statusOptions} value={statusValue} onChange={statusChange} />
            <Button>草稿箱</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
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
            dataSource={mockTableData.map((item, index) => ({ ...item, key: index }))}
            columns={columns}
            loading={tableLoading}
            scroll={{ x: 1000 }}
            pagination={{
              total: mockTableData.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            }}
            locale={{
              emptyText: "暂无数据",
            }}
          />
        </div>
      </div>

      {/* 自定义弹窗 */}
      {showAddNewTask && (
        <div
          style={styles.modalOverlay}
          className="modal-overlay-enter"
          onClick={handleOverlayClick}
        >
          <div
            style={styles.modalContainer}
            className="modal-container-enter"
            onClick={handleContentClick}
          >
            {/* 弹窗头部 */}
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>创建内容任务</h3>
              <button
                style={styles.modalCloseButton}
                onClick={handleCloseModal}
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
      )}
    </div>
  );
};

export default ContentCreationManagement;
