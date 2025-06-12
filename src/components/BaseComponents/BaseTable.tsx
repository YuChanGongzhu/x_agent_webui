import React, { useState } from 'react';
import { Table, Card, Space, Pagination, Button } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { TableProps } from 'antd/es/table';
import { CardProps } from 'antd/es/card';
import { TablePaginationConfig } from 'antd/es/table';

interface BaseTableProps {
    tableConfig: TableProps<any>;
    cardConfig: CardProps;
    paginationConfig?: TablePaginationConfig;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    tableScrollHeight?: string;
    needPagination?: boolean;
}

const BaseTable = ({ tableConfig, cardConfig, children, paginationConfig, className, style, tableScrollHeight, footer, needPagination = true }: BaseTableProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const dataSource = tableConfig.dataSource;
    const total = dataSource?.length || 0;
    const pageSize = paginationConfig?.pageSize || 10;
    const pageCount = Math.ceil(total / pageSize);

    const defaultPaginationConfig: TablePaginationConfig = {
        hideOnSinglePage: true,
        current: currentPage,
        total: total,
        onChange: (page: number) => {
            setCurrentPage(page);
        },
        itemRender: (_: number, type: string, originalElement: React.ReactNode) => {
            if (type === 'prev') {
                return <>
                    <Space>
                        <Button onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCurrentPage(1);
                        }}>首页</Button>
                        <Button icon={<ArrowLeftOutlined />} />
                    </Space>
                </>
            } else if (type === 'next') {
                return <>
                    <Space>
                        <Button icon={<ArrowRightOutlined />} />
                        <Button onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCurrentPage(pageCount);
                        }}>尾页</Button>
                    </Space>
                </>;
            }
            return originalElement;
        }
    }

    return <>
        <Card style={{ width: '100%' }} {...cardConfig}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div style={{ width: '100%' }}>
                    {children}
                </div>
                <div className="relative" style={{ height: tableScrollHeight ? tableScrollHeight : '66vh' }}>
                    <Table {...tableConfig} scroll={{ x: 'max-content', y: needPagination ? `calc(${tableScrollHeight} - 7rem)` : `calc(${tableScrollHeight} - 4rem)` }} pagination={needPagination ? { ...defaultPaginationConfig, className: 'absolute opacity-0', ...paginationConfig } : false} />
                    {needPagination && <div className="absolute w-full left-0 bottom-0">
                        <Pagination {...{ ...defaultPaginationConfig, ...paginationConfig }} />
                    </div>}
                </div>
                {footer}
            </Space>
        </Card>
    </>
};

export default BaseTable;