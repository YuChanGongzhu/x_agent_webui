import React, { useState } from 'react';
import { Collapse } from 'antd';

import type { CollapseProps } from 'antd';

interface BaseCollapseProps extends CollapseProps {
    children?: React.ReactNode;
}

const BaseCollapse: React.FC<BaseCollapseProps> = ({ children, ...props }) => {
    return (
        <Collapse {...props}>
            {children}
        </Collapse>
    );
};

export default BaseCollapse;
