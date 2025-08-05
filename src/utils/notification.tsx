import { notification } from 'antd'
import '@ant-design/v5-patch-for-react-19';
import { CloseOutlined } from '@ant-design/icons';

const notifi = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const type_config_fn = {
        success: (message: string) => {
            return {
                className: 'border border-green-400 text-green-500 bg-green-100 rounded shadow-md',
                style: {
                    paddingBottom: '12px',
                },
                message: <span className='text-green-700'>{message}</span>,
                closeIcon: <CloseOutlined className='text-green-500' />,
            }
        },
        error: (message: string) => {
            return {
                className: 'border border-red-400 text-red-500 bg-red-100 rounded shadow-md',
                style: {
                    paddingBottom: '12px',
                },
                message: <span className='text-red-700'>{message}</span>,
                closeIcon: <CloseOutlined className='text-red-500' />,
            }
        },
        info: (message: string) => {
            return {
                className: 'border border-blue-400 text-blue-500 bg-blue-100 rounded shadow-md',
                style: {
                    paddingBottom: '12px',
                },
                message: <span className='text-blue-700'>{message}</span>,
                closeIcon: <CloseOutlined className='text-blue-500' />,
            }
        },
        warning: (message: string) => {
            return {
                className: 'border border-yellow-400 text-yellow-500 bg-yellow-100 rounded shadow-md',
                style: {
                    paddingBottom: '12px',
                },
                message: <span className='text-yellow-700'>{message}</span>,
                closeIcon: <CloseOutlined className='text-yellow-500' />,
            }
        },
    }
    notification.open({
        placement: 'bottomLeft',
        duration: 0,
        ...type_config_fn[type](message),
    });
};

export default notifi;