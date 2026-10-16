import type { Game } from '../src/models';

export function makeGame(overrides: Partial<Game> = {}): Game {
  return { id: 'game-1', title: 'Jogo público', summary: 'Uma aventura.', coverUrl: '/capa.svg', genres: ['Aventura'], platforms: ['PC'], releaseDate: '2024-04-12', averageRating: null, ...overrides };
}

export interface Deferred<T> { promise: Promise<T>; resolve: (value: T) => void; }
export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise: Promise<T> = new Promise((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}
