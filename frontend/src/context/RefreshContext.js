import React, { createContext, useContext, useState, useCallback } from 'react';

const RefreshContext = createContext();

export const RefreshProvider = ({ children }) => {
    const [refreshPaymentFlag, setRefreshPaymentFlag] = useState(false);
    const [refreshFlatFlag, setRefreshFlatFlag] = useState(false);
    const [refreshAdjustmentFlag, setRefreshAdjustmentFlag] = useState(false);

    const triggerRefreshPayment = () => {
        console.log('triggerRefreshPayment')
        setRefreshPaymentFlag(prev => !prev);
    };

    const triggerRefreshFlat = useCallback(() => {
        console.log('triggerRefreshFlat called, current value:', refreshFlatFlag);
        setRefreshFlatFlag(prev => !prev);
    }, [refreshFlatFlag]);

    const triggerRefreshAdjustment = () => {
        console.log('triggerRefreshAdjustment')
        setRefreshAdjustmentFlag(prev => !prev);
    };

    return (
        <RefreshContext.Provider value={{ 
            refreshPaymentFlag, 
            refreshFlatFlag, 
            refreshAdjustmentFlag, 
            triggerRefreshPayment, 
            triggerRefreshFlat, 
            triggerRefreshAdjustment 
        }}>
            {children}
        </RefreshContext.Provider>
    );
};

export const useRefresh = () => useContext(RefreshContext);
