import React from 'react';

import { Tooltip } from 'antd';

interface TooltipwrapProps {
    width?: number;
    title: string;
    children: React.ReactNode;
}


const Tooltipwrap: React.FC<TooltipwrapProps> = ({ width = 200, title = '', children }) => {

    return (
        <Tooltip className={`inline-block truncate w-[${width}px]`} title={title}>
            {children}
        </Tooltip>
    );
};

export default Tooltipwrap;