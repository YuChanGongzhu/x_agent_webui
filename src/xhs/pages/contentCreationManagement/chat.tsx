import React, { useEffect, useRef, useState } from "react";
import { Button, Input, Tag } from "antd";
import { xhsAIChatApi } from "../../../api/mysql";
const { TextArea } = Input;
const panelStyles = {
  container: {
    width: "100%",
    height: "100%",
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
    maxHeight: "91vh",
  },
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid #f0f0f0",
    color: "#333",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  body: {
    flex: "1 1 auto",
    padding: "12px 12px 0 12px",
    overflow: "auto" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    overflowY: "auto" as const,
  },
  bubbleRow: {
    display: "flex",
    gap: "8px",
  },
  bubbleLeft: {
    justifyContent: "flex-start",
  },
  bubbleRight: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "78%",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "#fff",
    border: "1px solid #f0f0f0",
    lineHeight: 1.5,
    color: "#444",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  bubblePrimary: {
    background: "#EDF5FF",
    borderColor: "#D6E4FF",
  },
  quickActions: {
    display: "flex",
    gap: "8px",
    padding: "8px 12px",
    flexWrap: "wrap" as const,
  },
  footer: {
    padding: "10px 12px",
    borderTop: "1px solid #f0f0f0",
    display: "flex",
    gap: "8px",
    flexDirection: "column" as const,
  },
  footer_input: {
    display: "flex",
    gap: "8px",
  },
} as const;
type ScriptShot = {
  sequence: number;
  shot_description: string;
  shot_type: string;
  audio_dialogue: string;
  caption: string;
  bgm: string;
  sfx: string;
};

type ScriptResponse = {
  video_title: string;
  video_description: string;
  script: ScriptShot[];
  total_duration?: string;
};

