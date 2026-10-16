import type { DateTime, Id, User } from '../models';

interface EventBase { id: Id; userId: Id; actorId: Id; reviewId: Id; createdAt: DateTime; }
export type NotificationEvent = EventBase & ({ type: 'new-review' } | { type: 'review-comment'; commentId: Id });
export type NotificationItem = NotificationEvent & { actor: Pick<User, 'id' | 'displayName' | 'avatarUrl'> };
export interface NotificationService { list(user: User | null): Promise<NotificationItem[]>; }
