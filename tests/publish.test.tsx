import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createMockCommunityService } from './doubles/communityService';
import { community } from '../src/services/community';
import type { User } from '../src/models';

const author: User = { id: 3, displayName: 'Nova', username: 'nova', bio: '', avatarUrl: null };
afterEach(() => vi.restoreAllMocks());
test('publicação aparece nas opiniões e pode ser encontrada pelo par autor/jogo', async () => {
  const service = createMockCommunityService({ reviews: [] });
  const review = await service.publish(1, { rating: 4.5, text: ' Minha opinião ' }, author);
  expect(review).toMatchObject({ userId: author.id, gameId: 1, rating: 4.5, text: 'Minha opinião' });
  expect(await service.findOwnReview(1, author)).toEqual(review);
  expect((await service.getOpinions(1)).reviews).toEqual([expect.objectContaining({ id: review.id, author: expect.objectContaining({ displayName: 'Nova' }) })]);
  expect((await service.getOpinions(2)).reviews).toEqual([]);
});
test.each(['', '   '])('serviço aceita texto vazio com nota %s', async (text) => {
  expect(await createMockCommunityService({reviews:[]}).publish(1, { rating: 4.5, text }, author)).toMatchObject({text:'',rating:4.5});
});
test('duplicidade é rejeitada pelo serviço sem criar segunda review', async () => {
  const service = createMockCommunityService({ reviews: [] });
  await service.publish(1, { rating: 4.5, text: 'Primeira' }, author);
  await expect(service.publish(1, { rating: 4.5, text: 'Segunda' }, author)).rejects.toMatchObject({ code: 'duplicate-review' });
  expect((await service.getOpinions(1)).reviews).toHaveLength(1);
});
test('serviço rejeita publicação sem sessão', async () => {
  await expect(createMockCommunityService().publish(1, { rating: 4.5, text: 'Opinião' }, null)).rejects.toMatchObject({ code: 'session-required' });
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
  await screen.findByRole('heading', { name: 'Ecos do Horizonte' }); await interaction.click(await screen.findByRole('button',{name:'Criar review'}));
  return interaction;
}
test('formulário exige nota e preserva descrição quando envio falha', async () => {
  const publish = vi.spyOn(community, 'publish').mockRejectedValue(new Error('Falha'));
  const interaction = await openGame();
  await interaction.type(await screen.findByLabelText('Descrição (opcional)'), '   ');
  await interaction.click(screen.getByRole('button', { name: 'Publicar review' }));
  expect(screen.getByText('Escolha uma nota de 0 a 5.')).toBeVisible();
  expect(publish).not.toHaveBeenCalled();
  await interaction.type(screen.getByLabelText('Nota (0 a 5)'),'4.5'); await interaction.clear(screen.getByLabelText('Descrição (opcional)'));
  await interaction.type(screen.getByLabelText('Descrição (opcional)'), 'Minha opinião');
  await interaction.click(screen.getByRole('button', { name: 'Publicar review' }));
  expect(await screen.findByText('Não foi possível publicar a review. Tente novamente.')).toBeVisible();
  expect(screen.getByLabelText('Descrição (opcional)')).toHaveValue('Minha opinião');
});
test('publicação válida aparece e encaminha para edição', async () => {
  vi.spyOn(community, 'findOwnReview').mockResolvedValueOnce(null).mockResolvedValue({ id:99,gameId:1,userId:author.id,rating:4,text:'Opinião nova',createdAt:'2026-01-01',updatedAt:null });
  vi.spyOn(community, 'publish').mockResolvedValue({ id: 99, gameId: 1, userId: author.id, rating: 4, text: 'Opinião nova', createdAt: '2026-01-01', updatedAt: null });
  const interaction = await openGame();
  await interaction.type(screen.getByLabelText('Nota (0 a 5)'),'4'); await interaction.type(await screen.findByLabelText('Descrição (opcional)'), 'Opinião nova');
  await interaction.click(screen.getByRole('button', { name: 'Publicar review' }));
  expect(await screen.findByText('Review publicada.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Editar minha review' })).toBeVisible();
});
test('visitante não tem formulário de publicação', async () => {
  render(<MemoryRouter initialEntries={['/jogos/1']}><AppRoutes /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Ecos do Horizonte' });
  expect(screen.queryByLabelText('Descrição (opcional)')).not.toBeInTheDocument();
});
