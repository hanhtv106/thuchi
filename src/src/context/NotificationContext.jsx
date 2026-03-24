import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const NotificationContext = createContext(null);

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const showNotification = useCallback((message, type = 'success') => {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications((prev) => [...prev, { id, message, type }]);

        // Auto remove after 3 seconds
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 3000);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const contextValue = useMemo(() => ({
        showNotification,
        removeNotification,
        notifications
    }), [showNotification, removeNotification, notifications]);

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
            <div className="toast-container">
                {notifications.map((n) => (
                    <div key={n.id} className={`toast-item ${n.type}`} onClick={() => removeNotification(n.id)}>
                        <div className="toast-icon">
                            {n.type === 'success' ? '✓' : n.type === 'error' ? '✕' : 'ℹ'}
                        </div>
                        <div className="toast-message">{n.message}</div>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};
