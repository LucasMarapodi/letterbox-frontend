import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { HomePage } from '../src/pages/HomePage';
import { services } from '../src/services';
import type { Game, Id } from '../src/models';
import type { GameService, Services } from '../src/services/contracts';
import { deferred, makeGame } from './fixtures';

vi.mock('../src/services', () => ({ services: {
  games: { list: vi.fn<GameService['list']>().mockResolvedValue([]), getById: vi.fn<GameService['getById']>().mockResolvedValue(null) },
} } satisfies { services: Services }));

function renderHome(): void { render(<MemoryRouter><HomePage /></MemoryRouter>); }

test('visitante vê os jogos retornados com capa e link acessível', async () => {
  const games: Game[] = [makeGame(), makeGame({ id: 'game-2', title: 'Segundo jogo' })];
  vi.mocked(services.games.list).mockResolvedValueOnce(games);
  renderHome();
  expect(await screen.findByRole('link', { name: 'Jogo público' })).toHaveAttribute('href', '/jogos/game-1');
  expect(screen.getByRole('link', { name: 'Segundo jogo' })).toBeVisible();
  expect(screen.getAllByRole('article')).toHaveLength(2);
  expect(screen.getAllByAltText('')[0]).toHaveAttribute('src', '/capa.svg');
});

test('a listagem pendente anuncia carregamento e exibe os jogos após resolver', async () => {
  const pending = deferred<Game[]>();
  vi.mocked(services.games.list).mockReturnValueOnce(pending.promise);
  renderHome();
  expect(screen.getByRole('status')).toHaveTextContent('Carregando jogos…');
  await act(async () => { pending.resolve([makeGame()]); await pending.promise; });
  expect(screen.getByRole('link', { name: 'Jogo público' })).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('lista vazia informa ausência de jogos sem apresentar erro', async () => {
  vi.mocked(services.games.list).mockResolvedValueOnce([]);
  renderHome();
  expect(await screen.findByText('Nenhum jogo disponível.')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('rejeição informa erro distinto e permite recuperar a listagem', async () => {
  const user = userEvent.setup();
  vi.mocked(services.games.list).mockRejectedValueOnce(new Error('Falha')).mockResolvedValueOnce([makeGame()]);
  renderHome();
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os jogos.');
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByRole('link', { name: 'Jogo público' })).toBeVisible();
});

test('uma capa ausente continua permitindo consultar o jogo', async () => {
  const id: Id = 'sem-capa';
  vi.mocked(services.games.list).mockResolvedValueOnce([makeGame({ id, coverUrl: null })]);
  renderHome();
  expect(await screen.findByRole('img', { name: 'Capa de Jogo público indisponível' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Jogo público' })).toHaveAttribute('href', `/jogos/${id}`);
});
