import React, { useState, useEffect } from "react";
import { getDagRuns, triggerDagRun, pauseDag, setNote, getDagRunDetail } from "../../api/airflow";
import {
  getKeywordsApi,
  getXhsNotesByKeywordApi,
  getXhsCommentsByKeywordApi,
} from "../../api/mysql";
import { useUser } from "../../context/UserContext";
import { useKeyword } from "../../context/KeywordContext";
import { UserProfileService } from "../../management/userManagement/userProfileService";
import SortUpOrDownButton from "../../components/BaseComponents/SortUpOrDownButton";
import Tooltipwrap from "../../components/BaseComponents/Tooltipwrap";
import notifi from "../../utils/notification";
import BaseSelect from "../../components/BaseComponents/BaseSelect";
import BaseInput from "../../components/BaseComponents/BaseInput";
import TooltipIcon from "../../components/BaseComponents/TooltipIcon";
import { Tabs, Button, Input, Table, DatePicker } from "antd";
import type { ColumnsType } from "antd/es/table";

const { TabPane } = Tabs;

interface Note {
  id: number;
  title: string;
  content: string;
  author: string;
  likes: number;
  comments: number;
  keyword: string;
  note_url: string;
  collected_at: string;
  last_comments_collected_at: string | null;
  userInfo: string;
  note_location?: string;
  note_time?: string;
  collect_time?: string;
  collects?: number;
  note_type?: string;
}

interface Comment {
  id: string;
  note_id: string;
  note_url: string;
  content: string;
  author: string; // 从nickname改为author
  likes: number; // 从like_count改为likes
  created_time?: string;
  keyword: string;
  collect_time?: string; // 添加collect_time字段
  created_at?: string; // 添加created_at字段
  updated_at?: string; // 添加updated_at字段
  userInfo: string; // 添加userInfo字段
  location?: string; // 添加location字段
  comment_time: string; // 添加comment_time字段
}

// Tab types
type TabType = "tasks" | "notes" | "comments";
interface Task {
  dag_run_id: string;
  state: string;
  start_date: string;
  end_date: string;
  note: string;
  conf: string;
}

