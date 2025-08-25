// 笔记数据接口定义
export interface NoteFormData {
  note_title: string;
  note_content: string;
  note_tags_list: string[]; // 话题数组：["美食", "bbw", "好吃的"]
  at_users: string; // @用户数组的JSON字符串格式：'["用户1", "用户2"]'
  images: string; // 图片路径字符串，格式：email/123.jpg,email/789.png
  visibility: string;
  account: string;
  device_id: string;
  note_type: string; // 笔记类型：视频或者图片
  note_user_type?: string; // 可选项：小红书用户类型：xiaohongshu 或 marketing
  // 可选：行业笔记联动选择结果
  industry_primary?: string;
  industry_secondary?: string;
  // 可选：小红书笔记（博主类型）联动选择结果
  blogger_primary?: string;
  blogger_secondary?: string;
}
