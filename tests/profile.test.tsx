import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { community } from '../src/services/community';
import { createMockCommunityService } from './doubles/communityService';
import type { PublicProfile } from '../src/services/communityContracts';
import type { User } from '../src/models';
import { encodeRouteId } from '../src/routing/encodeRouteId';

const user: User = { id: 42, displayName: 'Ana', username: 'ana', bio: 'Explorando mundos.', avatarUrl: '/ana.png' };
const profile: PublicProfile = { user, reviews: [{ id: 55, userId: user.id, gameId: 12, likeCount: 0, rating: 4, text: 'Review da Ana', createdAt: '2026-01-01T12:00:00Z', updatedAt: null, author: user, game: { id: 12, title: 'Jogo da Ana' } }] };
afterEach(() => vi.restoreAllMocks());
function open(): void { render(<MemoryRouter initialEntries={[`/perfil/${encodeRouteId(user.id)}`]}><AppRoutes /></MemoryRouter>); }
test('perfil público completo exibe foto biografia reviews e links numéricos', async () => {
  const get = vi.spyOn(community, 'getProfile').mockResolvedValue(profile); open();
  expect(await screen.findByText('Explorando mundos.')).toBeVisible();
  expect(within(screen.getByRole('region', {name: /Informa/})).getByRole('img', { name: 'Ana' })).toHaveAttribute('src', '/ana.png');
  expect(screen.getByText('Review da Ana')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Ler review de Jogo da Ana' })).toHaveAttribute('href', `/reviews/${encodeRouteId(profile.reviews[0].id)}`);
  expect(screen.getByRole('link', { name: 'Jogo da Ana' })).toHaveAttribute('href', `/jogos/${encodeRouteId(12)}`);
  expect(get).toHaveBeenCalledWith(user.id, null);
});
test('perfil parcial e sem reviews apresenta alternativas', async () => {
  vi.spyOn(community, 'getProfile').mockResolvedValue({ user: { ...user, bio: '', avatarUrl: null }, reviews: [] }); open();
  expect(await screen.findByText('Biografia não informada.')).toBeVisible();
  expect(within(screen.getByRole('region', {name: /Informa/})).getByRole('img', { name: 'Ana' })).toHaveTextContent('A');
  expect(screen.getByText('Nenhuma review publicada por este usuário.')).toBeVisible();
});
test('perfil inexistente mostra ausência', async () => {
  vi.spyOn(community, 'getProfile').mockResolvedValue(null); open();
  expect(await screen.findByText('Perfil não encontrado.')).toBeVisible();
});
test('perfil anuncia carregamento e oferece recuperação de erro', async () => {
  vi.spyOn(community, 'getProfile').mockRejectedValueOnce(new Error('Falha')).mockResolvedValueOnce(profile);
  const interaction = userEvent.setup(); open();
  expect(screen.getByText('Carregando perfil…')).toBeVisible();
  expect(await screen.findByText('Não foi possível carregar o perfil.')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Explorando mundos.')).toBeVisible();
});
test('serviço filtra reviews pelo usuário e isola dados retornados', async () => {
  const service = createMockCommunityService();
  const ana = await service.getProfile(1);
  expect(ana?.reviews.map((review) => review.id)).toEqual([1]);
  if (ana) ana.user.bio = 'Mudou';
  expect((await service.getProfile(1))?.user.bio).not.toBe('Mudou');
  expect(await service.getProfile(999)).toBeNull();
});
test('usuário recém-cadastrado tem próprio perfil mesmo antes de publicar', async () => {
  const service = createMockCommunityService();
  expect(await service.getProfile(user.id, user)).toMatchObject({ user, reviews: [] });
});
