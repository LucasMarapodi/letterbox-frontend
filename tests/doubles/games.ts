import type { Game } from '../../src/models';

/** Jogos fictícios para a fundação; não representam dados consultados na IGDB. */
export const gameFixtures: Game[] = [
  {
    id: 1, igdbId: 1,
    title: 'Ecos do Horizonte',
    summary: 'Explore os caminhos de um mundo fictício.',
    coverUrl: '/covers/horizonte.svg',
    genres: ['Aventura'],
    platforms: ['PC'],
    releaseDate: '2024-04-12',
    averageRating: null,
  },
  {
    id: 2, igdbId: 2, title: 'Circuito Aurora', summary: 'Corridas noturnas em circuitos de uma cidade fictícia.', coverUrl: '/covers/aurora.svg', genres: ['Corrida'], platforms: ['PC', 'Console'], releaseDate: '2025-02-20', averageRating: null,
  },
  {
    id: 3, igdbId: 3, title: 'Atlas de Cinzas', summary: 'Descubra histórias esquecidas em uma aventura de fantasia.', coverUrl: null, genres: ['RPG', 'Aventura'], platforms: ['PC'], releaseDate: null, averageRating: null,
  },
];
