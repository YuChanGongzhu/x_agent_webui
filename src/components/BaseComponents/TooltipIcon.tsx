import React from 'react';

import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { TooltipProps } from 'antd';

interface TooltipIconProps {
    tooltipProps?: TooltipProps;
}


const TooltipIcon: React.FC<TooltipIconProps> = ({ tooltipProps }) => {

    return (
        <Tooltip {...tooltipProps}>
            <InfoCircleOutlined />
        </Tooltip>
    );
};

export default TooltipIcon;