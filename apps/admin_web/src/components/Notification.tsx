import React, { useState } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
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

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {notifications.map(n => (
          <div 
            key={n.id} 
            style={{ 
              padding: 'var(--space-4) var(--space-6)', 
              borderRadius: 'var(--radius-lg)', 
              backgroundColor: n.type === 'error' ? 'var(--color-danger)' : n.type === 'success' ? 'var(--color-success)' : 'var(--color-primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideIn 0.3s ease-out',
              minWidth: '300px',
              maxWidth: '450px'
            }}
          >
            {n.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span style={{ flex: 1, fontWeight: '600' }}>{n.message}</span>
            <button onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))} style={{ color: 'white', opacity: 0.7 }}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </NotificationContext.Provider>
  );
}
