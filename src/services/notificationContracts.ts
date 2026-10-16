import type { DateTime, Id, User, UserId, ReviewId, CommentId } from '../models';

interface EventBase { id: Id; userId: UserId; actorId: UserId; reviewId: ReviewId; createdAt: DateTime; }
export type NotificationEvent = EventBase & ({ type: 'new-review' } | { type: 'review-comment'; commentId: CommentId });
export type NotificationItem = NotificationEvent & { actor: Pick<User, 'id' | 'displayName' | 'avatarUrl'> };
export interface NotificationService { list(user: User | null): Promise<NotificationItem[]>; }
