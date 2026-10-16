import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import App from '../src/App';
import { gamePage } from './fixtures';
import type { Services } from '../src/services/contracts';

vi.mock('../src/services', () => ({
  services: {
    games: {
      async getFilters() { return { genres: [], platforms: [] }; },
      async list() { return gamePage(); },
      async getById(): Promise<null> { return null; },
      async getOpinions() { return { averageRating: null, reviews: [] }; },
    },
  },
} satisfies { services: Services }));

test('a página inicial apresenta um título acessível', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Game Reviews', level: 1 })).toBeVisible();
});

test('a Home oferece o catálogo público no lugar da prévia técnica', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Jogos', level: 2 })).toBeVisible();
  expect(await screen.findByText('Nenhum jogo disponível.')).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Prévia dos componentes' })).not.toBeInTheDocument();
});
