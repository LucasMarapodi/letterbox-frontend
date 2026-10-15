import { gamePage } from './fixtures';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { HomePage } from '../src/pages/HomePage';
import { AppRoutes } from '../src/App';
import { services } from '../src/services';
import type { Game } from '../src/models';
import type { GameService, Services } from '../src/services/contracts';
import { deferred, makeGame } from './fixtures';

vi.mock('../src/services', () => ({ services: {
  games: { list: vi.fn<GameService['list']>().mockResolvedValue(gamePage([])), getById: vi.fn<GameService['getById']>().mockResolvedValue(null), getOpinions: vi.fn<GameService['getOpinions']>().mockResolvedValue({ averageRating: null, reviews: [] }) },
} } satisfies { services: Services }));

function renderHome(): void { render(<MemoryRouter><HomePage /></MemoryRouter>); }
beforeEach(() => {
  vi.mocked(services.games.list).mockReset().mockResolvedValue(gamePage([]));
  vi.mocked(services.games.getById).mockReset().mockResolvedValue(null);
});

test('visitante vê os jogos retornados com capa e link acessível', async () => {
  const games: Game[] = [makeGame(), makeGame({ id: 2, title: 'Segundo jogo' })];
  vi.mocked(services.games.list).mockResolvedValueOnce(gamePage(games));
  renderHome();
  expect(await screen.findByRole('link', { name: 'Jogo público' })).toHaveAttribute('href', '/jogos/1');
  expect(screen.getByRole('link', { name: 'Segundo jogo' })).toBeVisible();
  expect(screen.getAllByRole('article')).toHaveLength(2);
  expect(screen.getAllByAltText('')[0]).toHaveAttribute('src', '/capa.svg');
});

