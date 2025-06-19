import React, { useState, useEffect, Children } from 'react'
import { useUser } from '../../context/UserContext';

interface BasePermissionProps {
    children: React.ReactNode
}

const BasePermission = ({ children }: BasePermissionProps) => {
    const { isAdmin } = useUser();
    if (isAdmin) {
        return <>
            {children}
        </>
    } else {
        return <>
            <div className='flex flex-col h-full items-center justify-center'>
                <p className='text-2xl font-bold'>无权访问</p>
                <p className='text-sm text-gray-500'>请联系管理员</p>
            </div>
        </>
    }
}

export default BasePermission