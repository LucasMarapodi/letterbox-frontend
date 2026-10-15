import { isLocalId, type LocalId } from '../../models';
import type { PublicProfile, Connections } from '../communityContracts';
import type { PublicUserResponse, GameResponse, GamePageResponse, ReviewResponse, CommentResponse, RatingResponse, FavoriteResponse, NotificationResponse, LoginResponse, DashboardResponse, GameOpinionsResponse, FavoriteListsResponse, RankedReviewResponse, RankedGameResponse } from './dtos';
import { HttpFailure } from './client';
export type Decoder<T> = (value: unknown) => T;
export function decodeGamePage(value: unknown): GamePageResponse {
  const item = record(value);
  const { page, pageSize, hasNextPage } = item;
  if (typeof page !== 'number' || !Number.isSafeInteger(page) || page < 1 ||
      typeof pageSize !== 'number' || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
      typeof hasNextPage !== 'boolean') return fail();
  const items = decodeList(item.items, decodeGame);
  if (items.length > pageSize) return fail();
  return { items, page, pageSize, hasNextPage };
}
function fail(): never { throw new HttpFailure('contract'); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function record(value: unknown): Record<string, unknown> { if (!isRecord(value)) return fail(); return value; }
function publicRecord(value: unknown): Record<string, unknown> {
  const item = record(value);
  if (['password','passwordHash','hash','token','email'].some((key) => key in item)) return fail();
  return item;
}
function text(value: unknown): string { return typeof value === 'string' ? value : fail(); }
function id(value: unknown): string { const result = text(value); return result.length ? result : fail(); }
function nullable<T>(value: unknown, decode: Decoder<T>): T | null { return value === null ? null : decode(value); }
function localId(value: unknown): LocalId { return isLocalId(value) ? value : fail(); }
function externalId(value: unknown): number { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : fail(); }
function favoriteTargetId(value: unknown): number {
  if (isLocalId(value)) return value;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return fail();
  return localId(Number(value));
}
function score(value: unknown): number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5 ? value : fail(); }
function count(value: unknown): number { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : fail(); }
function likeCount(value: unknown): number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 2_147_483_647 ? value : fail(); }
function date(value: unknown): string {
  const result = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) return fail();
  const parsed = new Date(`${result}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === result ? result : fail();
}
function instant(value: unknown): string {
  const result = text(value);
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})$/.test(result) || !Number.isFinite(Date.parse(result))) return fail();
  date(result.slice(0, 10));
  return result;
}
function author(value: unknown): ReviewResponse['author'] { const item = publicRecord(value); return { id: localId(item.id), displayName: text(item.displayName), avatarUrl: nullable(item.avatarUrl, text) }; }
export function decodeUser(value: unknown): PublicUserResponse {
  const item = publicRecord(value); return { id: localId(item.id), username: text(item.username), displayName: text(item.displayName), bio: text(item.bio), avatarUrl: nullable(item.avatarUrl, text) };
}
export function decodeGame(value: unknown): GameResponse {
  const item = publicRecord(value); return { id: localId(item.id), igdbId: externalId(item.igdbId), title: text(item.title), summary: text(item.summary), coverUrl: nullable(item.coverUrl, text), genres: decodeList(item.genres, text), platforms: decodeList(item.platforms, text), releaseDate: nullable(item.releaseDate, date), averageRating: nullable(item.averageRating, score) };
}
export function decodeReview(value: unknown): ReviewResponse {
  const item = publicRecord(value); const game = publicRecord(item.game);
  return { id: localId(item.id), userId: localId(item.userId), gameId: localId(item.gameId), text: text(item.text), createdAt: instant(item.createdAt), updatedAt: nullable(item.updatedAt, instant), author: author(item.author), game: { id: localId(game.id), title: text(game.title), coverUrl: nullable(game.coverUrl, text) } };
}
export function decodeComment(value: unknown): CommentResponse {
  const item = publicRecord(value); return { id: localId(item.id), userId: localId(item.userId), reviewId: localId(item.reviewId), parentCommentId: nullable(item.parentCommentId, localId), likeCount: likeCount(item.likeCount), text: text(item.text), createdAt: instant(item.createdAt), author: author(item.author) };
}
export function decodeRating(value: unknown): RatingResponse {
  const item = publicRecord(value); return { id: localId(item.id), userId: localId(item.userId), gameId: localId(item.gameId), value: score(item.value) };
}
export function decodeFavorite(value: unknown): FavoriteResponse {
  const item = publicRecord(value); const targetType = item.targetType;
  if (targetType !== 'game' && targetType !== 'review') return fail();
  return { id: id(item.id), userId: localId(item.userId), targetId: favoriteTargetId(item.targetId), targetType };
}
export function decodeNotification(value: unknown): NotificationResponse {
  const item = publicRecord(value);
  const base = { id: id(item.id), userId: localId(item.userId), actorId: localId(item.actorId), reviewId: localId(item.reviewId), createdAt: instant(item.createdAt), actor: author(item.actor) };
  if (item.type === 'new-review' && !('commentId' in item)) return { ...base, type: 'new-review' };
  if (item.type === 'review-comment') return { ...base, type: 'review-comment', commentId: localId(item.commentId) };
  return fail();
}
export function decodeLogin(value: unknown): LoginResponse { const item = record(value); return { token: id(item.token), expiresAt: instant(item.expiresAt), user: decodeUser(item.user) }; }
export function decodeDashboard(value: unknown): DashboardResponse { const item = record(value); return { favorites: decodeFavoriteLists(item.favorites), feed: decodeList(item.feed, decodeReview) }; }
export function decodeOpinions(value: unknown): GameOpinionsResponse { const item = record(value); return { averageRating: nullable(item.averageRating, score), reviews: decodeList(item.reviews, decodeReview) }; }
export function decodeFavoriteLists(value: unknown): FavoriteListsResponse { const item = record(value); return { games: decodeList(item.games, decodeGame), reviews: decodeList(item.reviews, decodeReview) }; }
export function decodeRankedReview(value: unknown): RankedReviewResponse { const item = record(value); return { review: decodeReview(item.review), commentCount: count(item.commentCount), lastCommentAt: instant(item.lastCommentAt) }; }
export function decodeRankedGame(value: unknown): RankedGameResponse { const item = record(value); return { game: decodeGame(item.game), commentCount: count(item.commentCount), lastCommentAt: instant(item.lastCommentAt) }; }
export function unwrapRating(value: unknown): RatingResponse | null { return nullable(record(value).rating, decodeRating); }
export function unwrapReview(value: unknown): ReviewResponse | null { return nullable(record(value).review, decodeReview); }
export function unwrapFavorite(value: unknown): FavoriteResponse | null { return nullable(record(value).favorite, decodeFavorite); }
export function unwrapFollowing(value: unknown): boolean { const result = record(value).following; return typeof result === 'boolean' ? result : fail(); }
export function decodeList<T>(value: unknown, item: Decoder<T>): T[] { return Array.isArray(value) ? value.map((entry: unknown) => item(entry)) : fail(); }
export function composeProfile(user: unknown, reviews: unknown): PublicProfile { return { user: decodeUser(user), reviews: decodeList(reviews, decodeReview) }; }
export function composeConnections(followers: unknown, following: unknown): Connections { return { followers: decodeList(followers, decodeUser), following: decodeList(following, decodeUser) }; }
