import { expect, test } from 'vitest';
import { createMockNotificationService } from './doubles/notificationService';
import type { NotificationEvent } from '../src/services/notificationContracts';
import { userFixtures } from './doubles/opinions';

const events: NotificationEvent[] = [
  { id: 'old', userId: 'user-1', actorId: 'user-2', reviewId: 'review-2', type: 'new-review', createdAt: '2026-01-01T12:00:00Z' },
  { id: 'z', userId: 'user-1', actorId: 'user-2', reviewId: 'review-1', type: 'review-comment', commentId: 'comment-1', createdAt: '2026-01-02T12:00:00Z' },
  { id: 'other', userId: 'user-2', actorId: 'user-1', reviewId: 'review-1', type: 'new-review', createdAt: '2026-01-03T12:00:00Z' },
  { id: 'a', userId: 'user-1', actorId: 'user-2', reviewId: 'review-2', type: 'new-review', createdAt: '2026-01-02T12:00:00Z' },
];
test('notificações são pessoais ordenadas por ocorrência e ID com os dois eventos', async () => {
  const service = createMockNotificationService({ events });
  const list = await service.list(userFixtures[0]);
  expect(list.map((event) => event.id)).toEqual(['a', 'z', 'old']);
  expect(list[1]).toMatchObject({ type: 'review-comment', commentId: 'comment-1', actor: { displayName: 'Leo' } });
  list[0].actor.displayName = 'Alterado';
  expect((await service.list(userFixtures[0]))[0].actor.displayName).toBe('Leo');
  expect((await service.list(userFixtures[1])).map((event) => event.id)).toEqual(['other']);
});
test('visitantes não consultam notificações e ausência de eventos retorna vazio', async () => {
  const service = createMockNotificationService({ events: [] });
  await expect(service.list(null)).rejects.toThrow('session-required');
  expect(await service.list(userFixtures[0])).toEqual([]);
});
