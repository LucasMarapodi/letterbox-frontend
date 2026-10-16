import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { community } from '../src/services/community';
import { createMockCommunityService } from './doubles/communityService';
import type { RankedGame } from '../src/services/communityContracts';
import { rankingNow, rankingReviews, rankingComments } from './ranking-fixtures';
import { deferred } from './fixtures';
afterEach(() => vi.restoreAllMocks());
function service(): ReturnType<typeof createMockCommunityService> { return createMockCommunityService({ reviews: rankingReviews, comments: rankingComments, clock: () => new Date(rankingNow) }); }
test('agrega reviews por jogo uma vez e filtra janela sem contaminar outros jogos', async () => {
  const mock = service();
  expect((await mock.getGamesInDiscussion('24h')).map((item) => [item.game.id, item.commentCount])).toEqual([['game-1',2],['game-2',1]]);
  expect((await mock.getGamesInDiscussion('7d')).map((item) => [item.game.id, item.commentCount])).toEqual([['game-1',4],['game-2',1]]);
  expect((await mock.getGamesInDiscussion('30d')).map((item) => [item.game.id, item.commentCount])).toEqual([['game-1',4],['game-2',2]]);
});
test('desempata por último comentário e ID e mantém jogo sem capa', async () => {
  const mock = createMockCommunityService({ reviews: rankingReviews, comments: [
    { ...rankingComments[0], reviewId: 'a' }, { ...rankingComments[0], id: 'tie', reviewId: 'c' },
    { ...rankingComments[0], id: 'later', reviewId: 'd', createdAt: new Date(rankingNow).toISOString() },
  ], clock: () => new Date(rankingNow) });
  const results = await mock.getGamesInDiscussion('7d');
  expect(results.map((item) => item.game.id)).toEqual(['game-3','game-1','game-2']);
  vi.spyOn(community, 'getGamesInDiscussion').mockResolvedValue(results);
  const interaction = await open();
  expect(await screen.findByText('Sem capa')).toBeVisible();
  const cards = within(screen.getByRole('region', { name: 'Jogos em discussão' })).getAllByRole('article');
  expect(within(cards[0]).getByText('1 comentário no período')).toBeVisible();
  await interaction.click(within(cards[0]).getByRole('link'));
  expect(await screen.findByRole('heading', { name: 'Atlas de Cinzas', level: 2 })).toBeVisible();
});
async function open(): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup(); render(<MemoryRouter initialEntries={['/comunidade']}><AppRoutes /></MemoryRouter>);
  await interaction.click(screen.getByRole('button', { name: 'Jogos em discussão' })); return interaction;
}
test('erro recuperação vazio e alteração de período', async () => {
  const get = vi.spyOn(community, 'getGamesInDiscussion').mockRejectedValueOnce(new Error('Falha')).mockResolvedValue([]);
  const interaction = await open();
  await screen.findByText('Não foi possível carregar os jogos em discussão.');
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Nenhum jogo com comentários neste período.')).toBeVisible();
  get.mockImplementation(service().getGamesInDiscussion);
  await interaction.selectOptions(screen.getByRole('combobox'), '24h');
  expect(await screen.findByText('2 comentários no período')).toBeVisible();
});
test('descarta resposta de período antigo', async () => {
  const pending = deferred<RankedGame[]>();
  vi.spyOn(community, 'getGamesInDiscussion').mockReturnValueOnce(pending.promise).mockResolvedValue([]);
  const interaction = await open();
  expect(screen.getByText('Carregando jogos em discussão…')).toBeVisible();
  await interaction.selectOptions(screen.getByRole('combobox'), '24h');
  await screen.findByText('Nenhum jogo com comentários neste período.');
  await act(async () => { pending.resolve(await service().getGamesInDiscussion('7d')); await pending.promise; });
  expect(screen.queryByText('Ecos do Horizonte')).not.toBeInTheDocument();
});
