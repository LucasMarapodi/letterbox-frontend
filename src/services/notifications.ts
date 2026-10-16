import { createMockNotificationService } from '../mocks/notificationService';
import type { NotificationService } from './notificationContracts';
export const notifications: NotificationService = createMockNotificationService();