test('a listagem pendente anuncia carregamento e exibe os jogos após resolver', async () => {
  const pending = deferred<import('../src/services/contracts').GamePage>();
  vi.mocked(services.games.list).mockReturnValueOnce(pending.promise);
  renderHome();
  expect(screen.getByRole('status')).toHaveTextContent('Carregando jogos…');
  await act(async () => { pending.resolve(gamePage([makeGame()])); await pending.promise; });
  expect(screen.getByRole('link', { name: 'Jogo público' })).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('lista vazia informa ausência de jogos sem apresentar erro', async () => {
  vi.mocked(services.games.list).mockResolvedValueOnce(gamePage([]));
  renderHome();
  expect(await screen.findByText('Nenhum jogo disponível.')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('rejeição informa erro distinto e permite recuperar a listagem', async () => {
  const user = userEvent.setup();
  vi.mocked(services.games.list).mockRejectedValueOnce(new Error('Falha')).mockResolvedValueOnce(gamePage([makeGame()]));
  renderHome();
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os jogos.');
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByRole('link', { name: 'Jogo público' })).toBeVisible();
});

test('uma capa ausente continua permitindo consultar o jogo', async () => {
  const id = 3;
  vi.mocked(services.games.list).mockResolvedValueOnce(gamePage([makeGame({ id, coverUrl: null })]));
  renderHome();
  expect(await screen.findByRole('img', { name: 'Capa de Jogo público indisponível' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Jogo público' })).toHaveAttribute('href', `/jogos/${id}`);
});

test('busca por Enter envia o termo ao serviço e apresenta seus resultados', async () => {
  const user = userEvent.setup();
  vi.mocked(services.games.list).mockResolvedValueOnce(gamePage([makeGame()])).mockResolvedValueOnce(gamePage([makeGame({ title: 'Ecos' })]));
  renderHome();
  await screen.findByRole('link', { name: 'Jogo público' });
  await user.type(screen.getByRole('textbox', { name: 'Buscar jogos' }), 'Ecos{Enter}');
  expect(await screen.findByRole('link', { name: 'Ecos' })).toBeVisible();
  expect(services.games.list).toHaveBeenLastCalledWith({ term: 'Ecos', sort: 'name-asc', page: 1, pageSize: 20 });
  expect(screen.queryByRole('link', { name: 'Jogo público' })).not.toBeInTheDocument();
});

test('busca sem resultados informa ausência e limpar restaura a lista inicial', async () => {
  const user = userEvent.setup();
  vi.mocked(services.games.list).mockResolvedValueOnce(gamePage([makeGame()])).mockResolvedValueOnce(gamePage([])).mockResolvedValueOnce(gamePage([makeGame()]));
  renderHome();
  await screen.findByRole('link', { name: 'Jogo público' });
  const input = screen.getByRole('textbox', { name: 'Buscar jogos' });
  await user.type(input, 'inexistente');
  await user.click(screen.getByRole('button', { name: 'Buscar' }));
  expect(await screen.findByText('Nenhum jogo encontrado para esta busca.')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(await screen.findByRole('link', { name: 'Jogo público' })).toBeVisible();
  expect(input).toHaveValue('');
  expect(services.games.list).toHaveBeenLastCalledWith({ term: '', sort: 'release-desc', page: 1, pageSize: 20 });
});

test('resposta de uma consulta anterior não substitui os resultados atuais', async () => {
  const user = userEvent.setup();
  const pending = deferred<import('../src/services/contracts').GamePage>();
  vi.mocked(services.games.list).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(gamePage([makeGame({ title: 'Resultado atual' })]));
  renderHome();
  await user.type(screen.getByRole('textbox', { name: 'Buscar jogos' }), 'Atual{Enter}');
  await screen.findByRole('link', { name: 'Resultado atual' });
  await act(async () => { pending.resolve(gamePage([makeGame({ title: 'Resposta antiga' })])); await pending.promise; });
  expect(screen.getByRole('link', { name: 'Resultado atual' })).toBeVisible();
  expect(screen.queryByRole('link', { name: 'Resposta antiga' })).not.toBeInTheDocument();
});

test('ordenar mantém a busca submetida e limpar mantém a ordenação escolhida', async () => {
  const user = userEvent.setup();
  const alpha: Game = makeGame({ id: 1, title: 'Alpha game' });
  const zeta: Game = makeGame({ id: 2, title: 'Zeta game' });
  vi.mocked(services.games.list).mockResolvedValueOnce(gamePage([alpha, zeta])).mockResolvedValueOnce(gamePage([alpha, zeta])).mockResolvedValueOnce(gamePage([zeta, alpha])).mockResolvedValueOnce(gamePage([zeta, alpha]));
  renderHome();
  await screen.findByRole('link', { name: alpha.title });
  await user.type(screen.getByRole('textbox', { name: 'Buscar jogos' }), 'game{Enter}');
  await screen.findByRole('link', { name: alpha.title });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Ordenar por' }), 'name-desc');
  expect(services.games.list).toHaveBeenLastCalledWith({ term: 'game', sort: 'name-desc', page: 1, pageSize: 20 });
  expect(await screen.findAllByRole('article')).toHaveLength(2);
  expect(screen.getAllByRole('article')[0]).toHaveTextContent(zeta.title);
  expect(screen.getByRole('textbox', { name: 'Buscar jogos' })).toHaveValue('game');
  await user.click(screen.getByRole('button', { name: 'Limpar busca' }));
  await screen.findByRole('link', { name: alpha.title });
  expect(services.games.list).toHaveBeenLastCalledWith({ term: '', sort: 'name-desc', page: 1, pageSize: 20 });
  expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveValue('name-desc');
});

test.each(['.', '..', '~.', '~..'])('ID local de jogo inválido %s não é consultado', id => {
  render(<MemoryRouter initialEntries={['/jogos/' + encodeURIComponent(id)]}><AppRoutes /></MemoryRouter>);
  expect(screen.getByText('Jogo não encontrado.')).toBeVisible();
  expect(services.games.getById).not.toHaveBeenCalled();
});
