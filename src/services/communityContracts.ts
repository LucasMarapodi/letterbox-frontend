import type { Id, Rating, User, Review, Comment } from '../models';
import type { GameOpinions, PublicReview } from './contracts';
export interface ReviewDetails extends PublicReview { game: { id: Id; title: string }; }
export interface PublicComment extends Comment { author: Pick<User, 'id' | 'displayName' | 'avatarUrl'>; }
export interface PublicProfile { user: User; reviews: ReviewDetails[]; }

export class CommunityError extends Error {
  constructor(public readonly code: 'session-required' | 'invalid-rating' | 'empty-text' | 'duplicate-review' | 'forbidden' | 'not-found') { super(code); }
}
export interface CommunityService {
  getProfile(id: Id, sessionUser?: User | null): Promise<PublicProfile | null>;
  rate(gameId: Id, value: number, user: User | null): Promise<Rating>;
  getRating(gameId: Id, user: User | null): Promise<Rating | null>;
  publish(gameId: Id, text: string, user: User | null): Promise<Review>;
  findOwnReview(gameId: Id, user: User): Promise<Review | null>;
  getOpinions(gameId: Id): Promise<GameOpinions>;
  getReview(id: Id): Promise<ReviewDetails | null>;
  editReview(id: Id, text: string, user: User | null): Promise<Review>;
  getComments(reviewId: Id): Promise<PublicComment[]>;
  comment(reviewId: Id, text: string, user: User | null): Promise<Comment>;
}
