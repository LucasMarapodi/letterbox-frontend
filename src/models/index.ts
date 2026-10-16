/** Identificador opaco retornado pela API. */
export type Id = string;
/** PK local gerada pelo PostgreSQL (int positivo). */
export type LocalId = number;
export type UserId = LocalId;
export type GameId = LocalId;
export type ReviewId = LocalId;
export type RatingId = LocalId;
export type CommentId = LocalId;
export function isLocalId(value: unknown): value is LocalId {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 2_147_483_647;
}
/** Data/data-hora ISO validada na fronteira HTTP. */
export type DateTime = string;

export interface User {
  id: UserId;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
}

export interface Game {
  id: GameId;
  /** Identificador externo; nunca usado como PK local ou rota de jogo. */
  igdbId: number;
  title: string;
  summary: string;
  coverUrl: string | null;
  genres: string[];
  platforms: string[];
  releaseDate: string | null;
  averageRating: number | null;
}

export interface Rating {
  id: RatingId;
  userId: UserId;
  gameId: GameId;
  /** Faixa do produto: 0–5. Incrementos e validação pertencem às US futuras. */
  value: number;
}

export interface Review {
  id: ReviewId;
  userId: UserId;
  gameId: GameId;
  text: string;
  createdAt: DateTime;
  updatedAt: DateTime | null;
}

export interface Comment {
  id: CommentId;
  userId: UserId;
  reviewId: ReviewId;
  parentCommentId: CommentId | null;
  likeCount: number;
  text: string;
  createdAt: DateTime;
}

export interface Favorite {
  id: Id;
  userId: UserId;
  targetType: 'game' | 'review';
  targetId: GameId | ReviewId;
}

interface NotificationBase {
  id: Id;
  userId: UserId;
  actorId: UserId;
  reviewId: ReviewId;
  createdAt: DateTime;
  read: boolean;
}

export type Notification = NotificationBase & (
  | { type: 'new-review' }
  | { type: 'review-comment'; commentId: CommentId }
);
