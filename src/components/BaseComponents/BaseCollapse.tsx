import React from 'react';
import { Collapse } from 'antd';

import type { CollapseProps } from 'antd';

interface BaseCollapseProps extends CollapseProps {
    children?: React.ReactNode;
    allActive?: boolean;
}

const BaseCollapse: React.FC<BaseCollapseProps> = ({ children, allActive, ...props }) => {
    if (allActive) {
        const defaultActiveKey = props?.items?.map((item) => item.key as string) || [];
        const newProps = { ...props, activeKey: defaultActiveKey };
        console.log('newProps', newProps);
        return (
            <Collapse {...newProps} >
                {children}
            </Collapse>
        );
    }

    return (
        <Collapse {...props}>
            {children}
        </Collapse>
    );
};

export default BaseCollapse;
