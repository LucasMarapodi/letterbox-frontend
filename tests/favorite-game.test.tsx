import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { community } from '../src/services/community';
import { createMockCommunityService } from './doubles/communityService';
import type { User } from '../src/models';

const ana: User = { id: 1, displayName: 'Ana', username: 'ana', bio: '', avatarUrl: null };
afterEach(() => vi.restoreAllMocks());
test('favorito de jogo é idempotente, removível e isolado por usuário', async () => {
  const service = createMockCommunityService();
  const first = await service.setFavorite('game', 1, true, ana);
  expect(await service.setFavorite('game', 1, true, ana)).toEqual(first);
  expect(await service.getFavorite('game', 1, ana)).toEqual(first);
  expect(await service.getFavorite('game', 1, { ...ana, id: 2 })).toBeNull();
  await service.setFavorite('game', 1, false, ana);
  expect(await service.getFavorite('game', 1, ana)).toBeNull();
  expect(await service.setFavorite('game', 1, false, ana)).toBeNull();
});
test('favorito exige sessão e jogo existente', async () => {
  const service = createMockCommunityService();
  await expect(service.setFavorite('game', 1, true, null)).rejects.toMatchObject({ code: 'session-required' });
  await expect(service.getFavorite('game', 1, null)).rejects.toMatchObject({ code: 'session-required' });
  await expect(service.setFavorite('game', 999, true, ana)).rejects.toMatchObject({ code: 'not-found' });
});
async function open(): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes /></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await interaction.click(await screen.findByRole('link', { name: 'Jogo de exemplo' }));
  return interaction;
}
test('jogo alterna estado após sucesso e recupera estado do serviço', async () => {
  const service = createMockCommunityService();
  vi.spyOn(community, 'getFavorites').mockImplementation(service.getFavorites);
  vi.spyOn(community, 'setFavorite').mockImplementation(service.setFavorite);
  const interaction = await open();
  await interaction.click(await screen.findByRole('button', { name: 'Favoritar jogo Ecos do Horizonte' }));
  expect(await screen.findByRole('button', { name: 'Remover jogo Ecos do Horizonte dos favoritos' })).toHaveAttribute('aria-pressed', 'true');
  await interaction.click(screen.getByRole('link', { name: 'Início' }));
  await interaction.click(screen.getByRole('link', { name: 'Jogo de exemplo' }));
  await interaction.click(await screen.findByRole('button', { name: 'Remover jogo Ecos do Horizonte dos favoritos' }));
  expect(await screen.findByRole('button', { name: 'Favoritar jogo Ecos do Horizonte' })).toHaveAttribute('aria-pressed', 'false');
});
test('falha não confirma favorito nem altera estado do botão', async () => {
  vi.spyOn(community, 'getFavorites').mockResolvedValue({ games: [], reviews: [] });
  vi.spyOn(community, 'setFavorite').mockRejectedValue(new Error('Falha'));
  const interaction = await open();
  await interaction.click(await screen.findByRole('button', { name: 'Favoritar jogo Ecos do Horizonte' }));
  expect(await screen.findByText('Não foi possível atualizar o favorito. Tente novamente.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Favoritar jogo Ecos do Horizonte' })).toHaveAttribute('aria-pressed', 'false');
});
test('visitante recebe caminho de login para favoritar jogo', async () => {
  render(<MemoryRouter initialEntries={['/jogos/1']}><AppRoutes /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Ecos do Horizonte' });
  expect(await screen.findByRole('button', { name: 'Favoritar jogo Ecos do Horizonte' })).not.toHaveAttribute('aria-pressed');
  expect(screen.queryByText('Entrar para favoritar')).not.toBeInTheDocument();
});
