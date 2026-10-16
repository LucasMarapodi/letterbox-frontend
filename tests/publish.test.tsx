import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createMockCommunityService } from './doubles/communityService';
import { community } from '../src/services/community';
import type { User } from '../src/models';

const author: User = { id: 'new-author', displayName: 'Nova', username: 'nova', bio: '', avatarUrl: null };
afterEach(() => vi.restoreAllMocks());
test('publicação aparece nas opiniões e pode ser encontrada pelo par autor/jogo', async () => {
  const service = createMockCommunityService({ reviews: [] });
  const review = await service.publish('game-1', ' Minha opinião ', author);
  expect(review).toMatchObject({ userId: author.id, gameId: 'game-1', text: 'Minha opinião' });
  expect(await service.findOwnReview('game-1', author)).toEqual(review);
  expect((await service.getOpinions('game-1')).reviews).toEqual([expect.objectContaining({ id: review.id, author: expect.objectContaining({ displayName: 'Nova' }) })]);
  expect((await service.getOpinions('game-2')).reviews).toEqual([]);
});
test.each(['', '   '])('serviço rejeita texto vazio %s', async (text) => {
  await expect(createMockCommunityService().publish('game-1', text, author)).rejects.toMatchObject({ code: 'empty-text' });
});
test('duplicidade é rejeitada pelo serviço sem criar segunda review', async () => {
  const service = createMockCommunityService({ reviews: [] });
  await service.publish('game-1', 'Primeira', author);
  await expect(service.publish('game-1', 'Segunda', author)).rejects.toMatchObject({ code: 'duplicate-review' });
  expect((await service.getOpinions('game-1')).reviews).toHaveLength(1);
});
test('serviço rejeita publicação sem sessão', async () => {
  await expect(createMockCommunityService().publish('game-1', 'Opinião', null)).rejects.toMatchObject({ code: 'session-required' });
});
async function openGame(): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes authService={{ async login() { return author; }, async register() { return author; } }} /></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'nova@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'x');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByLabelText('Usuário conectado');
  await interaction.click(screen.getByRole('link', { name: 'Início' }));
  await interaction.click(screen.getByRole('link', { name: 'Jogo de exemplo' }));
  await screen.findByRole('heading', { name: 'Ecos do Horizonte' });
  return interaction;
}
test('formulário rejeita espaços sem envio e preserva texto quando envio falha', async () => {
  const publish = vi.spyOn(community, 'publish').mockRejectedValue(new Error('Falha'));
  const interaction = await openGame();
  await interaction.type(await screen.findByLabelText('Sua review'), '   ');
  await interaction.click(screen.getByRole('button', { name: 'Publicar review' }));
  expect(screen.getByText('Escreva sua review.')).toBeVisible();
  expect(publish).not.toHaveBeenCalled();
  await interaction.clear(screen.getByLabelText('Sua review'));
  await interaction.type(screen.getByLabelText('Sua review'), 'Minha opinião');
  await interaction.click(screen.getByRole('button', { name: 'Publicar review' }));
  expect(await screen.findByText('Não foi possível publicar a review. Tente novamente.')).toBeVisible();
  expect(screen.getByLabelText('Sua review')).toHaveValue('Minha opinião');
});
test('publicação válida aparece e encaminha para edição', async () => {
  vi.spyOn(community, 'findOwnReview').mockResolvedValue(null);
  vi.spyOn(community, 'publish').mockResolvedValue({ id: 'nova', gameId: 'game-1', userId: author.id, text: 'Opinião nova', createdAt: '2026-01-01', updatedAt: null });
  const interaction = await openGame();
  await interaction.type(await screen.findByLabelText('Sua review'), 'Opinião nova');
  await interaction.click(screen.getByRole('button', { name: 'Publicar review' }));
  expect(await screen.findByText('Review publicada.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Editar minha review' })).toHaveAttribute('href', '/reviews/nova');
});
test('visitante não tem formulário de publicação', async () => {
  render(<MemoryRouter initialEntries={['/jogos/game-1']}><AppRoutes /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Ecos do Horizonte' });
  expect(screen.queryByLabelText('Sua review')).not.toBeInTheDocument();
});
