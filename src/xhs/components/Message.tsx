import React, { useState } from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Define message types
type MessageType = 'user' | 'template';

// Interface for user messages
interface UserMessage {
  id: string;
  type: 'user';
  avatar: string;
  name: string;
  description: string;
  selected?: boolean;
}

// Interface for template messages
interface TemplateMessage {
  id: string;
  type: 'template';
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
  onSelect: (id: string) => void;
}> = ({ message, onSelect }) => {
  return (
    <div className="flex items-center py-3 px-4 border-b border-gray-100">
      <div className="flex items-center flex-1">
        <input
          type="checkbox"
          checked={message.selected}
          onChange={() => onSelect(message.id)}
          className="h-4 w-4 text-indigo-600 rounded border-gray-300 mr-3"
        />
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
        <input
          type="checkbox"
          checked={message.selected}
          onChange={() => onSelect(message.id)}
          className="h-4 w-4 text-indigo-600 rounded border-gray-300 mr-3"
        />
        <p className="text-sm text-gray-700 flex-1">{message.content}</p>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(message.id)}
            className="p-1 text-blue-500 hover:text-blue-700"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(message.id)}
            className="p-1 text-red-500 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
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
  onDeleteTemplate
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
  const userMessages = messages.filter((msg): msg is UserMessage => msg.type === 'user');
  const templateMessages = messages.filter((msg): msg is TemplateMessage => msg.type === 'template');

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
      {/* User Messages Section */}
      <div className="border-b border-gray-100">
        <div className="flex items-center py-3 px-4 border-b border-gray-100">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            className="h-4 w-4 text-indigo-600 rounded border-gray-300 mr-3"
          />
          <span className="font-medium text-sm">私信管理</span>
        </div>

        {userMessages.map((message) => (
          <UserMessageItem
            key={message.id}
            message={message}
            onSelect={handleSelectMessage}
          />
        ))}
      </div>

      {/* Template Messages Section */}
      <div>
        <div className="py-3 px-4 border-b border-gray-100">
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
        <button
          onClick={onAddTemplate}
          className="px-4 py-2 bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
        >
          添加模板
        </button>
        <button
          onClick={onReplyAll}
          className="px-4 py-2 bg-indigo-500 rounded-md text-white hover:bg-indigo-600 text-sm"
        >
          一键回复
        </button>
      </div>
    </div>
  );
};

// Example usage with sample data
const ExampleMessage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'user',
      avatar: '',
      name: 'Hanson',
      description: 'Ant Design, a design language',
      selected: false
    },
    {
      id: '2',
      type: 'user',
      avatar: '',
      name: 'Hanson',
      description: 'Ant Design, a design language',
      selected: false
    },
    {
      id: '3',
      type: 'user',
      avatar: '',
      name: 'Hanson',
      description: 'Ant Design, a design language',
      selected: false
    },
    {
      id: '4',
      type: 'user',
      avatar: '',
      name: 'Hanson',
      description: 'Ant Design, a design language',
      selected: false
    },
    {
      id: '5',
      type: 'user',
      avatar: '',
      name: 'Hanson',
      description: 'Ant Design, a design language',
      selected: false
    },
    {
      id: '6',
      type: 'user',
      avatar: '',
      name: 'Hanson',
      description: 'Ant Design, a design language',
      selected: false
    },
    {
      id: '7',
      type: 'template',
      content: 'Mauris quam tristique et purus.',
      selected: false
    },
    {
      id: '8',
      type: 'template',
      content: 'Mauris quam tristique et purus.',
      selected: false
    },
    {
      id: '9',
      type: 'template',
      content: 'Mauris quam tristique et purus.',
      selected: false
    },
    {
      id: '10',
      type: 'template',
      content: 'Mauris quam tristique et purus.',
      selected: false
    }
  ]);

  // Handle selecting a message
  const handleSelectMessage = (id: string) => {
    setMessages(messages.map(msg => 
      msg.id === id ? { ...msg, selected: !msg.selected } : msg
    ));
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    setMessages(messages.map(msg => ({ ...msg, selected })));
  };

  // Handle adding a template
  const handleAddTemplate = () => {
    console.log('Adding new template');
  };

  // Handle replying to all selected
  const handleReplyAll = () => {
    const selectedIds = messages
      .filter(msg => msg.selected)
      .map(msg => msg.id);
    console.log('Replying to:', selectedIds);
  };

  // Handle editing a template
  const handleEditTemplate = (id: string) => {
    console.log('Editing template:', id);
  };

  // Handle deleting a template
  const handleDeleteTemplate = (id: string) => {
    console.log('Deleting template:', id);
    setMessages(messages.filter(msg => msg.id !== id));
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
export { ExampleMessage };
