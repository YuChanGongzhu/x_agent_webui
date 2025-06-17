import { Popconfirm } from 'antd'
import React from 'react'
import { PopconfirmProps } from 'antd'

interface BasePopconfirmProps {
    popconfirmConfig: PopconfirmProps,
    body?: React.ReactNode
    children?: React.ReactNode
}

const BasePopconfirm = ({ popconfirmConfig, body, children }: BasePopconfirmProps) => {
    return <Popconfirm description={body} {...popconfirmConfig}>
        {children}
    </Popconfirm>
}

export default BasePopconfirm