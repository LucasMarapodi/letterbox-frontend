import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { community } from '../src/services/community';
import { createMockCommunityService } from '../src/mocks/communityService';
import type { Comment, User } from '../src/models';
import { deferred } from './fixtures';

const author: User = { id: 'user-1', displayName: 'Ana', username: 'ana', bio: '', avatarUrl: null };
afterEach(() => vi.restoreAllMocks());
test('comentário em review alheia aparece somente na review correta', async () => {
  const service = createMockCommunityService({ comments: [] });
  const comment = await service.comment('review-2', ' Uma boa review ', author);
  expect(comment).toMatchObject({ text: 'Uma boa review', reviewId: 'review-2', userId: author.id });
  expect((await service.getComments('review-2'))[0].author.displayName).toBe('Ana');
  expect(await service.getComments('review-1')).toEqual([]);
});
test.each(['', '   '])('serviço rejeita comentário vazio %s', async (text) => {
  await expect(createMockCommunityService().comment('review-2', text, author)).rejects.toMatchObject({ code: 'empty-text' });
});
test('serviço exige sessão e review existente', async () => {
  const service = createMockCommunityService();
  await expect(service.comment('review-2', 'Texto', null)).rejects.toMatchObject({ code: 'session-required' });
  await expect(service.comment('ausente', 'Texto', author)).rejects.toMatchObject({ code: 'not-found' });
});
async function open(): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes /></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByLabelText('Usuário conectado');
  await interaction.click(screen.getByRole('link', { name: 'Início' }));
  await interaction.click(screen.getByRole('link', { name: 'Jogo de exemplo' }));
  await interaction.click(await screen.findByRole('link', { name: 'Review de Leo' }));
  return interaction;
}
test('vazio não envia e falha preserva texto', async () => {
  const send = vi.spyOn(community, 'comment').mockRejectedValue(new Error('Falha'));
  const interaction = await open();
  await interaction.type(await screen.findByLabelText('Seu comentário'), '   ');
  await interaction.click(screen.getByRole('button', { name: 'Publicar comentário' }));
  expect(screen.getByText('Escreva seu comentário.')).toBeVisible(); expect(send).not.toHaveBeenCalled();
  await interaction.clear(screen.getByLabelText('Seu comentário'));
  await interaction.type(screen.getByLabelText('Seu comentário'), 'Meu rascunho');
  await interaction.click(screen.getByRole('button', { name: 'Publicar comentário' }));
  expect(await screen.findByText('Não foi possível publicar o comentário. Tente novamente.')).toBeVisible();
  expect(screen.getByLabelText('Seu comentário')).toHaveValue('Meu rascunho');
});
test('pendência bloqueia duplo envio e comentário publicado aparece', async () => {
  const pending = deferred<Comment>();
  const send = vi.spyOn(community, 'comment').mockReturnValue(pending.promise);
  const get = vi.spyOn(community, 'getComments').mockResolvedValue([]);
  const interaction = await open();
  await interaction.type(await screen.findByLabelText('Seu comentário'), 'Comentário enviado');
  const form = screen.getByRole('form', { name: 'Publicar comentário' });
  await act(async () => { fireEvent.submit(form); fireEvent.submit(form); });
  expect(send).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Publicando…' })).toBeDisabled();
  const comment: Comment = { id: 'c-new', userId: author.id, reviewId: 'review-2', text: 'Comentário enviado', createdAt: '2026-01-04T12:00:00Z' };
  get.mockResolvedValue([{ ...comment, author }]);
  await act(async () => { pending.resolve(comment); await pending.promise; });
  expect(await screen.findByText('Comentário enviado')).toBeVisible();
  expect(screen.getByText('Comentário publicado.')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Sair' }));
  expect(screen.queryByLabelText('Seu comentário')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Entrar para continuar' })).toBeVisible();
});
test('visitante lê mas não envia comentário', async () => {
  render(<MemoryRouter initialEntries={['/reviews/review-2']}><AppRoutes /></MemoryRouter>);
  await screen.findByText(/Um mundo pequeno/);
  expect(screen.queryByLabelText('Seu comentário')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Entrar para continuar' })).toHaveAttribute('href', '/login');
});