const DataCollect: React.FC = () => {
  // State for refreshing
  const [refreshingKeywords, setRefreshingKeywords] = useState(false);
  const [refreshingNotes, setRefreshingNotes] = useState(false);
  const [refreshingTasks, setRefreshingTasks] = useState(false);
  const [refreshingComments, setRefreshingComments] = useState(false);
  // State for tab navigation
  const [activeTab, setActiveTab] = useState<TabType>("tasks"); // Get shared keyword context
  // State for form inputs
  const [keyword, setKeyword] = useState("");
  const [maxNotes, setMaxNotes] = useState(10);
  const [noteType, setNoteType] = useState("图文");
  const [sortBy, setSortBy] = useState("最新");
  const [timeRange, setTimeRange] = useState("一天内");
  const [maxComments, setMaxComments] = useState(10);
  const [browseKeyword, setBrowseKeyword] = useState("");
  const [originalNotesLength, setOriginalNotesLength] = useState(0); //原始笔记数
  const [originalCommentLength, setOriginalCommentLength] = useState(0); //原始评论数
  // 使用localStorage存储目标邮箱，确保页面刷新后仍然保持选择
  const [targetEmail, setTargetEmail] = useState(() => {
    const savedEmail = localStorage.getItem("xhs_target_email");
    return savedEmail || "";
  });

  // 当目标邮箱变化时，更新localStorage
  useEffect(() => {
    if (targetEmail) {
      localStorage.setItem("xhs_target_email", targetEmail);
    }
  }, [targetEmail]);
  const [availableEmails, setAvailableEmails] = useState<string[]>([]);

  // State for data
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [sortNotes, setSortNotes] = useState<Note[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [sortComments, setSortComments] = useState<Comment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(10);
  const [currentNotesPage, setCurrentNotesPage] = useState(1);
  const [notesPerPage] = useState(10);
  const [currentCommentsPage, setCurrentCommentsPage] = useState(1);
  const [commentsPerPage] = useState(10);
  const [jumpToPage, setJumpToPage] = useState<string>("");
  const [totalNotesPages, setTotalNotesPages] = useState(0);
  const [jumpToCommentsPage, setJumpToCommentsPage] = useState<string>("");
  const [totalCommentsPages, setTotalCommentsPages] = useState(0);
  const [keywordList, setKeywordList] = useState<string[] | null>([]);
  // State for loading and errors
  const [loading, setLoading] = useState(false);

  // 添加暂停状态管理
  const [pausingTasks, setPausingTasks] = useState<Set<string>>(new Set());

  // 获取用户上下文
  const { isAdmin, email } = useUser();
  // 获取共享的关键词上下文
  const { latestKeyword, setLatestKeyword } = useKeyword();
  //时间筛选
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  // 获取可用的邮箱列表
  useEffect(() => {
    const fetchAvailableEmails = async () => {
      if (isAdmin) {
        // 管理员可以看到所有用户的邮箱
        try {
          const response = await UserProfileService.getAllUserProfiles();
          if (response && Array.isArray(response)) {
            const emails = response
              .filter((user: { email?: string }) => user.email) // 过滤掉没有邮箱的用户
              .map((user: { email?: string }) => user.email as string);
            setAvailableEmails(emails);

            // 如果localStorage中有存储的邮箱且在可用列表中，则使用它
            const savedEmail = localStorage.getItem("xhs_target_email");
            if (savedEmail && emails.includes(savedEmail)) {
              setTargetEmail(savedEmail);
            }
            // 否则，如果当前没有选择的邮箱但有可用邮箱，则选择第一个
            else if (!targetEmail && emails.length > 0) {
              setTargetEmail(emails[0]);
            }
          } else {
            console.error("获取用户列表失败");
            // 如果获取失败，至少添加当前用户的邮箱
            if (email) {
              setAvailableEmails([email]);
              // 只有在没有已选择邮箱的情况下才设置
              if (!targetEmail) {
                setTargetEmail(email);
              }
            }
          }
        } catch (err) {
          console.error("获取用户列表出错:", err);
          if (email) {
            setAvailableEmails([email]);
            // 只有在没有已选择邮箱的情况下才设置
            if (!targetEmail) {
              setTargetEmail(email);
            }
          }
        }
      } else {
        // 非管理员只能看到自己的邮箱
        if (email) {
          setAvailableEmails([email]);
          // 只有在没有已选择邮箱的情况下才设置
          if (!targetEmail) {
            setTargetEmail(email);
          }
        }
      }
    };

    fetchAvailableEmails();
  }, [isAdmin, email]);

  // Fetch keywords on component mount
  useEffect(() => {
    if (email || isAdmin) {
      fetchKeywords();
      fetchRecentTasks();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const keyword = urlParams.get("keyword");
    const tab = urlParams.get("tab");
    if (keyword) {
      setSelectedKeyword(keyword);
    }
    if (tab) {
      setActiveTab(tab as TabType);
      window.history.replaceState({}, "", "/xhs/collect");
    }
  }, [isAdmin, email]);

  const fetchKeywords = async () => {
    try {
      setLoading(true);
      setRefreshingKeywords(true);

      const response = await getKeywordsApi(!isAdmin && email ? email : undefined);
      if (response && response.data) {
        const extractedKeywords = response.data;

        if (extractedKeywords.length > 0) {
          const extractedKeywordsReverse = extractedKeywords.reverse();
          setKeywords(extractedKeywordsReverse);

          // 使用共享的最新关键词或默认选择第一个
          const keywordToSelect =
            latestKeyword && extractedKeywordsReverse.includes(latestKeyword)
              ? latestKeyword
              : extractedKeywordsReverse[0];

          setSelectedKeyword(keywordToSelect);
          // 更新共享的最新关键词
          setLatestKeyword(keywordToSelect);
        } else {
          setKeywords([]);
          notifi("未找到关键词", "error");
        }
      } else {
        setKeywords([]);
        notifi("未找到关键词数据", "error");
      }
      setLoading(false);
      setRefreshingKeywords(false);
    } catch (err) {
      console.error("Error fetching keywords:", err);
      notifi("获取关键词失败", "error");
      setKeywords([]);
      setLoading(false);
      setRefreshingKeywords(false);
    }
  };

  const handleCreateNotesTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      notifi("请输入关键字", "error");
      return;
    }

    try {
      setLoading(true);
      const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
      const dag_run_id = `xhs_notes_${timestamp}`;
      const conf = {
        ...(keywordList?.length === 1
          ? { keyword: String(keywordList[0]) }
          : { keywords: keywordList }),
        max_notes: maxNotes,
        email: targetEmail,
        note_type: noteType,
        time_range: timeRange,
        sort_by: sortBy,
      };

      const response = await triggerDagRun("notes_collector", dag_run_id, conf);

      const newTask = {
        dag_run_id: response.dag_run_id,
        state: response.state,
        start_date: response.start_date || new Date().toISOString(),
        end_date: response.end_date || "",
        note: response.note || "",
        conf: JSON.stringify(conf),
      };

      setTasks([newTask, ...tasks]);
      notifi(`成功创建笔记采集任务，任务ID: ${newTask.dag_run_id}`, "success");
      setLoading(false);
      setKeyword("");

      fetchRecentTasks();
    } catch (err) {
      console.error("Error creating notes task:", err);
      notifi("创建笔记采集任务失败", "error");
      setLoading(false);
    }
  };

  // Create comment collection task
  const handleCreateCommentsTask = async () => {
    if (!selectedKeyword) {
      notifi("请选择关键字", "error");
      return;
    }

    try {
      setLoading(true);
      const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
      const dag_run_id = `xhs_comments_${timestamp}`;

      const conf: any = {
        keyword: selectedKeyword,
        max_comments: maxComments,
        email: targetEmail,
        note_type: noteType,
      };

      if (selectedNotes.length > 0) {
        conf.note_urls = selectedNotes;
      }

      const response = await triggerDagRun("comments_collector", dag_run_id, conf);

      const newTask = {
        dag_run_id: response.dag_run_id,
        state: response.state,
        start_date: response.start_date || new Date().toISOString(),
        end_date: response.end_date || "",
        note: response.note || "",
        conf: JSON.stringify(conf),
      };

      setTasks([newTask, ...tasks]);
      notifi(`成功创建笔记评论收集任务，任务ID: ${newTask.dag_run_id}`, "success");
      setLoading(false);

      fetchRecentTasks();
    } catch (err) {
      console.error("Error creating comments task:", err);
      notifi("创建笔记评论收集任务失败", "error");
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentNotesPage(1);
  }, [notes]);
  useEffect(() => {
    setCurrentCommentsPage(1);
  }, [comments]);

  useEffect(() => {
    if (selectedKeyword) {
      fetchNotes(selectedKeyword);
      fetchComments(selectedKeyword);
    }
  }, [selectedKeyword]);

  const fetchRecentTasks = async () => {
    try {
      setLoading(true);
      setRefreshingTasks(true);

      let allTasks: Task[] = [];

      const notesResponse = await getDagRuns("notes_collector", 200, "-start_date");
      const commentsResponse = await getDagRuns("comments_collector", 200, "-start_date");

      console.log("前200条airflow 笔记任务", notesResponse);
      console.log("前200条airflow 评论任务", commentsResponse);

      if (notesResponse && notesResponse.dag_runs) {
        const notesTasks = notesResponse.dag_runs.map((run: any) => ({
          dag_run_id: run.dag_run_id,
          state: run.state,
          start_date: run.start_date,
          end_date: run.end_date || "",
          note: run.note || "",
          conf: JSON.stringify(run.conf),
        }));
        allTasks = [...allTasks, ...notesTasks];
      }

      if (commentsResponse && commentsResponse.dag_runs) {
        const commentsTasks = commentsResponse.dag_runs.map((run: any) => ({
          dag_run_id: run.dag_run_id,
          state: run.state,
          start_date: run.start_date,
          end_date: run.end_date || "",
          note: run.note || "",
          conf: JSON.stringify(run.conf),
        }));
        allTasks = [...allTasks, ...commentsTasks];
      }

      allTasks.sort((a, b) => {
        const dateA = new Date(a.start_date).getTime();
        const dateB = new Date(b.start_date).getTime();
        return dateB - dateA; // Newest first
      });

      if (!isAdmin && email) {
        const filteredTasks = allTasks.filter((task) => {
          try {
            const conf = JSON.parse(task.conf);
            return conf.email === email;
          } catch (error) {
            console.error("Error parsing task conf:", error);
            return false;
          }
        });

        console.log(`隔离任务邮箱 ${email}:`, filteredTasks.length, filteredTasks);
        setTasks(filteredTasks);
      } else {
        // Admin can see all tasks
        console.log("Admin user or no email, showing all tasks");
        setTasks(allTasks);
      }

      setLoading(false);
      setRefreshingTasks(false);
    } catch (err) {
      console.error("Error fetching recent tasks:", err);
      notifi("获取任务列表失败", "error");
      setLoading(false);
      setRefreshingTasks(false);
    }
  };

  // Fetch notes for selected keyword
  useEffect(() => {
    if (selectedKeyword) {
      fetchNotes(selectedKeyword);
      fetchComments(selectedKeyword);
    }
  }, [selectedKeyword]);

  const fetchNotes = async (keyword: string, startTime?: string, endTime?: string) => {
    try {
      setLoading(true);

      const response = await getXhsNotesByKeywordApi(
        keyword,
        !isAdmin && email ? email : undefined,
        undefined,
        undefined,
        startTime,
        endTime
      );

      if (response && response.code === 0 && response.data && response.data.records) {
        const transformedNotes: Note[] = response.data.records.map((item: any) => ({
          id: item.id || 0,
          title: item.title || "",
          content: item.content || "",
          author: item.author || "Unknown",
          likes: item.likes || 0,
          comments: item.comments || 0,
          keyword: item.keyword || keyword,
          note_url: item.note_url || "",
          collected_at: item.create_time || new Date().toISOString(),
          last_comments_collected_at: item.last_comments_collected_at || null,
          userInfo: item.userInfo || email || "", // Add userInfo field with global email as default
          note_location: item.note_location || "无地区",
          note_time: item.note_time || "",
          note_type: item.note_type || "",
          collect_time: item.collect_time || "",
          collects: item.collects || item.collect_count || 0,
        }));

        setNotes(transformedNotes);
        setSortNotes(transformedNotes);
        setOriginalNotesLength(response.data.total);
        // Set total pages from API response
        if (response.data.total_pages) {
          setTotalNotesPages(response.data.total_pages);
        } else {
          // Fallback calculation if total_pages is not provided
          setTotalNotesPages(Math.ceil(response.data.total / 1000));
        }
      } else {
        setNotes([]);
        setSortNotes([]);
        setTotalNotesPages(0);
        console.warn("Notes API returned invalid data format:", response);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching notes data:", err);
      notifi("获取笔记数据失败", "error");
      setNotes([]);
      setSortNotes([]);
      setTotalNotesPages(0);
      setLoading(false);
    }
  };

  const fetchComments = async (keyword: string) => {
    try {
      setLoading(true);
      setRefreshingComments(true);

      const response = await getXhsCommentsByKeywordApi(
        keyword,
        !isAdmin && email ? email : undefined
      );
      console.log(
        `Comments for ${!isAdmin && email ? `email: ${email}` : "admin"} and keyword: ${keyword}`
      );
      if (response && response.code === 0 && response.data && response.data.records) {
        const mappedComments: Comment[] = response.data.records.map((record: any) => ({
          id: record.id?.toString() || "",
          note_id: record.note_id?.toString() || "",
          note_url: record.note_url || "",
          content: record.content || "",
          author: record.author || "",
          likes: record.likes || 0,
          keyword: record.keyword || "",
          collect_time: record.collect_time,
          created_at: record.created_at,
          updated_at: record.updated_at,
          userInfo: record.userInfo || "",
          location: record.location || "",
          comment_time: record.comment_time || "",
        }));
        setComments(mappedComments);
        setSortComments(mappedComments);
        setOriginalCommentLength(response.data.total);
        // Set total pages from API response
        if (response.data.total_pages) {
          setTotalCommentsPages(response.data.total_pages);
        } else {
          // Fallback calculation if total_pages is not provided
          setTotalCommentsPages(Math.ceil(response.data.total / 1000));
        }
      } else {
        setComments([]);
        setSortComments([]);
        setTotalCommentsPages(0);
        console.warn("Comments API returned invalid data format:", response);
      }
      setLoading(false);
      setRefreshingComments(false);
    } catch (err) {
      console.error("Error fetching comments data:", err);
      notifi("获取评论数据失败", "error");
      setComments([]);
      setSortComments([]);
      setTotalCommentsPages(0);
      setLoading(false);
      setRefreshingComments(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN");
  };

  // antd Table columns for comments
  const commentColumns: ColumnsType<Comment> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
      fixed: "left",
    },
    {
      title: "笔记链接",
      dataIndex: "note_url",
      key: "note_url",
      render: (_: any, record) => (
        <Tooltipwrap title={record.note_url}>
          <a
            href={record.note_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[rgba(248,213,126,1)] hover:underline break-all"
          >
            {record.note_url}
          </a>
        </Tooltipwrap>
      ),
    },
    {
      title: "关键词",
      dataIndex: "keyword",
      key: "keyword",
      width: 120,
    },
    {
      title: "内容",
      dataIndex: "content",
      key: "content",
      render: (text: string) => <Tooltipwrap title={text}>{text || "无内容"}</Tooltipwrap>,
      ellipsis: true,
    },
    {
      title: "作者",
      dataIndex: "author",
      key: "author",
      width: 120,
    },
    {
      title: "点赞数",
      dataIndex: "likes",
      key: "likes",
      sorter: (a, b) => (a.likes || 0) - (b.likes || 0),
      width: 100,
    },
    {
      title: "采集时间",
      dataIndex: "collect_time",
      key: "collect_time",
      sorter: (a, b) =>
        new Date(a.collect_time || 0).getTime() - new Date(b.collect_time || 0).getTime(),
      render: (value: string | undefined) => (value ? formatDate(value) : "未采集"),
      width: 180,
    },
    {
      title: "评论时间",
      dataIndex: "comment_time",
      key: "comment_time",
      sorter: (a, b) =>
        new Date(a.comment_time || 0).getTime() - new Date(b.comment_time || 0).getTime(),
      render: (value: string | undefined) => formatDate(value || ""),
      width: 180,
    },
  ];

  // derive task rows with parsed conf
  const taskRows = tasks.map((task) => {
    let keyword = "";
    let collectionQuantity = 0;
    let isCommentTask = false;
    let noteType = "";
    try {
      const conf = JSON.parse(task.conf);
      keyword = conf.keyword || "";
      isCommentTask = task.dag_run_id.includes("xhs_comments");
      collectionQuantity = isCommentTask ? conf.max_comments || 0 : conf.max_notes || 0;
      noteType = conf.note_type || "";
    } catch (e) {
      // ignore
    }
    return {
      ...task,
      _keyword: keyword,
      _collectionQuantity: collectionQuantity,
      _isCommentTask: isCommentTask,
      _noteType: noteType,
    } as Task & {
      _keyword: string;
      _collectionQuantity: number;
      _isCommentTask: boolean;
      _noteType: string;
    };
  });

  // antd Table columns for tasks
  const taskColumns: ColumnsType<(typeof taskRows)[number]> = [
    {
      title: "关键词",
      dataIndex: "keyword",
      key: "keyword",
      width: 180,
      render: (value: string, record: any) => {
        // 如果 keyword 有值，直接显示
        if (value) {
          return value;
        }

        // 尝试从任务配置中解析关键词
        try {
          const conf = JSON.parse(record.conf || "{}");
          // keyword 和 keywords 不会同时出现，优先检查 keywords（数组）
          if (conf.keywords && Array.isArray(conf.keywords) && conf.keywords.length > 0) {
            return conf.keywords.join(", ");
          }
          // 如果没有 keywords，检查 keyword（字符串）
          if (conf.keyword) {
            return conf.keyword;
          }
        } catch (e) {
          console.error("解析任务配置失败:", e);
        }
      },
    },
    {
      title: "收集数量",
      dataIndex: "_collectionQuantity",
      key: "collectionQuantity",
      render: (value: number, record) => `${value} ${record._isCommentTask ? "评论" : "笔记"}`,
      width: 140,
    },
    {
      title: "采集类型",
      dataIndex: "_noteType",
      key: "noteType",
      render: (v?: string) => (v ? v : "图文"),
      width: 120,
    },
    {
      title: "任务ID",
      dataIndex: "dag_run_id",
      key: "dag_run_id",
      width: 260,
    },
    {
      title: "状态",
      dataIndex: "state",
      key: "state",
      render: (_: any, task) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            task.state === "success" && (task as any).note !== "paused"
              ? "bg-green-100 text-green-800"
              : task.state === "running"
              ? "bg-blue-100 text-blue-800"
              : task.state === "failed"
              ? "bg-red-100 text-red-800"
              : task.state === "success" && (task as any).note === "paused"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {task.state === "success" && (task as any).note !== "paused"
            ? "成功"
            : task.state === "running"
            ? "运行中"
            : task.state === "failed"
            ? "失败"
            : task.state === "success" && (task as any).note === "paused"
            ? "已结束"
            : task.state}
        </span>
      ),
      width: 120,
    },
    {
      title: "开始时间",
      dataIndex: "start_date",
      key: "start_date",
      render: (v: string) => formatDate(v),
      width: 180,
    },
    {
      title: "结束时间",
      dataIndex: "end_date",
      key: "end_date",
      render: (v: string) => formatDate(v),
      width: 180,
    },
    {
      title: "操作",
      key: "action",
      render: (_: any, record) => (
        <Button
          onClick={() => {
            pauseTask(
              record._isCommentTask ? "comments_collector" : "notes_collector",
              record.dag_run_id
            );
          }}
          disabled={record.state === "success" || record.state === "failed"}
          loading={pausingTasks.has(record.dag_run_id)}
        >
          暂停任务
        </Button>
      ),
      width: 140,
    },
  ];

  // antd Table columns for notes
  const noteColumns: ColumnsType<Note> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      fixed: "left",
    },
    {
      title: "采集类型",
      dataIndex: "note_type",
      key: "note_type",
      render: (v?: string) => (v ? v : "图文"),
      width: 120,
    },
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      render: (text: string) => <Tooltipwrap title={text}>{text}</Tooltipwrap>,
    },
    {
      title: "笔记链接",
      dataIndex: "note_url",
      key: "note_url",
      render: (_: any, record) => (
        <Tooltipwrap title={record.note_url}>
          <a
            href={record.note_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[rgba(248,213,126,1)] hover:underline break-all"
          >
            {record.note_url}
          </a>
        </Tooltipwrap>
      ),
    },
    {
      title: "作者",
      dataIndex: "author",
      key: "author",
      width: 120,
    },
    {
      title: "内容",
      dataIndex: "content",
      key: "content",
      render: (text: string) => <Tooltipwrap title={text}>{text || "无内容"}</Tooltipwrap>,
      ellipsis: true,
    },
    {
      title: "点赞数",
      dataIndex: "likes",
      key: "likes",
      sorter: (a, b) => (a.likes || 0) - (b.likes || 0),
      width: 100,
    },
    {
      title: "评论数",
      dataIndex: "comments",
      key: "comments",
      sorter: (a, b) => (a.comments || 0) - (b.comments || 0),
      width: 100,
    },
    {
      title: "采集时间",
      dataIndex: "collect_time",
      key: "collect_time",
      sorter: (a, b) =>
        new Date(a.collect_time || 0).getTime() - new Date(b.collect_time || 0).getTime(),
      render: (value: string | undefined) => formatDate(value || ""),
      width: 180,
    },
    {
      title: "评论采集时间",
      dataIndex: "last_comments_collected_at",
      key: "last_comments_collected_at",
      sorter: (a, b) =>
        new Date(a.last_comments_collected_at || 0).getTime() -
        new Date(b.last_comments_collected_at || 0).getTime(),
      render: (value: string | null | undefined) =>
        value ? formatDate(value as string) : "未采集",
      width: 200,
    },
  ];

  const noteRowSelection = {
    selectedRowKeys: selectedNotes,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedNotes(selectedKeys as string[]);
    },
  };

  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;

  const handleJumpToNotesPage = async () => {
    if (!jumpToPage || !selectedKeyword) return;

    try {
      const pageNumber = parseInt(jumpToPage);
      if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalNotesPages) {
        notifi("请输入有效的页码", "warning");
        return;
      }

      setLoading(true);
      // Call API with the specific page number
      const response = await getXhsNotesByKeywordApi(
        selectedKeyword,
        !isAdmin && email ? email : undefined,
        pageNumber
      );

      if (response && response.code === 0 && response.data && response.data.records) {
        const transformedNotes: Note[] = response.data.records.map((item: any) => ({
          id: item.id || 0,
          title: item.title || "",
          content: item.content || "",
          author: item.author || "Unknown",
          likes: item.likes || 0,
          comments: item.comments || 0,
          keyword: item.keyword || selectedKeyword,
          note_url: item.note_url || "",
          collected_at: item.create_time || new Date().toISOString(),
          last_comments_collected_at: item.last_comments_collected_at || null,
          userInfo: item.userInfo || email || "",
          note_location: item.note_location || "无地区",
          note_time: item.note_time || "",
          note_type: item.note_type || "",
          collect_time: item.collect_time || "",
          collects: item.collects || item.collect_count || 0,
        }));

        setNotes(transformedNotes);

        setSortNotes(transformedNotes);
        setCurrentNotesPage(pageNumber);

        // Update total pages if available
        if (response.data.total_pages) {
          setTotalNotesPages(response.data.total_pages);
        }
      } else {
        notifi("获取笔记数据失败", "error");
      }
      setLoading(false);
    } catch (err) {
      console.error("Error jumping to page:", err);
      notifi("跳转页面失败", "error");
      setLoading(false);
    }
  };

  const handleJumpToCommentsPage = async () => {
    if (!jumpToCommentsPage || !selectedKeyword) return;

    try {
      const pageNumber = parseInt(jumpToCommentsPage);
      if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalCommentsPages) {
        notifi("请输入有效的页码", "warning");
        return;
      }

      setLoading(true);
      setRefreshingComments(true);

      // Call API with the specific page number
      const response = await getXhsCommentsByKeywordApi(
        selectedKeyword,
        !isAdmin && email ? email : undefined,
        pageNumber
      );

      if (response && response.code === 0 && response.data && response.data.records) {
        const mappedComments: Comment[] = response.data.records.map((record: any) => ({
          id: record.id?.toString() || "",
          note_id: record.note_id?.toString() || "",
          note_url: record.note_url || "",
          content: record.content || "",
          author: record.author || "",
          likes: record.likes || 0,
          keyword: record.keyword || "",
          collect_time: record.collect_time,
          created_at: record.created_at,
          updated_at: record.updated_at,
          userInfo: record.userInfo || "",
          location: record.location || "",
          comment_time: record.comment_time || "",
        }));

        setComments(mappedComments);
        setSortComments(mappedComments);
        setCurrentCommentsPage(pageNumber);

        // Update total pages if available
        if (response.data.total_pages) {
          setTotalCommentsPages(response.data.total_pages);
        }
      } else {
        notifi("获取评论数据失败", "error");
      }
      setLoading(false);
      setRefreshingComments(false);
    } catch (err) {
      console.error("Error jumping to comments page:", err);
      notifi("跳转页面失败", "error");
      setLoading(false);
      setRefreshingComments(false);
    }
  };

  const pauseTask = async (dagId: string, dagRunId: string) => {
    // 防止重复点击
    if (pausingTasks.has(dagRunId)) {
      return;
    }

    try {
      // 设置加载状态
      setPausingTasks((prev) => new Set(prev).add(dagRunId));
      console.log("暂停任务前", dagId, dagRunId);

      // 并行执行操作
      await Promise.all([pauseDag(dagId, dagRunId), setNote(dagId, dagRunId, "paused")]);

      console.log("暂停任务成功");

      // 获取更新后的任务详情（可选，如果不需要立即验证可以移除）
      const res = await getDagRunDetail(dagId, dagRunId);
      console.log("暂停任务实例", res);

      // 刷新任务列表
      await fetchRecentTasks();

      notifi("任务已成功暂停", "success");
    } catch (err) {
      console.error("暂停任务失败", err);
      notifi("暂停任务失败，请重试", "error");
    } finally {
      // 清除加载状态
      setPausingTasks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(dagRunId);
        return newSet;
      });
    }
  };
  //处理创建笔记任务关键字
  const handleCreateNotesTaskKeyword = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(e.target.value);
    setKeywordList(value.replace(/\s+/g, "").match(/[^,]+/g));
  };

  return (
    <div>
      {/* 目标邮箱选择 - 全局可用 */}
      <div className="p-2">
        <div className="flex flex-row gap-2 items-center">
          <h2 className="text-lg font-semibold">目标邮箱</h2>
          <div className="flex-1">
            <BaseSelect
              size="large"
              value={targetEmail}
              showSearch
              options={availableEmails.map((email) => ({ label: email, value: email }))}
              onChange={(value) => setTargetEmail(value)}
            ></BaseSelect>
          </div>
          <h2 className="text-lg font-semibold">养号关键词</h2>
          <div className="flex-1">
            <Input
              size="large"
              value={browseKeyword}
              onChange={(e) => setBrowseKeyword(e.target.value)}
              placeholder="输入浏览关键词"
            ></Input>
          </div>
          <Button
            size="large"
            onClick={async () => {
              if (!browseKeyword.trim()) {
                notifi("请输入浏览关键词", "error");
                return;
              }

              try {
                setLoading(true);
                const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
                const dag_run_id = `notes_browser_${timestamp}`;

                const conf = {
                  keyword: browseKeyword,
                  email: targetEmail,
                };

                const response = await triggerDagRun("notes_browser", dag_run_id, conf);

                const newTask = {
                  dag_run_id: response.dag_run_id,
                  state: response.state,
                  start_date: response.start_date || new Date().toISOString(),
                  end_date: response.end_date || "",
                  note: response.note || "",
                  conf: JSON.stringify(conf),
                };

                setTasks([newTask, ...tasks]);
                notifi(`成功创建笔记浏览任务，任务ID: ${newTask.dag_run_id}`, "success");
                setLoading(false);

                fetchRecentTasks();
              } catch (err) {
                console.error("Error creating notes browser task:", err);
                notifi("创建笔记浏览任务失败", "error");
                setLoading(false);
              }
            }}
            loading={loading}
          >
            启动
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as TabType)}>
        <TabPane tab="任务" key="tasks">
          {/* Task Tab Content */}
          {/* Create Notes Collection Task */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-2">
            <h2 className="text-lg font-semibold mb-4">创建笔记采集任务</h2>
            <form onSubmit={handleCreateNotesTask} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <BaseInput
                  size="large"
                  className="w-full"
                  value={keyword}
                  onChange={handleCreateNotesTaskKeyword}
                  placeholder="输入关键字"
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    关键字
                    <TooltipIcon
                      tooltipProps={{
                        title:
                          "设置关键词后，AI将根据关键词采集笔记，可支持多个关键字，多个关键字之间用逗号隔开",
                      }}
                    />
                  </label>
                </BaseInput>
                <BaseInput
                  type="number"
                  size="large"
                  className="w-full"
                  value={maxNotes}
                  onChange={(e) => setMaxNotes(parseInt(e.target.value))}
                  min={1}
                  max={500}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    采集笔记数量{" "}
                    <TooltipIcon
                      tooltipProps={{ title: "设置采集笔记数量后，AI将根据数量采集笔记" }}
                    />
                  </label>
                </BaseInput>
                <BaseInput
                  type="hidden"
                  size="large"
                  className="w-full absolute"
                  value={targetEmail}
                >
                  {/* <label className="block text-sm font-medium text-gray-700 mb-1">目标邮箱</label> */}
                </BaseInput>
                <BaseSelect
                  size="large"
                  className="w-full"
                  value={noteType}
                  showSearch
                  options={["图文", "视频"].map((note_type) => ({
                    label: note_type,
                    value: note_type,
                  }))}
                  onChange={(value) => setNoteType(value)}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    笔记类型{" "}
                    <TooltipIcon tooltipProps={{ title: "设置笔记类型后，AI将根据类型采集笔记" }} />
                  </label>
                </BaseSelect>
                <BaseSelect
                  size="large"
                  className="w-full"
                  value={sortBy}
                  showSearch
                  options={["最新", "点赞最多", "最多评论", "最多收藏"].map((note_type) => ({
                    label: note_type,
                    value: note_type,
                  }))}
                  onChange={(value) => setSortBy(value)}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    排序依据{" "}
                    <TooltipIcon
                      tooltipProps={{ title: "设置排序依据后，AI将根据排序依据采集笔记" }}
                    />
                  </label>
                </BaseSelect>
                <BaseSelect
                  size="large"
                  className="w-full"
                  value={timeRange}
                  showSearch
                  options={["一天内", "一周内", "半年内"].map((note_type) => ({
                    label: note_type,
                    value: note_type,
                  }))}
                  onChange={(value) => setTimeRange(value)}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    发布时间{" "}
                    <TooltipIcon
                      tooltipProps={{ title: "设置发布时间后，AI将根据发布时间采集笔记" }}
                    />
                  </label>
                </BaseSelect>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-[rgba(248,213,126,1)] text-white rounded-md hover:bg-[rgba(248,213,126,0.8)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(248,213,126,1)] w-full"
                  >
                    {loading ? "处理中..." : "创建笔记采集任务"}
                  </button>
                </div>
              </div>
            </form>
          </div>
          {/* Recent Tasks */}
          <div className="bg-white rounded-lg shadow-md p-6 pb-0">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">最近的笔记采集任务</h2>
              <button
                onClick={async () => {
                  setRefreshingTasks(true);
                  try {
                    await fetchRecentTasks();
                  } finally {
                    setRefreshingTasks(false);
                  }
                }}
                className={`p-2 text-[rgba(248,213,126,1)] hover:text-[rgba(248,213,126,0.8)] focus:outline-none ${
                  refreshingTasks ? "opacity-70 cursor-not-allowed" : ""
                }`}
                title="刷新任务列表"
                disabled={refreshingTasks}
              >
                {refreshingTasks ? (
                  <svg
                    className="animate-spin h-5 w-5 text-[rgba(248,213,126,1)]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
              </button>
            </div>
            {tasks.length > 0 ? (
              <>
                <div className="w-full h-full">
                  <div className="overflow-x-auto w-full">
                    <Table
                      rowKey={(record) => record.dag_run_id}
                      columns={taskColumns}
                      dataSource={taskRows}
                      scroll={{ y: "35vh" }}
                      pagination={{
                        current: currentPage,
                        pageSize: tasksPerPage,
                        total: tasks.length,
                        showSizeChanger: false,
                      }}
                      onChange={(pagination) => {
                        setCurrentPage(pagination.current || 1);
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">没有找到笔记采集任务记录</p>
            )}
          </div>
        </TabPane>
        <TabPane tab="笔记" key="notes">
          {/* Notes Tab Content */}
          {/* Keyword Selection */}
          <div className="bg-white rounded-lg shadow-md p-6 pt-0 mb-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">选择关键字</h2>
              <button
                onClick={async () => {
                  setRefreshingKeywords(true);
                  try {
                    await fetchKeywords();
                  } finally {
                    setRefreshingKeywords(false);
                  }
                }}
                className={`flex items-center px-3 rounded text-[rgba(248,213,126,1)] border border-[rgba(248,213,126,1)] hover:bg-[rgba(248,213,126,1)] hover:text-white transition disabled:opacity-70 disabled:cursor-not-allowed ml-2`}
                disabled={refreshingKeywords}
                title="刷新关键词列表"
              >
                {refreshingKeywords ? (
                  <svg
                    className="animate-spin h-4 w-4 mr-1"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
                刷新关键词
              </button>
            </div>
            <div className="flex items-center gap-4">
              <BaseSelect
                size="large"
                className="w-full"
                selectClassName="w-1/2"
                value={selectedKeyword}
                showSearch
                options={keywords.map((kw) => ({ label: kw, value: kw }))}
                onChange={(value) => {
                  setSelectedKeyword(value);
                  setLatestKeyword(value);
                }}
              ></BaseSelect>
              <div className="w-1/2 flex items-center gap-4">
                <DatePicker.RangePicker
                  size="large"
                  className="w-full"
                  onChange={(datejs) => {
                    if (datejs && datejs[0] && datejs[1]) {
                      const startTime = datejs[0].startOf("day").format("YYYY-MM-DD HH:mm:ss");
                      const endTime = datejs[1].endOf("day").format("YYYY-MM-DD HH:mm:ss");
                      setStartTime(startTime);
                      setEndTime(endTime);
                    } else {
                      fetchNotes(selectedKeyword);
                      setStartTime("");
                      setEndTime("");
                    }
                  }}
                />
                <Button
                  size="large"
                  onClick={() => {
                    fetchNotes(selectedKeyword, startTime, endTime);
                  }}
                >
                  时间筛选
                </Button>
              </div>
            </div>
          </div>

          {/* Display Collected Notes */}
          <div className="bg-white rounded-lg shadow-md p-6 pb-0 mb-6">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">已采集的笔记</h2>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="select-all-notes"
                    checked={notes.length > 0 && selectedNotes.length === notes.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Select all notes
                        setSelectedNotes(notes.map((note) => note.note_url));
                      } else {
                        // Deselect all notes
                        setSelectedNotes([]);
                      }
                    }}
                    className="h-4 w-4 text-[rgba(248,213,126,1)] focus:ring-[rgba(248,213,126,0.5)] border-gray-300 rounded mr-2"
                  />
                  <label htmlFor="select-all-notes" className="text-sm text-gray-600">
                    全选
                  </label>
                </div>
              </div>
              <button
                onClick={async () => {
                  setRefreshingNotes(true);
                  try {
                    await fetchNotes(selectedKeyword);
                  } finally {
                    setRefreshingNotes(false);
                  }
                }}
                className={`p-2 text-[rgba(248,213,126,1)] hover:text-[rgba(248,213,126,0.8)] focus:outline-none ${
                  refreshingNotes ? "opacity-70 cursor-not-allowed" : ""
                }`}
                title="刷新笔记列表"
                disabled={refreshingNotes}
              >
                {refreshingNotes ? (
                  <svg
                    className="animate-spin h-5 w-5 text-[rgba(248,213,126,1)]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
              </button>
            </div>
            {notes.length > 0 ? (
              <>
                <div className="text-sm text-gray-500 mb-2">
                  原始笔记数量: {originalNotesLength}
                </div>
                <div className="w-full h-full">
                  <div className="overflow-x-auto w-full">
                    <Table
                      rowKey={(record) => record.note_url}
                      columns={noteColumns}
                      dataSource={notes}
                      rowSelection={noteRowSelection}
                      scroll={{ y: "35vh", x: "max-content" }}
                      pagination={{
                        current: currentNotesPage,
                        pageSize: notesPerPage,
                        total: notes.length,
                        showSizeChanger: false,
                      }}
                      onChange={(pagination) => {
                        setCurrentNotesPage(pagination.current || 1);
                      }}
                    />
                  </div>
                  {totalNotesPages > 1 && (
                    <div className="flex items-center mt-4">
                      <Tooltipwrap title="每个大页有1000条笔记，跳转到指定大页">
                        <input
                          type="number"
                          value={jumpToPage}
                          onChange={(e) => setJumpToPage(e.target.value)}
                          placeholder={`共${totalNotesPages}大页`}
                          min="1"
                          max={totalNotesPages.toString()}
                          className="w-24 px-2 py-1 border border-gray-300 rounded mr-2"
                        />
                        <button
                          onClick={handleJumpToNotesPage}
                          disabled={loading || !jumpToPage}
                          className="px-3 py-1 rounded bg-[rgba(248,213,126,1)] text-white hover:bg-[rgba(248,213,126,0.8)] disabled:opacity-50"
                        >
                          跳转
                        </button>
                      </Tooltipwrap>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-yellow-600">⚠️ 没有找到相关笔记数据</p>
            )}
          </div>
        </TabPane>
        <TabPane tab="评论" key="comments">
          {/* Comments Tab Content */}
          {/* Keyword Selection and Comment Collection */}
          <div className="bg-white rounded-lg shadow-md p-6 pt-0 mb-2">
            <h2 className="text-lg font-semibold mb-4">选择关键字</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BaseSelect
                size="large"
                className="w-full"
                value={selectedKeyword}
                showSearch
                options={keywords.map((kw) => ({ label: kw, value: kw }))}
                onChange={(value) => {
                  setSelectedKeyword(value);
                  setLatestKeyword(value);
                }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-1">选择关键字</label>
              </BaseSelect>
              <BaseInput
                size="large"
                type="number"
                className="w-full"
                value={maxComments}
                onChange={(e) => setMaxComments(parseInt(e.target.value))}
                min={1}
                max={1000}
              >
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  采集评论笔记篇数{" "}
                  <TooltipIcon
                    tooltipProps={{ title: "设置采集评论笔记篇数后，AI将根据篇数采集评论" }}
                  />
                </label>
              </BaseInput>
              <div className="flex items-end">
                <button
                  onClick={handleCreateCommentsTask}
                  disabled={loading || !selectedKeyword}
                  className="px-4 py-2 bg-[rgba(248,213,126,1)] text-white rounded-md hover:bg-[rgba(248,213,126,0.8)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(248,213,126,1)] w-full"
                >
                  {loading ? "处理中..." : "创建笔记评论收集任务"}
                </button>
              </div>
            </div>
          </div>
          {/* Display Collected Comments - Only shown in the Comments tab */}
          <div className="bg-white rounded-lg shadow-md p-6 pb-0">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">已采集的评论</h2>
              <button
                onClick={async () => {
                  setRefreshingComments(true);
                  try {
                    await fetchComments(selectedKeyword);
                  } finally {
                    setRefreshingComments(false);
                  }
                }}
                className={`p-2 text-[rgba(248,213,126,1)] hover:text-[rgba(248,213,126,0.8)] focus:outline-none ${
                  refreshingComments ? "opacity-70 cursor-not-allowed" : ""
                }`}
                title="刷新评论列表"
                disabled={refreshingComments}
              >
                {refreshingComments ? (
                  <svg
                    className="animate-spin h-5 w-5 text-[rgba(248,213,126,1)]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
              </button>
            </div>
            {comments.length > 0 ? (
              <>
                <div className="text-sm text-gray-500 mb-2">
                  原始评论数量: {originalCommentLength}
                </div>
                <div className="w-full h-full">
                  <div className="overflow-x-auto w-full">
                    <Table
                      rowKey={(record) => record.id}
                      columns={commentColumns}
                      dataSource={comments}
                      scroll={{ y: "35vh", x: "max-content" }}
                      pagination={{
                        current: currentCommentsPage,
                        pageSize: commentsPerPage,
                        total: comments.length,
                        showSizeChanger: false,
                      }}
                      onChange={(pagination) => {
                        setCurrentCommentsPage(pagination.current || 1);
                      }}
                    />
                  </div>
                  {totalCommentsPages > 1 && (
                    <div className="flex items-center mt-4">
                      <Tooltipwrap title="每个大页有1000条评论，跳转到指定大页">
                        <input
                          type="number"
                          value={jumpToCommentsPage}
                          onChange={(e) => setJumpToCommentsPage(e.target.value)}
                          placeholder={`共${totalCommentsPages}大页`}
                          min="1"
                          max={totalCommentsPages.toString()}
                          className="w-24 px-2 py-1 border border-gray-300 rounded mr-2"
                        />
                        <button
                          onClick={handleJumpToCommentsPage}
                          disabled={loading || !jumpToCommentsPage}
                          className="px-3 py-1 rounded bg-[rgba(248,213,126,1)] text-white hover:bg-[rgba(248,213,126,0.8)] disabled:opacity-50"
                        >
                          跳转
                        </button>
                      </Tooltipwrap>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-yellow-600">⚠️ 没有找到相关评论数据</p>
            )}
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default DataCollect;
