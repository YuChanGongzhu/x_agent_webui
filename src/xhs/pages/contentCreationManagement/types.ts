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
}
