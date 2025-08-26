import React, { useEffect, useRef, useState } from "react";
import { Button, Input, Tag } from "antd";
import { xhsAIChatApi } from "../../../api/mysql";
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
    {
      id: "2",
      content:
        "好的姐妹！想要爆款视频脚本，必须得内容新颖、结构紧凑、带点小红书标志性的“种草力”哦～下面我给你举三个不同行业/主题的可直接用在小红书的视频脚本模板，供你参考呀😊👇 --- ## 1️⃣ 生活类（整理收纳） **主题：三分钟告别凌乱！我的桌面收纳秘籍大公开🧸✨** **脚本结构：** 1. 【开场3秒】 画面：镜头扫桌面全貌，乱糟糟的桌面 文案：【旁白】姐妹们快看！我的桌面已经乱成灾难现场了！！👇 2. 【方法展示】 - 分镜1：清空桌面（配BGM，快剪辑） 文案：【弹幕】第一步！清空才有动力～ - 分镜2：展示三个好用的收纳神器（抽屉收纳盒、分区笔筒、小推车） 文案：【旁白】神器NO.1: 分区收纳盒！强迫症必备！ - 分镜3：实操摆放，前后对比 文案：【弹幕】变化超大！太治愈啦～ 3. 【结尾Call to Action】 文案：【旁白】姐妹们还想看哪类收纳分享？评论敲一下哦！#收纳党必收 #生活仪式感 --- ## 2️⃣ 美妆类（新品测评） **主题：巨实用！平价粉底液大测评，油皮干皮都能用？👀💄** **脚本结构：** 1. 【开场亮点】 文案：【旁白】姐妹们，最近新出的这瓶才几十块的粉底液，我给大家真人实测！ 2. 【上妆测试】 - 分镜1：手背试色 文案：【弹幕】色号分享，超自然！ - 分镜2：半边脸上妆前后对比 文案：【旁白】看得见的服帖和遮瑕力！ - 分镜3：带妆5小时后展示（油皮/干皮两种肤质） 文案：【弹幕】OMG，脱妆情况也太明显了吧！ 3. 【点评总结】 文案：【旁白】这款粉底液我觉得X肌肤更适合，性价比真香！姐妹们会pick吗？～#平价美妆 #油皮救星 --- ## 3️⃣ 自律成长类（学习打卡） **主题：自律逆袭的一天！如何保持效率？高分学霸在线教学📚✨** **脚本结构：** 1. 【暖场开头】 文案：【旁白】想变自律星人？直接跟我一天行程学起来！ 2. 【时间流程展示】 - 分镜1：早晨7:00起床——喝水、整理、写晨间计划 文案：【弹幕】自律不是一蹴而就，坚持下来最重要！ - 分镜2：上午高效学习2小时（快剪辑带BGM） 文案：【旁白】专注就用“番茄钟+自习室白噪音”法！ - 分镜3：小休闲插入——运动/做饭 文案：【弹幕】中场休息一下，别太逼自己哦！ 3. 【高能总结】 文案：【旁白】姐妹们也在努力吗？想加入我的自律打卡群吗？评论“打卡”咱们一起进步！#自律星人 #学习好习惯 --- 姐妹你要是有具体行业、产品或者想聚焦的内容方向，和我说一声，我还能帮你定制专属脚本！想红就别客气，疯狂利用我就对啦～💕",
      role: "user",
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
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          <Input
            placeholder={
              ui_input_prompt_type === "default"
                ? "说点什么吧…"
                : ui_input_prompt_type === "script"
                ? "请输入脚本内容"
                : "请输入内容"
            }
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
