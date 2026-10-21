import { isLocalId } from '../../models';
import type { ForumAuthor, ForumPage, ForumTopic } from '../forumContracts';
import { HttpFailure } from './client';

function invalid(): never { throw new HttpFailure('contract'); }
export function forumRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : invalid();
}
export function forumId(value: unknown): number { return isLocalId(value) ? value : invalid(); }
export function forumText(value: unknown): string { return typeof value === 'string' && value.trim() ? value : invalid(); }
export function forumDate(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? value : invalid();
}
export function forumAuthor(value: unknown): ForumAuthor {
  const item = forumRecord(value);
  return { id: forumId(item.id), username: forumText(item.username), displayName: forumText(item.displayName), avatarUrl: item.avatarUrl === null ? null : forumText(item.avatarUrl) };
}
export function decodeForumTopic(value: unknown, gameId?: number): ForumTopic {
  const item = forumRecord(value);
  const result = { id: forumId(item.id), gameId: forumId(item.gameId), title: forumText(item.title), author: forumAuthor(item.author), createdAt: forumDate(item.createdAt), replyCount: item.replyCount, lastActivityAt: forumDate(item.lastActivityAt) };
  if (typeof result.replyCount !== 'number' || !Number.isSafeInteger(result.replyCount) || result.replyCount < 0 || (gameId !== undefined && result.gameId !== gameId)) return invalid();
  return { ...result, replyCount: result.replyCount };
}
export function decodeForumPage<T extends { id: number }>(value: unknown, page: number, decode: (value: unknown) => T): ForumPage<T> {
  const item = forumRecord(value);
  if (item.page !== page || item.pageSize !== 20 || typeof item.hasNextPage !== 'boolean' || !Array.isArray(item.items) || item.items.length > 20) return invalid();
  const items = item.items.map(decode);
  if (new Set(items.map(item => item.id)).size !== items.length || (!items.length && item.hasNextPage)) return invalid();
  return { items, page, pageSize: 20, hasNextPage: item.hasNextPage };
}
