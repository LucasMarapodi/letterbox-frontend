/** Identificador opaco em string apenas para os mocks; a API real poderá alterá-lo. */
export type Id = string;
/** Datas dos mocks em formato ISO; não constitui formato definitivo da API. */
export type DateTime = string;

export interface User {
  id: Id;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
}

export interface Game {
  id: Id;
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
  userId: Id;
  gameId: Id;
  /** Faixa do produto: 0–5. Incrementos e validação pertencem às US futuras. */
  value: number;
}

export interface Review {
  id: Id;
  userId: Id;
  gameId: Id;
  text: string;
  createdAt: DateTime;
  updatedAt: DateTime | null;
}

export interface Comment {
  id: Id;
  userId: Id;
  reviewId: Id;
  text: string;
  createdAt: DateTime;
}

export interface Favorite {
  id: Id;
  userId: Id;
  targetType: 'game' | 'review';
  targetId: Id;
}

interface NotificationBase {
  id: Id;
  userId: Id;
  actorId: Id;
  reviewId: Id;
  createdAt: DateTime;
  read: boolean;
}

export type Notification = NotificationBase & (
  | { type: 'new-review' }
  | { type: 'review-comment'; commentId: Id }
);
