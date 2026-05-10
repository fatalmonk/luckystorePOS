import { createContext, useContext } from 'react';

export type NotificationType = 'error' | 'success' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

export interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotify = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotify must be used within NotificationProvider');
  return context;
};
