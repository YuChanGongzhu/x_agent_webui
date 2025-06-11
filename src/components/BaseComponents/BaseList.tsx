import React from 'react';
import { List } from 'antd';

import type { ListProps } from 'antd';

interface BaseListProps extends ListProps<any> {
    children?: React.ReactNode;
}

const BaseList: React.FC<BaseListProps> = ({ children, ...props }) => {
    return (
        <List {...props}>
            {children}
        </List>
    );
};

export default BaseList;