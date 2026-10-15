import { gamePage } from './fixtures';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { services } from '../src/services';
import type { GameOpinions, GameService, PublicReview, Services } from '../src/services/contracts';
import { deferred, makeGame } from './fixtures';

vi.mock('../src/services', () => ({ services: {
  games: { list: vi.fn<GameService['list']>(), getById: vi.fn<GameService['getById']>(), getOpinions: vi.fn<GameService['getOpinions']>() },
} } satisfies { services: Services }));

const review: PublicReview = { id: 'review%2F1', gameId: 1, userId: 1, text: 'Uma experiência memorável.', createdAt: '2026-01-01T00:00:00Z', updatedAt: null, author: { id: 1, displayName: 'Ana', avatarUrl: null } };

beforeEach(() => {
  vi.mocked(services.games.list).mockReset().mockResolvedValue(gamePage([]));
  vi.mocked(services.games.getById).mockReset().mockResolvedValue(makeGame());
  vi.mocked(services.games.getOpinions).mockReset().mockResolvedValue({ averageRating: null, reviews: [] });
});
function renderGame(): void { render(<MemoryRouter initialEntries={['/jogos/1']}><AppRoutes /></MemoryRouter>); }

test('média zero fornecida pelo serviço é uma nota válida', async () => {
  vi.mocked(services.games.getOpinions).mockResolvedValueOnce({ averageRating: 0, reviews: [] });
  renderGame();
  expect(await screen.findByText('Nota média: 0 de 5')).toBeVisible();
  expect(screen.queryByText('Ainda sem avaliações.')).not.toBeInTheDocument();
  expect(services.games.getOpinions).toHaveBeenCalledWith(1);
});

test('ausência de média não aparece como zero e reviews vazias são informadas', async () => {
  renderGame();
  expect(await screen.findByText('Ainda sem avaliações.')).toBeVisible();
  expect(screen.getByText('Nenhuma review publicada para este jogo.')).toBeVisible();
  expect(screen.queryByText('Nota média: 0 de 5')).not.toBeInTheDocument();
});

test('a página exibe a média fornecida sem calculá-la a partir das reviews', async () => {
  vi.mocked(services.games.getOpinions).mockResolvedValueOnce({ averageRating: 4.25, reviews: [review] });
  renderGame();
  expect(await screen.findByText('Nota média: 4,25 de 5')).toBeVisible();
  expect(screen.getByText(review.text)).toBeVisible();
  expect(screen.getByRole('link', { name: 'Review de Ana' })).toHaveAttribute('href', '/reviews/review%252F1');
  expect(screen.getByRole('link', { name: 'Ana' })).toHaveAttribute('href', '/perfil/1');
});

test('o link da review navega até seu conteúdo com ID preservado', async () => {
  const user = userEvent.setup();
  vi.mocked(services.games.getOpinions).mockResolvedValueOnce({ averageRating: null, reviews: [review] });
  renderGame();
  await user.click(await screen.findByRole('link', { name: 'Review de Ana' }));
  expect(screen.getByRole('heading', { name: 'Review', level: 1 })).toBeVisible();
  expect(screen.getByText('ID da review: review%2F1')).toBeVisible();
});

test('o link do autor navega ao perfil público com ID preservado', async () => {
  const user = userEvent.setup();
  vi.mocked(services.games.getOpinions).mockResolvedValueOnce({ averageRating: null, reviews: [review] });
  renderGame();
  await user.click(await screen.findByRole('link', { name: 'Ana' }));
  expect(screen.getByRole('heading', { name: 'Perfil público', level: 1 })).toBeVisible();
  expect(screen.getByText('ID do usuário: 1')).toBeVisible();
});

test('opiniões pendentes anunciam carregamento sem ocultar dados do jogo', async () => {
  const pending = deferred<GameOpinions>();
  vi.mocked(services.games.getOpinions).mockReturnValueOnce(pending.promise);
  renderGame();
  await screen.findByRole('heading', { name: 'Jogo público' });
  expect(screen.getByRole('status')).toHaveTextContent('Carregando avaliações…');
  await act(async () => { pending.resolve({ averageRating: null, reviews: [] }); await pending.promise; });
  expect(screen.getByText('Ainda sem avaliações.')).toBeVisible();
});

test('erro nas opiniões preserva informações do jogo e permite tentar novamente', async () => {
  const user = userEvent.setup();
  vi.mocked(services.games.getOpinions).mockRejectedValueOnce(new Error('Falha')).mockResolvedValueOnce({ averageRating: 3, reviews: [] });
  renderGame();
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as avaliações.');
  expect(screen.getByRole('heading', { name: 'Jogo público' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Nota média: 3 de 5')).toBeVisible();
});
