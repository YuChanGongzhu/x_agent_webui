import React from 'react';

import { Tooltip } from 'antd';

interface TooltipwrapProps {
    width?: number;
    title: string;
    children: React.ReactNode;
}


const Tooltipwrap: React.FC<TooltipwrapProps> = ({ width = 200, title = '', children }) => {

    return (
        <div className='inline-block truncate' style={{ width: `${width}px` }}>
            <Tooltip className='inline-block w-full truncate' title={title}>
                {children}
            </Tooltip>
        </div>

    );
};

export default Tooltipwrap;