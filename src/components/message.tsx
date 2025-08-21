import { App } from "antd";

// 自定义 hook 来使用 Ant Design 的 message API
export const useMessage = () => {
  const { message } = App.useApp();

  return {
    success: (
      content: string | { content: string; key?: string; duration?: number },
      duration?: number
    ) => {
      if (typeof content === "string") {
        return message.success(content, duration);
      }
      return message.success(content);
    },
    error: (
      content: string | { content: string; key?: string; duration?: number },
      duration?: number
    ) => {
      if (typeof content === "string") {
        return message.error(content, duration);
      }
      return message.error(content);
    },
    warning: (content: string, duration?: number) => message.warning(content, duration),
    info: (content: string, duration?: number) => message.info(content, duration),
    loading: (
      content: string | { content: string; key?: string; duration?: number },
      duration?: number
    ) => {
      if (typeof content === "string") {
        return message.loading(content, duration);
      }
      return message.loading(content);
    },
  };
};
