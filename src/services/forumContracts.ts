export interface ForumAuthor { id: number; username: string; displayName: string; avatarUrl: string | null; }
export interface ForumTopic { id: number; gameId: number; title: string; author: ForumAuthor; createdAt: string; replyCount: number; lastActivityAt: string; }
export interface ForumPage<T> { items: T[]; page: number; pageSize: 20; hasNextPage: boolean; }
export function forumPageNumber(value: string | null): number {
  const page = value && /^[1-9]\d*$/.test(value) ? Number(value) : 1;
  return Number.isSafeInteger(page) && (page - 1) * 20 <= 2_147_483_647 ? page : 1;
}
