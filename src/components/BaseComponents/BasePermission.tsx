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
        return <p>无权访问</p>
    }
}

export default BasePermission