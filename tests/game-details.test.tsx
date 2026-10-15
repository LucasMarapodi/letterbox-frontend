import { gamePage } from './fixtures';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { services } from '../src/services';
import type { Game } from '../src/models';
import type { GameService, Services } from '../src/services/contracts';
import { deferred, makeGame } from './fixtures';

vi.mock('../src/services', () => ({ services: {
  games: { list: vi.fn<GameService['list']>(), getById: vi.fn<GameService['getById']>(), getOpinions: vi.fn<GameService['getOpinions']>() },
} } satisfies { services: Services }));

beforeEach(() => {
  vi.mocked(services.games.list).mockReset().mockResolvedValue(gamePage([]));
  vi.mocked(services.games.getById).mockReset().mockResolvedValue(null);
  vi.mocked(services.games.getOpinions).mockReset().mockResolvedValue({ averageRating: null, reviews: [] });
});

function renderDetails(id: number = 1): void {
  render(<MemoryRouter initialEntries={[`/jogos/${encodeURIComponent(id)}`]}><AppRoutes /></MemoryRouter>);
}

test('visitante consulta todos os campos do jogo completo sem sessão', async () => {
  const game: Game = makeGame();
  vi.mocked(services.games.getById).mockResolvedValueOnce(game);
  renderDetails();
  expect(await screen.findByRole('heading', { name: game.title })).toBeVisible();
  expect(screen.getByRole('img', { name: `Capa de ${game.title}` })).toHaveAttribute('src', game.coverUrl);
  expect(screen.getByText(game.summary)).toBeVisible();
  expect(screen.getByText('Aventura')).toBeVisible();
  expect(screen.getByText('PC')).toBeVisible();
  expect(screen.getByText('12/04/2024')).toBeVisible();
  expect(services.games.getById).toHaveBeenCalledWith(1);
});

test('jogo parcial mostra alternativas para os campos ausentes', async () => {
  const game: Game = makeGame({ summary: '', coverUrl: null, genres: [], platforms: [], releaseDate: null });
  vi.mocked(services.games.getById).mockResolvedValueOnce(game);
  renderDetails();
  await screen.findByRole('heading', { name: game.title });
  expect(screen.getByRole('img', { name: `Capa de ${game.title} indisponível` })).toBeVisible();
  expect(screen.getByText('Descrição indisponível.')).toBeVisible();
  expect(screen.getByText('Gêneros não informados.')).toBeVisible();
  expect(screen.getByText('Plataformas não informadas.')).toBeVisible();
  expect(screen.getByText('Lançamento não informado.')).toBeVisible();
});

test('detalhes mostram Sem capa quando a URL da imagem falha', async () => {
  vi.mocked(services.games.getById).mockResolvedValueOnce(makeGame());
  renderDetails();
  fireEvent.error(await screen.findByRole('img', { name: 'Capa de Jogo público' }));
  expect(screen.getByRole('img', { name: 'Capa de Jogo público indisponível' })).toHaveTextContent('Sem capa');
  expect(screen.getByRole('heading', { name: 'Jogo público' })).toBeVisible();
});

test('jogo inexistente é distinto de dados parciais', async () => {
  renderDetails(999);
  expect(await screen.findByText('Jogo não encontrado.')).toBeVisible();
  expect(screen.queryByText('Descrição indisponível.')).not.toBeInTheDocument();
});

test('a leitura dos detalhes anuncia carregamento até resolver', async () => {
  const pending = deferred<Game | null>();
  vi.mocked(services.games.getById).mockReturnValueOnce(pending.promise);
  renderDetails();
  expect(screen.getByRole('status')).toHaveTextContent('Carregando jogo…');
  await act(async () => { pending.resolve(makeGame()); await pending.promise; });
  expect(screen.getByRole('heading', { name: 'Jogo público' })).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('erro do serviço não é tratado como inexistência e permite recuperação', async () => {
  const user = userEvent.setup();
  vi.mocked(services.games.getById).mockRejectedValueOnce(new Error('Falha')).mockResolvedValueOnce(makeGame());
  renderDetails();
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o jogo.');
  expect(screen.queryByText('Jogo não encontrado.')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByRole('heading', { name: 'Jogo público' })).toBeVisible();
});

test('o ID com %2F literal chega intacto à consulta do serviço', async () => {
  const id = 42;
  vi.mocked(services.games.getById).mockResolvedValueOnce(makeGame({ id }));
  renderDetails(id);
  await screen.findByRole('heading', { name: 'Jogo público' });
  expect(services.games.getById).toHaveBeenCalledWith(id);
});

test('trocar o ID carrega o novo jogo e ignora a resposta antiga', async () => {
  const user = userEvent.setup();
  const pending = deferred<Game | null>();
  vi.mocked(services.games.getById).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(makeGame({ id: 2, title: 'Novo jogo' }));
  render(<MemoryRouter initialEntries={['/jogos/1']}>
    <Link to="/jogos/2">Outro jogo</Link><AppRoutes />
  </MemoryRouter>);
  await user.click(screen.getByRole('link', { name: 'Outro jogo' }));
  await screen.findByRole('heading', { name: 'Novo jogo' });
  await act(async () => { pending.resolve(makeGame()); await pending.promise; });
  expect(screen.getByRole('heading', { name: 'Novo jogo' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Jogo público' })).not.toBeInTheDocument();
  expect(services.games.getById).toHaveBeenLastCalledWith(2);
});
