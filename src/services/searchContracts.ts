import type { GameId, UserId } from '../models';

export interface SearchPerson { id: UserId; username: string; displayName: string; avatarUrl: string | null; }
export interface SearchGame { id: GameId; title: string; coverUrl: string | null; summary: string; releaseDate: string | null; }
export interface SearchError { code: string; message: string; }
export interface SearchMetadata { fetchedAt: string; isStale: boolean; }
export type SearchGroup<T> =
  | { status: 'ready'; items: T[]; page: number; pageSize: 5 | 20; hasNextPage: boolean; error: null; metadata: SearchMetadata | null }
  | { status: 'unavailable'; items: T[]; page: null; pageSize: null; hasNextPage: null; error: SearchError; metadata: null }
  | { status: 'notRequested'; items: T[]; page: null; pageSize: null; hasNextPage: null; error: null; metadata: null };
export interface SearchResponse { query: string; people: SearchGroup<SearchPerson>; games: SearchGroup<SearchGame>; error: SearchError | null; }
export type SearchScope = 'all' | 'people' | 'games';
export interface SearchQuery { q: string; mode: 'suggestions' | 'results'; scope: SearchScope; page: number; }
export interface SearchService { search(query: SearchQuery, signal?: AbortSignal): Promise<SearchResponse>; }
export function validSearchTerm(value: string): boolean { const term = value.trim(); return term.length >= 3 && term.length <= 200 && !/\p{Cc}/u.test(term); }
