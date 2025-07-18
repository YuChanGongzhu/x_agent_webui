import React, { useState, useEffect } from 'react';
import { triggerDagRun } from '../../api/airflow';

import notifi from '../../utils/notification';
import BaseCollapse from '../../components/BaseComponents/BaseCollapse';
import BaseList from '../../components/BaseComponents/BaseList';
import BaseListUserItem from '../../components/BaseComponents/BaseListUserItem';
import BasePopconfirm from '../../components/BaseComponents/BasePopconfirm'
import BaseInput from '../../components/BaseComponents/BaseInput';
import { Button, Space } from 'antd'
import { getXhsDevicesMsgList } from '../../api/mysql';
import { useUser } from '../../context/UserContext';

const GenerateMsg: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [deviceMsgList, setDeviceMsgList] = useState<any[]>([]);
  const [formatDeviceMsgList, setFormatDeviceMsgList] = useState<any[]>([])
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const { isAdmin, email } = useUser();
  const [sendMsg, setSendMsg] = useState('')

  useEffect(() => {
    fetchDeviceMsgList();
  }, [email]);

  const fetchDeviceMsgList = async () => {
    try {
      setLoading(true)
      const data = (await getXhsDevicesMsgList(email ? email : '')).data;
      console.log(data, '=====')
      const filterData = data.filter((device: any) => device.device_id)
      const formatData = filterData.reduce((acc: any, device: any) => {
        if (!acc[device.device_id]) {
          acc[device.device_id] = [];
        }
        acc[device.device_id].push(device);
        return acc;
      }, {});
      console.log(formatData, '=====')
      setDeviceMsgList(filterData);
      setActiveKeys(filterData.map((device: any) => device.device_id));
      setFormatDeviceMsgList(formatData);
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  };

  const handleSend = async (e: any) => {
    if (!sendMsg.trim()) {
      notifi('请输入回复内容', 'error');
      return;
    }

    try {
      setLoading(true);
      // Create timestamp for unique dag_run_id
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '_');
      const dag_run_id = `xhs_reply_${timestamp}`;

      // Prepare configuration
      const conf = {
        email: email,
        msg: sendMsg
      };

      const response = await triggerDagRun(
        "msg_reply",
        dag_run_id,
        conf
      );

      console.log('=====', response)

      notifi(`成功创建回复评论任务，任务ID: ${dag_run_id}`, 'success');
      setLoading(false);
      setSendMsg('');

      fetchDeviceMsgList();
    } catch (err) {
      console.error('Error creating notes task:', err);
      notifi('创建回复评论失败', 'error');
      setLoading(false);
    }
  }

  return (
    <div className='flex flex-col h-full'>
      <h1 className="text-2xl font-bold mb-6">私信管理</h1>
      {/* 设备列表 */}
      <div className="flex-1 bg-white rounded-lg shadow-lg p-4 overflow-y-auto">
        <div className='flex justify-between mb-4'>
          <h2 className="text-lg font-semibold leading-4">设备列表</h2>
          <Space>
            <Button disabled={!deviceMsgList.length || loading} type='default' onClick={fetchDeviceMsgList}>刷新</Button>
            <BasePopconfirm popconfirmConfig={{
              title: <><div className='p-4 pb-0'>您想一键回复什么内容？</div></>,
              description: <>
                <div className='w-[24rem] h-[6rem] p-4 pt-1 pb-0'>
                  <BaseInput type='textarea' textareaConfig={{
                    autoSize: {
                      minRows: 4,
                      maxRows: 4
                    },
                    value: sendMsg,
                    onChange: (e: any) => setSendMsg(e.target.value)
                  }} />
                </div>
              </>,
              placement: 'bottomRight',
              icon: <></>,
              okText: '发送',
              cancelText: '取消',
              okButtonProps: {
                className: 'mr-7 mt-2'
              },
              onConfirm: handleSend
            }}>
              <Button disabled={!deviceMsgList.length || loading} type='primary'>一键回复</Button>
            </BasePopconfirm>
          </Space>
        </div>
        <div className="w-full overflow-y-auto h-[calc(100%-4rem)]">
          {Object.keys(formatDeviceMsgList).length ? <>
            <BaseCollapse activeKey={activeKeys} onChange={(keys) => {
              setActiveKeys(keys as string[]);
            }} items={Object.entries(formatDeviceMsgList).map(([device_id, device]) => ({
              style: {
                display: 'block'
              },
              key: device_id,
              label: `设备：  ${device_id}`,
              children: device.length > 0 ? <BaseList dataSource={device} renderItem={(item, idx) => {
                return <BaseListUserItem idx={idx + 1} item={item} />
              }} /> : <div>暂无未回复用户</div>
            }))} />
          </> : (<>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 h-[50vh] flex flex-col items-center justify-center">
              <h2 className="text-lg font-semibold mb-4">暂无未回复用户</h2>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
};

export default GenerateMsg;
