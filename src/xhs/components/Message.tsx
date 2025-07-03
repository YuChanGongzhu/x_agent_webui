import React, { useState, useEffect } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button, Checkbox } from "antd";
import BaseCollapse from "../../components/BaseComponents/BaseCollapse";
import BaseList from "../../components/BaseComponents/BaseList";
import BaseListUserItem from "../../components/BaseComponents/BaseListUserItem";
import { useUser } from "../../context/UserContext";
import { getXhsDevicesMsgList } from "../../api/mysql";
// Define message types
type MessageType = "user" | "template";

// Interface for user messages
interface UserMessage {
  id: string;
  type: "user";
  avatar: string;
  name: string;
  description: string;
  selected?: boolean;
}

// Interface for template messages
interface TemplateMessage {
  id: string;
  type: "template";
  content: string;
  selected?: boolean;
}

// Union type for all message types
type Message = UserMessage | TemplateMessage;

// Props for the Message component
interface MessageProps {
  messages: Message[];
  onSelectMessage?: (id: string) => void;
  onSelectAll?: (selected: boolean) => void;
  onAddTemplate?: () => void;
  onReplyAll?: () => void;
  onEditTemplate?: (id: string) => void;
  onDeleteTemplate?: (id: string) => void;
}

// User message item component
const UserMessageItem: React.FC<{
  message: UserMessage;
}> = ({ message }) => {
  return (
    <div className="flex items-center py-3 px-4 border-b border-gray-100">
      <div className="flex items-center flex-1">
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
          <span className="text-blue-500 text-xs">👤</span>
        </div>
        <div>
          <p className="font-medium text-sm">{message.name}</p>
          <p className="text-xs text-gray-500">{message.description}</p>
        </div>
      </div>
    </div>
  );
};

// Template message item component
const TemplateMessageItem: React.FC<{
  message: TemplateMessage;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  }> = ({ message, onSelect, onEdit, onDelete }) => {
  return (
    <div className="flex items-center py-3 px-4 border-b border-gray-100">
      <div className="flex items-center flex-1">
        <Checkbox
          checked={message.selected}
          onChange={() => onSelect(message.id)}
          className="mr-3"
        />
        <p className="text-sm text-gray-700 flex-1">{message.content}</p>
        <div className="flex space-x-2">
          <Button
            onClick={() => onEdit(message.id)}
            type="text"
            size="small"
            icon={<PencilIcon className="h-4 w-4" />}
            className="text-blue-500 hover:text-blue-700"
          />
          <Button
            onClick={() => onDelete(message.id)}
            type="text"
            size="small"
            icon={<TrashIcon className="h-4 w-4" />}
            className="text-red-500 hover:text-red-700"
          />
        </div>
      </div>
    </div>
  );
};

