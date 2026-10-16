import type { Game } from '../src/models';
import type { GamePage } from '../src/services/contracts';
export function gamePage(items: Game[] = []): GamePage { return { items, page: 1, pageSize: 20, hasNextPage: false }; }

export function makeGame(overrides: Partial<Game> = {}): Game {
  return { id: 'game-1', title: 'Jogo público', summary: 'Uma aventura.', coverUrl: '/capa.svg', genres: ['Aventura'], platforms: ['PC'], releaseDate: '2024-04-12', averageRating: null, ...overrides };
}

export interface Deferred<T> { promise: Promise<T>; resolve: (value: T) => void; }
export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise: Promise<T> = new Promise((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}
