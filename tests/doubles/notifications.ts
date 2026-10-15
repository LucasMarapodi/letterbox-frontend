import type { NotificationEvent } from '../../src/services/notificationContracts';

/** Eventos fictícios já ocorridos; não são gerados pelas ações da aplicação. */
export const notificationFixtures: NotificationEvent[] = [
  { id: 'notification-1', userId: 1, actorId: 2, reviewId: 'review-2', type: 'new-review', createdAt: '2026-01-02T12:00:00Z' },
  { id: 'notification-2', userId: 1, actorId: 2, reviewId: 'review-1', type: 'review-comment', commentId: 'comment-1', createdAt: '2026-01-03T12:00:00Z' },
  { id: 'notification-3', userId: 2, actorId: 1, reviewId: 'review-1', type: 'new-review', createdAt: '2026-01-01T12:00:00Z' },
];