interface Message {
  id: string;
  content: string | ScriptResponse;
  role: "user" | "ai";
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "您好请问需要什么帮助？",
      role: "ai",
    },
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const ui_input_prompt: { text: string; type: string }[] = [
    { text: "默认", type: "default" },
    { text: "短视频脚本", type: "script" },
    { text: "违禁词检测", type: "risk" },
  ];
  const script_type: { text: string; type: string }[] = [
    { text: "默认", type: "默认" },
    { text: "广告", type: "广告" },
    { text: "教育", type: "教育" },
    { text: "新闻", type: "新闻" },
    { text: "剧本", type: "剧本" },
  ];
  const [inputValue, setInputValue] = useState("");
  const [ui_input_prompt_type, setUiInputPromptType] = useState("default");
  const [script_type_type, setScriptTypeType] = useState("默认");
  //按发送
  const handleSend = async () => {
    if (!inputValue.trim()) return;
    if (isAiTyping) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: "user",
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    console.log("AI发送消息前", messages);
    // 添加占位的“正在回复”气泡
    const typingMessage: Message = {
      id: "typing",
      content: "AI 正在回复，请稍候…",
      role: "ai",
    };
    setMessages((prev) => [...prev, typingMessage]);
    setIsAiTyping(true);
    AIReceiveMessage({ text: inputValue, ui_input_prompt: ui_input_prompt_type });
  };
  //ai接收并回复消息
  const AIReceiveMessage = async ({
    text,
    ui_input_prompt,
  }: {
    text: string;
    ui_input_prompt: string;
  }) => {
    const res = await xhsAIChatApi({
      text: text,
      ui_input_prompt: ui_input_prompt,
    });
    if (res) {
      console.log(res);
      let content: string | ScriptResponse = res.polished_text;
      if (ui_input_prompt === "script" && typeof res.polished_text === "string") {
        try {
          const maybeJson = JSON.parse(res.polished_text);
          if (
            maybeJson &&
            typeof maybeJson === "object" &&
            maybeJson.video_title &&
            Array.isArray(maybeJson.script)
          ) {
            content = maybeJson as ScriptResponse;
          }
        } catch (e) {
          // 解析失败则回退为纯文本
        }
      }
      const newMessage: Message = {
        id: new Date(res.timestamp).getTime().toString(),
        content,
        role: "ai",
      };
      setMessages((prev) => {
        const replaced = prev.map((m) => (m.id === "typing" ? newMessage : m));
        // 若未找到占位气泡，兜底追加
        const hasReplaced = replaced.some((m) => m.id === newMessage.id);
        return hasReplaced ? replaced : [...replaced, newMessage];
      });
      setIsAiTyping(false);
    } else {
      const newMessage: Message = {
        id: Date.now().toString(),
        content: "ai回复消息失败",
        role: "ai",
      };
      setMessages((prev) => {
        const replaced = prev.map((m) => (m.id === "typing" ? newMessage : m));
        return replaced;
      });
      setIsAiTyping(false);
    }
    console.log("ai发送消息后", messages);
  };
  //回车键发送
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (isAiTyping) return;
      console.log("按了回车键");
      handleSend();
    }
  };

  // 消息变化后自动滚动到底部
  useEffect(() => {
    const el = bodyRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);
  return (
    <div style={panelStyles.container}>
      <div style={panelStyles.header}>
        <div style={{ fontWeight: 600 }}>灵感聊天</div>
        {ui_input_prompt_type === "script" && (
          <div>
            {script_type.map((item) => {
              return (
                <Tag
                  key={item.type}
                  color={script_type_type === item.type ? "blue" : "default"}
                  onClick={() => setScriptTypeType(item.type)}
                >
                  {item.text}
                </Tag>
              );
            })}
          </div>
        )}
      </div>
      <div style={panelStyles.body} ref={bodyRef}>
        {messages.map((message) => {
          const isUser = message.role === "user";
          const isScript =
            typeof message.content === "object" &&
            message.content !== null &&
            (message.content as ScriptResponse).video_title !== undefined;
          return (
            <div
              key={message.id}
              style={{
                ...panelStyles.bubbleRow,
                ...(message.role === "ai" ? panelStyles.bubbleLeft : panelStyles.bubbleRight),
              }}
            >
              <div
                style={{
                  ...panelStyles.bubble,
                  ...(isUser ? panelStyles.bubblePrimary : {}),
                }}
              >
                {isScript ? (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {(message.content as ScriptResponse).video_title}
                    </div>
                    <div style={{ color: "#666", marginBottom: 8 }}>
                      {(message.content as ScriptResponse).video_description}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(message.content as ScriptResponse).script.map((shot) => (
                        <div
                          key={shot.sequence}
                          style={{ borderTop: "1px dashed #eee", paddingTop: 8 }}
                        >
                          <div style={{ fontWeight: 500 }}>
                            场景 {shot.sequence}（{shot.shot_type}）
                          </div>
                          <div style={{ marginTop: 4 }}>镜头：{shot.shot_description}</div>
                          <div style={{ marginTop: 4 }}>台词：{shot.audio_dialogue}</div>
                          {shot.caption && (
                            <div style={{ marginTop: 4, color: "#555" }}>字幕：{shot.caption}</div>
                          )}
                          <div style={{ marginTop: 4, color: "#888" }}>
                            BGM：{shot.bgm} {shot.sfx ? `｜ SFX：${shot.sfx}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                    {(message.content as ScriptResponse).total_duration && (
                      <div style={{ marginTop: 8, color: "#888" }}>
                        总时长：{(message.content as ScriptResponse).total_duration}
                      </div>
                    )}
                  </div>
                ) : (
                  <>{message.content as string}</>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={panelStyles.footer}>
        <div style={panelStyles.quickActions}>
          {ui_input_prompt.map((item) => {
            return (
              <Tag
                key={item.type}
                onClick={() => setUiInputPromptType(item.type)}
                color={ui_input_prompt_type === item.type ? "blue" : "default"}
              >
                {item.text}
              </Tag>
            );
          })}
        </div>
        <div style={panelStyles.footer_input}>
          <TextArea
            placeholder={
              ui_input_prompt_type === "default"
                ? "说点什么吧…"
                : ui_input_prompt_type === "script"
                ? "请输入脚本内容"
                : "请输入内容"
            }
            autoSize={{ minRows: 1, maxRows: 6 }}
            allowClear
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleKeyPress}
            disabled={isAiTyping}
          />
          <Button type="primary" onClick={handleSend} disabled={isAiTyping}>
            发送
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
