import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { community } from '../src/services/community';
import { createMockCommunityService } from './doubles/communityService';
import type { User } from '../src/models';
import type { FavoriteLists } from '../src/services/communityContracts';
import { deferred } from './fixtures';

const ana: User = { id: 1, displayName: 'Ana', username: 'ana', bio: '', avatarUrl: null };
afterEach(() => vi.restoreAllMocks());
async function login(): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes /><Link to="/perfil/2">Outro perfil</Link></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByRole('link', { name: 'Review de exemplo' });
  return interaction;
}
test('consulta separa tipos, isola usuários, clona dados e reflete remoção', async () => {
  const service = createMockCommunityService();
  await service.setFavorite('game', 1, true, ana);
  await service.setFavorite('game', 1, true, ana);
  await service.setFavorite('review', 'review-2', true, ana);
  const lists = await service.getFavorites(ana);
  expect(lists.games.map((game) => game.id)).toEqual([1]);
  expect(lists.reviews.map((review) => review.id)).toEqual(['review-2']);
  lists.games[0].title = 'Alterado';
  expect((await service.getFavorites(ana)).games[0].title).toBe('Ecos do Horizonte');
  expect(await service.getFavorites({ ...ana, id: 2 })).toEqual({ games: [], reviews: [] });
  await service.setFavorite('game', 1, false, ana);
  await service.setFavorite('review', 'review-2', false, ana);
  expect(await service.getFavorites(ana)).toEqual({ games: [], reviews: [] });
  await expect(service.getFavorites(null)).rejects.toMatchObject({ code: 'session-required' });
});
test('Home e próprio perfil mostram tipos separados com destinos corretos', async () => {
  const service = createMockCommunityService();
  await service.setFavorite('game', 1, true, ana);
  await service.setFavorite('review', 'review-2', true, ana);
  vi.spyOn(community, 'getFavorites').mockImplementation(service.getFavorites);
  const interaction = await login();
  const games = await screen.findByRole('region', { name: 'Jogos favoritos' });
  expect(within(games).getByRole('link', { name: 'Ecos do Horizonte' })).toHaveAttribute('href', '/jogos/1');
  const reviews = screen.getByRole('region', { name: 'Reviews favoritas' });
  expect(within(reviews).getByRole('link', { name: /Review de Leo/ })).toHaveAttribute('href', '/reviews/review-2');
  await interaction.click(screen.getByRole('link', { name: 'Meu perfil' }));
  expect(await screen.findByRole('region', { name: 'Jogos favoritos' })).toBeVisible();
  expect(screen.getByRole('region', { name: 'Reviews favoritas' })).toBeVisible();
});
test('consulta novamente após remoção e apresenta vazio', async () => {
  const service = createMockCommunityService();
  await service.setFavorite('game', 1, true, ana);
  vi.spyOn(community, 'getFavorites').mockImplementation(service.getFavorites);
  const interaction = await login();
  await screen.findByRole('region', { name: 'Jogos favoritos' });
  await service.setFavorite('game', 1, false, ana);
  await interaction.click(screen.getByRole('link', { name: 'Meu perfil' }));
  expect(await screen.findByText('Nenhum jogo favorito.')).toBeVisible();
  expect(screen.getByText('Nenhuma review favorita.')).toBeVisible();
});
test('perfil de terceiros e visitantes não expõem favoritos', async () => {
  const get = vi.spyOn(community, 'getFavorites').mockResolvedValue({ games: [], reviews: [] });
  const interaction = await login();
  await screen.findByText('Nenhum jogo favorito.');
  get.mockClear();
  await interaction.click(screen.getByRole('link', { name: 'Outro perfil' }));
  await screen.findByRole('heading', { name: 'Leo' });
  expect(get).not.toHaveBeenCalled();
  expect(screen.queryByRole('region', { name: 'Jogos favoritos' })).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('button', { name: 'Sair' }));
  expect(screen.queryByRole('region', { name: 'Jogos favoritos' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Reviews favoritas' })).not.toBeInTheDocument();
});
test('falha na consulta permite tentar novamente sem mostrar lista incorreta', async () => {
  vi.spyOn(community, 'getFavorites').mockRejectedValueOnce(new Error('Falha')).mockResolvedValue({ games: [], reviews: [] });
  const interaction = await login();
  expect(await screen.findByText('Não foi possível carregar os favoritos.')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Nenhum jogo favorito.')).toBeVisible();
});
test('resposta pendente depois do logout não revela favoritos', async () => {
  const pending = deferred<FavoriteLists>();
  vi.spyOn(community, 'getFavorites').mockReturnValue(pending.promise);
  const interaction = await login();
  expect(await screen.findByText('Carregando favoritos…')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Sair' }));
  await act(async () => { pending.resolve({ games: [], reviews: [] }); await pending.promise; });
  expect(screen.queryByText('Nenhum jogo favorito.')).not.toBeInTheDocument();
});
