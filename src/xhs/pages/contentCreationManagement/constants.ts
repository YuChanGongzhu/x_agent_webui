// 常量定义
export const CONSTANTS = {
  MAX_FILE_SIZE: 5, // MB
  MAX_IMAGE_COUNT: 9,
  MAX_TITLE_LENGTH: 20,
  MAX_CONTENT_LENGTH: 1000,
  SUPPORTED_IMAGE_TYPES: ["image/jpg", "image/png"],
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
