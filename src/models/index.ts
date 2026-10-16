/** Identificador opaco retornado pela API. */
export type Id = string;
/** PK local de usuário/jogo gerada pelo PostgreSQL (int positivo). */
export type LocalId = number;
export type UserId = LocalId;
export type GameId = LocalId;
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
  id: Id;
  userId: UserId;
  gameId: GameId;
  /** Faixa do produto: 0–5. Incrementos e validação pertencem às US futuras. */
  value: number;
}

export interface Review {
  id: Id;
  userId: UserId;
  gameId: GameId;
  text: string;
  createdAt: DateTime;
  updatedAt: DateTime | null;
}

export interface Comment {
  id: Id;
  userId: UserId;
  reviewId: Id;
  text: string;
  createdAt: DateTime;
}

export interface Favorite {
  id: Id;
  userId: UserId;
  targetType: 'game' | 'review';
  targetId: GameId | Id;
}

interface NotificationBase {
  id: Id;
  userId: UserId;
  actorId: UserId;
  reviewId: Id;
  createdAt: DateTime;
  read: boolean;
}

export type Notification = NotificationBase & (
  | { type: 'new-review' }
  | { type: 'review-comment'; commentId: Id }
);
