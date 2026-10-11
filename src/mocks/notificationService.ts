import type { NotificationEvent, NotificationService } from '../services/notificationContracts';
import { notificationFixtures } from './notifications';
import { userFixtures } from './opinions';
export function createMockNotificationService(options: { events?: NotificationEvent[] } = {}): NotificationService {
  const events = structuredClone(options.events ?? notificationFixtures);
  return { async list(user) {
    if (!user) throw new Error('session-required');
    return structuredClone(events.filter((event) => event.userId === user.id)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.id.localeCompare(right.id))
      .map((event) => {
        const actor = userFixtures.find((item) => item.id === event.actorId);
        return { ...event, actor: { id: event.actorId, displayName: actor?.displayName ?? 'Usuário indisponível', avatarUrl: actor?.avatarUrl ?? null } };
      }));
  } };
}
