import type { Id, Rating, User, Review } from '../models';
import type { GameOpinions } from './contracts';

export class CommunityError extends Error {
  constructor(public readonly code: 'session-required' | 'invalid-rating' | 'empty-text' | 'duplicate-review' | 'forbidden' | 'not-found') { super(code); }
}
export interface CommunityService {
  rate(gameId: Id, value: number, user: User | null): Promise<Rating>;
  publish(gameId: Id, text: string, user: User | null): Promise<Review>;
  findOwnReview(gameId: Id, user: User): Promise<Review | null>;
  getOpinions(gameId: Id): Promise<GameOpinions>;
}