const PrivateMessage: React.FC = () => {
  const [formatDeviceMsgList, setFormatDeviceMsgList] = useState<any[]>([]);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  // const [deviceMsgList, setDeviceMsgList] = useState<any[]>([]);
  const { email } = useUser();
  // const [loading, setLoading] = useState(false);
  useEffect(() => {
    fetchDeviceMsgList();
  }, [email]);
  const fetchDeviceMsgList = async () => {
    try {
      // setLoading(true)
      const data = (await getXhsDevicesMsgList(email ? email : "")).data;
      console.log(data, "=====");
      const filterData = data.filter((device: any) => device.device_id);
      const formatData = filterData.reduce((acc: any, device: any) => {
        if (!acc[device.device_id]) {
          acc[device.device_id] = [];
        }
        acc[device.device_id].push(device);
        return acc;
      }, {});
      console.log(formatData, "=====");
      // setDeviceMsgList(filterData);
      setActiveKeys(filterData.map((device: any) => device.device_id));
      setFormatDeviceMsgList(formatData);
      // setLoading(false)
    } catch (err) {
      // setLoading(false)
    }
  };
  return (
    <div className="w-full overflow-y-auto h-[calc(100%-4rem)]">
      {Object.keys(formatDeviceMsgList).length ? (
        <>
          <BaseCollapse
            activeKey={activeKeys}
            onChange={(keys) => {
              setActiveKeys(keys as string[]);
            }}
            // style={{ borderRadius: "0px" }}
            items={Object.entries(formatDeviceMsgList).map(
              ([device_id, device]) => ({
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
              })
            )}
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
  );
};

// Main Message component
const Message: React.FC<MessageProps> = ({
  messages,
  onSelectMessage,
  onSelectAll,
  onAddTemplate,
  onReplyAll,
  onEditTemplate,
  onDeleteTemplate,
}) => {
  const [allSelected, setAllSelected] = useState(false);

  // Handle select all checkbox
  const handleSelectAll = () => {
    const newState = !allSelected;
    setAllSelected(newState);
    onSelectAll && onSelectAll(newState);
  };

  // Handle individual message selection
  const handleSelectMessage = (id: string) => {
    onSelectMessage && onSelectMessage(id);
  };

  // Filter messages by type
  // const userMessages = messages.filter(
  //   (msg): msg is UserMessage => msg.type === "user"
  // );
  const templateMessages = messages.filter(
    (msg): msg is TemplateMessage => msg.type === "template"
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
      {/* User Messages Section */}
      <div className="border-b border-gray-100">·
        <div
          className=" py-3 px-4 border-b border-gray-100"
          style={{
            justifyContent: "space-between",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span className="font-medium text-sm">私信管理</span>
          <Button type="primary" className="text-sm">字体待定</Button>
        </div>

        {/* {userMessages.map((message) => (
          <UserMessageItem
            key={message.id}
            message={message}
          />
        ))} */}
        <PrivateMessage />
      </div>

      {/* Template Messages Section */}
      <div>
        <div className="flex items-center py-3 px-4 border-b border-gray-100">
          <Checkbox
            checked={allSelected}
            onChange={handleSelectAll}
            className="mr-3"
          />
          <span className="font-medium text-sm">私信模板内容</span>
        </div>

        {templateMessages.map((message) => (
          <TemplateMessageItem
            key={message.id}
            message={message}
            onSelect={handleSelectMessage}
            onEdit={(id) => onEditTemplate && onEditTemplate(id)}
            onDelete={(id) => onDeleteTemplate && onDeleteTemplate(id)}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between p-4">
        <Button onClick={onAddTemplate} className="text-sm">
          添加模板
        </Button>
        <Button onClick={onReplyAll} type="primary" className="text-sm">
          一键回复
        </Button>
      </div>
    </div>
  );
};

// Example usage with sample data
const ExampleMessage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "user",
      avatar: "",
      name: "Hanson",
      description: "Ant Design, a design language",
      selected: false,
    },
    {
      id: "2",
      type: "user",
      avatar: "",
      name: "Hanson",
      description: "Ant Design, a design language",
      selected: false,
    },
    {
      id: "3",
      type: "user",
      avatar: "",
      name: "Hanson",
      description: "Ant Design, a design language",
      selected: false,
    },
    {
      id: "4",
      type: "user",
      avatar: "",
      name: "Hanson",
      description: "Ant Design, a design language",
      selected: false,
    },
    {
      id: "5",
      type: "user",
      avatar: "",
      name: "Hanson",
      description: "Ant Design, a design language",
      selected: false,
    },
    {
      id: "6",
      type: "user",
      avatar: "",
      name: "Hanson",
      description: "Ant Design, a design language",
      selected: false,
    },
    {
      id: "7",
      type: "template",
      content: "Mauris quam tristique et purus.",
      selected: false,
    },
    {
      id: "8",
      type: "template",
      content: "Mauris quam tristique et purus.",
      selected: false,
    },
    {
      id: "9",
      type: "template",
      content: "Mauris quam tristique et purus.",
      selected: false,
    },
    {
      id: "10",
      type: "template",
      content: "Mauris quam tristique et purus.",
      selected: false,
    },
  ]);

  // Handle selecting a message
  const handleSelectMessage = (id: string) => {
    setMessages(
      messages.map((msg) =>
        msg.id === id ? { ...msg, selected: !msg.selected } : msg
      )
    );
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    setMessages(messages.map((msg) => ({ ...msg, selected })));
  };

  // Handle adding a template
  const handleAddTemplate = () => {
    console.log("Adding new template");
  };

  // Handle replying to all selected
  const handleReplyAll = () => {
    const selectedIds = messages
      .filter((msg) => msg.selected)
      .map((msg) => msg.id);
    console.log("Replying to:", selectedIds);
  };

  // Handle editing a template
  const handleEditTemplate = (id: string) => {
    console.log("Editing template:", id);
  };

  // Handle deleting a template
  const handleDeleteTemplate = (id: string) => {
    console.log("Deleting template:", id);
    setMessages(messages.filter((msg) => msg.id !== id));
  };

  return (
    <Message
      messages={messages}
      onSelectMessage={handleSelectMessage}
      onSelectAll={handleSelectAll}
      onAddTemplate={handleAddTemplate}
      onReplyAll={handleReplyAll}
      onEditTemplate={handleEditTemplate}
      onDeleteTemplate={handleDeleteTemplate}
    />
  );
};

export default Message;
export { ExampleMessage, PrivateMessage };
