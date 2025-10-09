import React from 'react';
import { useNotificationIntegration } from '../hooks/useNotificationIntegration';

interface NotificationIntegrationProps {
  children: React.ReactNode;
}

export const NotificationIntegration: React.FC<NotificationIntegrationProps> = ({ children }) => {
  // This hook handles all notification scheduling automatically
  useNotificationIntegration();
  
  return <>{children}</>;
};
