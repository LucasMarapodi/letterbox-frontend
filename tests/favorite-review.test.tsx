import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { community } from '../src/services/community';
import { createMockCommunityService } from './doubles/communityService';
import type { Favorite, User } from '../src/models';
import { deferred } from './fixtures';

const ana: User = { id: 'user-1', displayName: 'Ana', username: 'ana', bio: '', avatarUrl: null };
afterEach(() => vi.restoreAllMocks());
test('favorito de review não duplica e mantém isolamento entre usuários', async () => {
  const service = createMockCommunityService();
  const first = await service.setFavorite('review', 'review-2', true, ana);
  expect(await service.setFavorite('review', 'review-2', true, ana)).toEqual(first);
  expect(await service.getFavorite('review', 'review-2', { ...ana, id: 'user-2' })).toBeNull();
  await service.setFavorite('review', 'review-2', false, ana);
  expect(await service.getFavorite('review', 'review-2', ana)).toBeNull();
});
test('review inexistente e visitante não podem ser favoritados', async () => {
  const service = createMockCommunityService();
  await expect(service.setFavorite('review', 'ausente', true, ana)).rejects.toMatchObject({ code: 'not-found' });
  await expect(service.setFavorite('review', 'review-2', true, null)).rejects.toMatchObject({ code: 'session-required' });
});
async function open(): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes /></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await interaction.click(await screen.findByRole('link', { name: 'Review de exemplo' }));
  return interaction;
}
test('review alterna favorito pessoal e logout remove ação', async () => {
  const service = createMockCommunityService();
  vi.spyOn(community, 'getFavorite').mockImplementation(service.getFavorite);
  vi.spyOn(community, 'setFavorite').mockImplementation(service.setFavorite);
  const interaction = await open();
  await interaction.click(await screen.findByRole('button', { name: 'Favoritar review' }));
  await interaction.click(await screen.findByRole('button', { name: 'Remover review dos favoritos' }));
  expect(await screen.findByRole('button', { name: 'Favoritar review' })).toHaveAttribute('aria-pressed', 'false');
  await interaction.click(screen.getByRole('button', { name: 'Sair' }));
  expect(screen.queryByRole('button', { name: 'Favoritar review' })).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('link', { name: 'Review de exemplo' }));
  expect(await screen.findByRole('link', { name: 'Entrar para favoritar' })).toBeVisible();
});
test('erro não confirma favorito da review', async () => {
  vi.spyOn(community, 'getFavorite').mockResolvedValue(null);
  vi.spyOn(community, 'setFavorite').mockRejectedValue(new Error('Falha'));
  const interaction = await open();
  await interaction.click(await screen.findByRole('button', { name: 'Favoritar review' }));
  expect(await screen.findByText('Não foi possível atualizar o favorito. Tente novamente.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Favoritar review' })).toHaveAttribute('aria-pressed', 'false');
});
test('envio de favorito pendente impede duplicação', async () => {
  const pending = deferred<Favorite | null>();
  vi.spyOn(community, 'getFavorite').mockResolvedValue(null);
  const set = vi.spyOn(community, 'setFavorite').mockReturnValue(pending.promise);
  await open();
  const button = await screen.findByRole('button', { name: 'Favoritar review' });
  await act(async () => { fireEvent.click(button); fireEvent.click(button); });
  expect(set).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Atualizando favorito…' })).toBeDisabled();
  await act(async () => { pending.resolve({ id: 'fav', userId: ana.id, targetType: 'review', targetId: 'review-1' }); await pending.promise; });
  expect(screen.getByRole('button', { name: 'Remover review dos favoritos' })).toHaveAttribute('aria-pressed', 'true');
});
test('visitante recebe caminho de login na review', async () => {
  render(<MemoryRouter initialEntries={['/reviews/review-1']}><AppRoutes /></MemoryRouter>);
  await screen.findByText(/A exploração convida/);
  expect(screen.queryByRole('button', { name: 'Favoritar review' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Entrar para favoritar' })).toHaveAttribute('href', '/login');
});
