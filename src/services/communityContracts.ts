import type { Id, Rating, User } from '../models';

export class CommunityError extends Error {
  constructor(public readonly code: 'session-required' | 'invalid-rating' | 'empty-text' | 'duplicate-review' | 'forbidden' | 'not-found') { super(code); }
}
export interface CommunityService {
  rate(gameId: Id, value: number, user: User | null): Promise<Rating>;
}
