import { expect, test } from 'vitest';
import { createMockNotificationService } from './doubles/notificationService';
import type { NotificationEvent } from '../src/services/notificationContracts';
import { userFixtures } from './doubles/opinions';

const events: NotificationEvent[] = [
  { id: 1, userId: 1, actorId: 2, reviewId: 2, type: 'new-review', createdAt: '2026-01-01T12:00:00Z' },
  { id: 10, userId: 1, actorId: 2, reviewId: 1, type: 'review-comment', commentId: 1, createdAt: '2026-01-02T12:00:00Z' },
  { id: 3, userId: 2, actorId: 1, reviewId: 1, type: 'new-review', createdAt: '2026-01-03T12:00:00Z' },
  { id: 2, userId: 1, actorId: 2, reviewId: 2, type: 'new-review', createdAt: '2026-01-02T12:00:00Z' },
];
test('notificações são pessoais ordenadas por ocorrência e ID com os dois eventos', async () => {
  const service = createMockNotificationService({ events });
  const list = await service.list(userFixtures[0]);
  expect(list.map((event) => event.id)).toEqual([2, 10, 1]);
  expect(list[1]).toMatchObject({ type: 'review-comment', commentId: 1, actor: { displayName: 'Leo' } });
  list[0].actor.displayName = 'Alterado';
  expect((await service.list(userFixtures[0]))[0].actor.displayName).toBe('Leo');
  expect((await service.list(userFixtures[1])).map((event) => event.id)).toEqual([3]);
});
test('visitantes não consultam notificações e ausência de eventos retorna vazio', async () => {
  const service = createMockNotificationService({ events: [] });
  await expect(service.list(null)).rejects.toThrow('session-required');
  expect(await service.list(userFixtures[0])).toEqual([]);
});
