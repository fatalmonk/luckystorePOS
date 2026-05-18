import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, X, Info } from 'lucide-react';
import { Notification, NotificationType, NotificationContext } from './NotificationContext';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = (message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Clear all notifications after 5 seconds
  useEffect(() => {
    const timers = notifications.map(n => {
      return setTimeout(() => {
        setNotifications(prev => prev.filter(notification => notification.id !== n.id));
      }, 5000);
    });
    return () => timers.forEach(clearTimeout);
  }, [notifications]);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'error':
        return <AlertCircle size={20} />;
      case 'success':
        return <CheckCircle size={20} />;
      case 'info':
        return <Info size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  const getStyles = (type: NotificationType) => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-danger',
          iconColor: 'text-white',
          borderColor: 'border-danger-dark',
        };
      case 'success':
        return {
          bg: 'bg-emerald-500', // emerald instead of success
          iconColor: 'text-white',
          borderColor: 'border-emerald-600',
        };
      case 'info':
        return {
          bg: 'bg-primary',
          iconColor: 'text-white',
          borderColor: 'border-primary-hover',
        };
      default:
        return {
          bg: 'bg-primary',
          iconColor: 'text-white',
          borderColor: 'border-primary-hover',
        };
    }
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div 
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {notifications.map((n, index) => {
          const styles = getStyles(n.type);
          return (
            <div
              key={n.id}
              className={`
                pointer-events-auto
                flex items-start gap-3 px-4 py-3 rounded-lg shadow-level-3
                border-l-4 ${styles.borderColor}
                ${styles.bg} text-white
                animate-slideInRight
                transition-all duration-300
              `}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
              role="alert"
            >
              <div className={`flex-shrink-0 ${styles.iconColor} mt-0.5`>
                {getIcon(n.type)}
              </div>
              <span className="flex-1 text-sm font-medium leading-relaxed">
                {n.message}
              </span>
              <button
                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                className="flex-shrink-0 p-1 -mr-1 rounded-md hover:bg-white/20 transition-colors"
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}
