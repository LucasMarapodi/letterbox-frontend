import { expectTypeOf, test } from 'vitest';
import type { User, Game, Rating, Review, Comment, Favorite, Notification } from '../src/models';

test('representa usuários e jogos com contratos provisórios verificáveis', () => {
  const user = { id: 1, username: 'jogador', displayName: 'Jogador', bio: '', avatarUrl: null } satisfies User;
  const game = { id: 1, igdbId: 345447, title: 'Jogo de exemplo', summary: 'Uma aventura.', coverUrl: null, genres: ['Aventura'], platforms: ['PC'], releaseDate: null, averageRating: null } satisfies Game;
  expectTypeOf(user).toExtend<User>();
  expectTypeOf(game).toExtend<Game>();
  // @ts-expect-error O identificador de usuário deve ser numérico.
  const invalidUser: User = { ...user, id: '1' };
  // @ts-expect-error Gêneros são uma lista de nomes, não uma string.
  const invalidGame: Game = { ...game, genres: 'Aventura' };
  void invalidUser;
  void invalidGame;
});

test('representa notas, reviews e comentários com nota nullable apenas para reviews legadas', () => {
  const rating = { id: 1, userId: 1, gameId: 1, value: 0 } satisfies Rating;
  const review = { id: 1, userId: 1, gameId: 1, likeCount: 0, rating: 4, text: 'Gostei.', createdAt: '2026-01-01T00:00:00Z', updatedAt: null } satisfies Review;
  const comment = { id: 1, userId: 2, reviewId: 1, parentCommentId: null, likeCount: 0, text: 'Concordo.', createdAt: '2026-01-02T00:00:00Z' } satisfies Comment;
  expectTypeOf(rating).toExtend<Rating>();
  expectTypeOf(review).toExtend<Review>();
  expectTypeOf(comment).toExtend<Comment>();
  // @ts-expect-error Nota deve ser numérica; granularidade ainda não definida.
  const invalidRating: Rating = { ...rating, value: '5' };
  // @ts-expect-error Texto da review deve ser string.
  const invalidReview: Review = { ...review, text: null };
  // @ts-expect-error Comentário pertence a uma review por identificador numérico.
  const invalidComment: Comment = { ...comment, reviewId: '42' };
  void invalidRating;
  void invalidReview;
  void invalidComment;
});

test('distingue favoritos e os dois eventos de notificação previstos', () => {
  const gameFavorite = { id: 1, userId: 1, targetType: 'game', targetId: 1 } satisfies Favorite;
  const reviewFavorite = { ...gameFavorite, id: 2, targetType: 'review', targetId: 1 } satisfies Favorite;
  const reviewNotification = { id: 1, userId: 1, actorId: 2, type: 'new-review', reviewId: 1, createdAt: '2026-01-01T00:00:00Z', read: false } satisfies Notification;
  const commentNotification = { ...reviewNotification, type: 'review-comment', commentId: 1 } satisfies Notification;
  expectTypeOf(gameFavorite).toExtend<Favorite>();
  expectTypeOf(reviewFavorite).toExtend<Favorite>();
  expectTypeOf(reviewNotification).toExtend<Notification>();
  expectTypeOf(commentNotification).toExtend<Notification>();
  // @ts-expect-error Like não é um tipo de favorito permitido.
  const invalidFavorite: Favorite = { ...gameFavorite, targetType: 'like' };
  // @ts-expect-error Notificação de comentário exige identificar o comentário.
  const invalidNotification: Notification = { ...reviewNotification, type: 'review-comment' };
  void invalidFavorite;
  void invalidNotification;
});
