import type { NotificationEvent, NotificationService } from '../services/notificationContracts';
export function createMockNotificationService(_options: { events?: NotificationEvent[] } = {}): NotificationService {
  void _options;
  return { async list() { throw new Error('US-28 pendente'); } };
}
