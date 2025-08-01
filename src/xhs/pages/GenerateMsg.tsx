import React, { useState, useEffect } from "react";
import { triggerDagRun, getDagRunDetail } from "../../api/airflow";

import notifi from "../../utils/notification";
import BaseCollapse from "../../components/BaseComponents/BaseCollapse";
import BaseList from "../../components/BaseComponents/BaseList";
import BaseListUserItem from "../../components/BaseComponents/BaseListUserItem";
import BasePopconfirm from "../../components/BaseComponents/BasePopconfirm";
import BaseInput from "../../components/BaseComponents/BaseInput";
import { Button, Space, message, Modal } from "antd";
import { getXhsDevicesMsgList } from "../../api/mysql";
import { useUser } from "../../context/UserContext";
import OneClickReplyTemplate from "../components/OneClickReplyTemplate";
const GenerateMsg: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [deviceMsgList, setDeviceMsgList] = useState<any[]>([]);
  const [formatDeviceMsgList, setFormatDeviceMsgList] = useState<Record<string, any[]>>({});
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const { isAdmin, email } = useUser();
  const [sendMsg, setSendMsg] = useState("");
  const [messageApi, contextHolder] = message.useMessage();
  //一键回复模板
  const [isOneClickReplyTemplateModalOpen, setIsOneClickReplyTemplateModalOpen] = useState(false);
  // 存储一键回复当前选中的模板ID
  const [currentSelectedTemplateIds, setCurrentSelectedTemplateIds] = useState<number[]>([]);
  //成功提示
  const success = (content: string) => {
    messageApi.open({
      type: "success",
      content: content,
    });
  };
  useEffect(() => {
    fetchDeviceMsgList();
  }, [email]);
  const refreshDeviceMsgList = async ({
    interval = 3 * 1000,
    maxAttempts = 10,
  }: {
    interval: number;
    maxAttempts: number;
  }) => {
    setLoading(true);
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
    const email_name = email?.match(/[^@\s]+(?=@)/g);
    const dag_run_id = `msg_check_${email_name}_${timestamp}`;
    const conf = {
      email: email,
    };
    let attempts = 0;
    // 步骤：
    //1.先创建dag任务
    //2.轮训函数，查询dag任务状态是否成功，如果成功就可以获取数据了
    //注意:dag_run_id 只能保存下划线、字母和数字
    const poll = async () => {
      try {
        const response = await getDagRunDetail("msg_check", dag_run_id);
        if (response.state === "success") {
          await fetchDeviceMsgList();
          return; //成功之后，直接退出
        }
      } catch (error) {
        setLoading(false);
        console.log("poll attempt failed", error);
      }
      attempts++;
      if (attempts >= maxAttempts) {
        console.log(`到达最大次数，停止查询`);
        setLoading(false);
        return;
      }
      setTimeout(poll, interval);
    };
    //创建dag任务
    const promise = triggerDagRun("msg_check", dag_run_id, conf);
    promise
      .then(() => {
        //成功就轮训
        poll();
      })
      .catch((err) => {
        setLoading(false);
        console.log("创建dag任务失败", err);
      });
  };
  const fetchDeviceMsgList = async () => {
    try {
      const data = (await getXhsDevicesMsgList(email ? email : "")).data;
      success("刷新成功");
      console.log(data, "=====");
      const filterData = data.filter((device: any) => device.device_id);

      // 检查是否有有效数据
      if (filterData.length === 0) {
        console.log("没有找到有效的设备数据");
        setDeviceMsgList([]);
        setActiveKeys([]);
        setFormatDeviceMsgList({});
        setLoading(false);
        return;
      }

      const formatData = filterData.reduce((acc: Record<string, any[]>, device: any) => {
        if (!acc[device.device_id]) {
          acc[device.device_id] = [];
        }
        acc[device.device_id].push(device);
        return acc;
      }, {});

      console.log(formatData, "=====");

      // 批量更新状态，确保数据一致性
      setDeviceMsgList(filterData);
      setActiveKeys(filterData.map((device: any) => device.device_id));
      setFormatDeviceMsgList(formatData);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleSend = async (e: any) => {
    if (!sendMsg.trim()) {
      notifi("请输入回复内容", "error");
      return;
    }

    try {
      setLoading(true);
      // Create timestamp for unique dag_run_id
      const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
      const dag_run_id = `xhs_reply_${timestamp}`;

      // Prepare configuration
      const conf = {
        email: email,
        msg: sendMsg,
      };

      const response = await triggerDagRun("msg_reply", dag_run_id, conf);

      console.log("=====", response);

      notifi(`成功创建回复评论任务，任务ID: ${dag_run_id}`, "success");
      setLoading(false);
      setSendMsg("");

      fetchDeviceMsgList();
    } catch (err) {
      console.error("Error creating notes task:", err);
      notifi("创建回复评论失败", "error");
      setLoading(false);
    }
  };
  const getTemplateIds = (selectedTemplateIds: number[]) => {
    console.log("一键回复模板ids", selectedTemplateIds);
    setCurrentSelectedTemplateIds(selectedTemplateIds);
    return selectedTemplateIds;
  };

  const handleConfirmTemplateSelection = async () => {
    console.log("确认选择的模板ids", currentSelectedTemplateIds);
    try {
      setLoading(true);
      // Create timestamp for unique dag_run_id
      const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
      const dag_run_id = `xhs_reply_${timestamp}`;

      // Prepare configuration
      const conf = {
        email: email,
        templates_ids: currentSelectedTemplateIds,
      };

      const response = await triggerDagRun("msg_reply", dag_run_id, conf);

      console.log("=====", response);

      notifi(`成功创建回复评论任务，任务ID: ${dag_run_id}`, "success");
      setLoading(false);
      setSendMsg("");

      // 刷新设备消息列表
      await fetchDeviceMsgList();
    } catch (err) {
      console.error("Error creating notes task:", err);
      notifi("创建回复评论失败", "error");
      setLoading(false);
    }

    // setIsOneClickReplyTemplateModalOpen(false);
  };
  return (
    <div className="flex flex-col h-full">
      <h1 className="text-2xl font-bold mb-6">私信管理</h1>
      {/* 设备列表 */}
      <div className="flex-1 bg-white rounded-lg shadow-lg p-4 overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-semibold leading-4">设备列表</h2>
          <Space>
            <Button
              disabled={loading}
              loading={loading}
              type="default"
              onClick={() => refreshDeviceMsgList({ interval: 3 * 1000, maxAttempts: 10 })}
            >
              刷新
            </Button>
            <Button
              disabled={loading}
              type="primary"
              style={{
                border: "1px solid #8389FC",
                backgroundColor: "#8389FC",
                color: "#fff",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = "#8389FC";
                e.currentTarget.style.color = "#fff";
              }}
              onClick={() => {
                setIsOneClickReplyTemplateModalOpen(true);
              }}
            >
              一键回复
            </Button>
          </Space>
        </div>
        <div className="w-full overflow-y-auto h-[calc(100%-4rem)]">
          {Object.keys(formatDeviceMsgList).length ? (
            <>
              <BaseCollapse
                activeKey={activeKeys}
                onChange={(keys) => {
                  setActiveKeys(keys as string[]);
                }}
                items={Object.entries(formatDeviceMsgList).map(([device_id, device]) => ({
                  style: {
                    display: "block",
                  },
                  key: device_id,
                  label: `设备：  ${device_id}`,
                  children:
                    device.length > 0 ? (
                      <BaseList
                        dataSource={device}
                        renderItem={(item, idx) => {
                          return <BaseListUserItem idx={idx + 1} item={item} />;
                        }}
                      />
                    ) : (
                      <div>暂无未回复用户</div>
                    ),
                }))}
              />
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-md p-6 mb-6 h-[50vh] flex flex-col items-center justify-center">
                <h2 className="text-lg font-semibold mb-4">暂无未回复用户</h2>
              </div>
            </>
          )}
        </div>
      </div>
      <Modal
        title="一键回复模板"
        closable={{ "aria-label": "Custom Close Button" }}
        open={isOneClickReplyTemplateModalOpen}
        onOk={() => {
          handleConfirmTemplateSelection();
        }}
        onCancel={() => {
          setIsOneClickReplyTemplateModalOpen(false);
        }}
      >
        <OneClickReplyTemplate email={email} isAdmin={true} getTemplateIds={getTemplateIds} />
      </Modal>
    </div>
  );
};

export default GenerateMsg;
