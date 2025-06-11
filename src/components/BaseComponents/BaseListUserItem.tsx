import React from 'react';
import { List, Avatar, Button } from 'antd';

interface EditConfig {
    editIcon: React.ReactNode;
    editText: string;
    editFn: () => void;
}

interface BaseListUserItemProps {
    item: {
        username: string;
        message_type: string;
    },
    editConfig?: EditConfig[]
}

const randomAvatar = () => {
    const random = ~~(Math.random() * 5);
    return `https://api.dicebear.com/7.x/miniavs/svg?seed=${random}`;
}

const BaseListUserItem: React.FC<BaseListUserItemProps> = ({ item, editConfig = [] }) => {
    return <List.Item className='flex'>
        <List.Item.Meta
            avatar={<Avatar src={randomAvatar()} />}
            title={item.username}
            description={item.message_type}
        />
        {
            editConfig?.length > 0 && (
                <div className='flex items-center gap-2'>
                    {editConfig?.map((edit) => (
                        <Button key={edit.editText} onClick={edit.editFn}>
                            {edit.editText}
                            {edit.editIcon}
                        </Button>
                    ))}
                </div>
            )
        }
    </List.Item >
};

export default BaseListUserItem;