import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { community } from '../src/services/community';
import { createMockCommunityService } from './doubles/communityService';
import type { RankedReview } from '../src/services/communityContracts';
import { rankingNow, rankingReviews, rankingComments } from './ranking-fixtures';
import { deferred } from './fixtures';
afterEach(() => vi.restoreAllMocks());
function service(): ReturnType<typeof createMockCommunityService> { return createMockCommunityService({ reviews: rankingReviews, comments: rankingComments, clock: () => new Date(rankingNow) }); }
test('ranking conta comentários elegíveis em reviews antigas com desempates e períodos', async () => {
  const mock = service();
  expect((await mock.getMostCommented('24h')).map((item) => [item.review.id, item.commentCount])).toEqual([[1,1],[3,1],[2,1]]);
  expect((await mock.getMostCommented('7d')).map((item) => [item.review.id, item.commentCount])).toEqual([[1,2],[2,2],[3,1]]);
  expect((await mock.getMostCommented('30d')).map((item) => [item.review.id, item.commentCount])).toEqual([[1,2],[3,2],[2,2]]);
  expect(await createMockCommunityService({ comments: [], clock: () => new Date(rankingNow) }).getMostCommented('7d')).toEqual([]);
});
async function open(): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/comunidade']}><AppRoutes /></MemoryRouter>);
  await interaction.click(screen.getByRole('button', { name: 'Mais comentadas' })); return interaction;
}
test('mostra contagem do período e altera resultados ao mudar seleção', async () => {
  vi.spyOn(community, 'getMostCommented').mockImplementation(service().getMostCommented);
  const interaction = await open();
  const section = screen.getByRole('region', { name: 'Reviews mais comentadas' });
  const cards = await within(section).findAllByRole('article');
  expect(within(cards[0]).getByText('2 comentários no período')).toBeVisible();
  expect(within(cards[0]).getByText('Review antiga A')).toBeVisible();
  await interaction.selectOptions(screen.getByRole('combobox'), '24h');
  expect(await screen.findAllByText('1 comentário no período')).toHaveLength(3);
});
test('carregamento erro recuperação e vazio', async () => {
  vi.spyOn(community, 'getMostCommented').mockRejectedValueOnce(new Error('Falha')).mockResolvedValue([]);
  const interaction = await open();
  expect(await screen.findByText('Não foi possível carregar as reviews mais comentadas.')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Nenhuma review com comentários neste período.')).toBeVisible();
});
test('resposta antiga não substitui período atual', async () => {
  const pending = deferred<RankedReview[]>();
  vi.spyOn(community, 'getMostCommented').mockReturnValueOnce(pending.promise).mockResolvedValue([]);
  const interaction = await open();
  expect(screen.getByText('Carregando reviews mais comentadas…')).toBeVisible();
  await interaction.selectOptions(screen.getByRole('combobox'), '24h');
  await screen.findByText('Nenhuma review com comentários neste período.');
  await act(async () => { pending.resolve(await service().getMostCommented('7d')); await pending.promise; });
  expect(screen.queryByText('Review antiga A')).not.toBeInTheDocument();
});
