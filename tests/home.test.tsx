import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import App from '../src/App';
import type { Game } from '../src/models';
import type { Services } from '../src/services/contracts';

vi.mock('../src/services', () => ({
  services: {
    games: {
      async list(): Promise<Game[]> { return []; },
      async getById(): Promise<null> { return null; },
    },
  },
} satisfies { services: Services }));

test('a página inicial apresenta um título acessível', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Game Reviews', level: 1 })).toBeVisible();
});

test('a Home oferece o primeiro uso dos componentes em uma prévia explícita', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Prévia dos componentes', level: 2 })).toBeVisible();
  expect(await screen.findByText('Nenhum jogo de exemplo disponível.')).toBeVisible();
});
