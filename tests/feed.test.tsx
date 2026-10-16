import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createMockCommunityService } from './doubles/communityService';
import { community } from '../src/services/community';
import { userFixtures } from './doubles/opinions';
import type { Review, User } from '../src/models';
import type { ReviewDetails } from '../src/services/communityContracts';
import { deferred } from './fixtures';

const [ana, leo] = userFixtures;
const bia: User = { id: 3, displayName: 'Bia', username: 'bia', avatarUrl: null, bio: '' };
const reviews: Review[] = [
  { id: 1, userId: leo.id, gameId: 1, text: 'Antiga', createdAt: '2026-01-01T12:00:00Z', updatedAt: '2026-10-01T12:00:00Z' },
  { id: 2, userId: leo.id, gameId: 2, text: 'Recente', createdAt: '2026-02-01T12:00:00Z', updatedAt: null },
  { id: 3, userId: bia.id, gameId: 1, text: 'Não seguida', createdAt: '2026-03-01T12:00:00Z', updatedAt: null },
  { id: 4, userId: ana.id, gameId: 1, text: 'Própria', createdAt: '2026-04-01T12:00:00Z', updatedAt: null },
];
afterEach(() => vi.restoreAllMocks());
test('feed filtra autores e ordena por publicação, remoção e nova publicação refletem próxima consulta', async () => {
  const service = createMockCommunityService({ reviews, users: [ana, leo, bia] });
  expect(await service.getFeed(ana)).toEqual([]);
  await service.setFollowing(leo.id, true, ana);
  const feed = await service.getFeed(ana);
  expect(feed.map((review) => review.id)).toEqual([2, 1]);
  expect(feed[0]).toMatchObject({ author: { displayName: 'Leo' }, game: { title: 'Circuito Aurora' } });
  feed[0].text = 'Mudou';
  expect((await service.getFeed(ana))[0].text).toBe('Recente');
  const published = await service.publish(3, 'Nova publicação', leo);
  expect((await service.getFeed(ana))[0].id).toBe(published.id);
  await service.setFollowing(leo.id, false, ana);
  expect(await service.getFeed(ana)).toEqual([]);
  await expect(service.getFeed(null)).rejects.toMatchObject({ code: 'session-required' });
});
async function login(): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes /><Link to="/perfil/2">Perfil de Leo</Link></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByRole('link', { name: 'Review de exemplo' });
  return interaction;
}
test('Home exibe feed ordenado com texto autor jogo data e destino da review', async () => {
  const service = createMockCommunityService({ reviews, users: [ana, leo, bia] });
  await service.setFollowing(leo.id, true, ana);
  vi.spyOn(community, 'getFeed').mockImplementation(service.getFeed);
  await login();
  const feed = await screen.findByRole('region', { name: 'Feed de reviews' });
  const cards = await within(feed).findAllByRole('article');
  expect(cards).toHaveLength(2);
  expect(within(cards[0]).getByText('Recente')).toBeVisible();
  expect(within(cards[1]).getByText('Antiga')).toBeVisible();
  expect(within(cards[0]).getByRole('link', { name: 'Leo' })).toHaveAttribute('href', '/perfil/2');
  expect(within(cards[0]).getByRole('link', { name: 'Circuito Aurora' })).toHaveAttribute('href', '/jogos/2');
  expect(within(cards[0]).getByRole('link', { name: 'Ler review' })).toHaveAttribute('href', '/reviews/2');
  expect(within(cards[0]).getByText('01/02/2026')).toHaveAttribute('datetime', '2026-02-01T12:00:00Z');
});
test('deixar de seguir no perfil remove review ao voltar à Home', async () => {
  const service = createMockCommunityService();
  await service.setFollowing(leo.id, true, ana);
  vi.spyOn(community, 'getFeed').mockImplementation(service.getFeed);
  vi.spyOn(community, 'isFollowing').mockImplementation(service.isFollowing);
  vi.spyOn(community, 'setFollowing').mockImplementation(service.setFollowing);
  const interaction = await login();
  expect(await screen.findByText('Um mundo pequeno, mas cheio de detalhes para descobrir.')).toBeVisible();
  await interaction.click(screen.getByRole('link', { name: 'Perfil de Leo' }));
  await interaction.click(await screen.findByRole('button', { name: 'Deixar de seguir Leo' }));
  await screen.findByRole('button', { name: 'Seguir Leo' });
  await interaction.click(screen.getByRole('link', { name: 'Início' }));
  expect(await screen.findByText('Nenhuma review de pessoas seguidas.')).toBeVisible();
});
test('erro do feed permite nova tentativa e vazio mantém catálogo acessível', async () => {
  vi.spyOn(community, 'getFeed').mockRejectedValueOnce(new Error('Falha')).mockResolvedValue([]);
  const interaction = await login();
  const feed = await screen.findByRole('region', { name: 'Feed de reviews' });
  expect(await within(feed).findByText('Não foi possível carregar o feed.')).toBeVisible();
  await interaction.click(within(feed).getByRole('button', { name: 'Tentar novamente' }));
  expect(await within(feed).findByText('Nenhuma review de pessoas seguidas.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Ecos do Horizonte' })).toBeVisible();
});
test('logout descarta consulta pendente e visitante não consulta feed', async () => {
  const pending = deferred<ReviewDetails[]>();
  const get = vi.spyOn(community, 'getFeed').mockReturnValue(pending.promise);
  const interaction = await login();
  expect(await screen.findByText('Carregando feed…')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Sair' }));
  await act(async () => { pending.resolve([]); await pending.promise; });
  expect(screen.queryByRole('region', { name: 'Feed de reviews' })).not.toBeInTheDocument();
  expect(get).toHaveBeenCalledTimes(1);
});
