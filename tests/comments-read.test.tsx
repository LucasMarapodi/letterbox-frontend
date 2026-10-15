import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { community } from '../src/services/community';
import { createMockCommunityService } from './doubles/communityService';
import type { PublicComment } from '../src/services/communityContracts';
import type { Comment } from '../src/models';

const comment: PublicComment = { id: 'comment-1', reviewId: 1, userId: 2, text: 'Uma ótima descoberta.', createdAt: '2026-01-03T12:00:00Z', author: { id: 2, displayName: 'Leo', avatarUrl: null } };
afterEach(() => vi.restoreAllMocks());
function open(): void { render(<MemoryRouter initialEntries={['/reviews/1']}><AppRoutes /></MemoryRouter>); }
test('serviço retorna somente comentários da review solicitada e isola retornos', async () => {
  const comments: Comment[] = [comment, { ...comment, id: 'outro', reviewId: 2, text: 'Outra discussão' }];
  const service = createMockCommunityService({ comments });
  const result = await service.getComments(1);
  expect(result).toEqual([expect.objectContaining({ text: comment.text, author: { id: 2, displayName: 'Leo', avatarUrl: null } })]);
  result[0].text = 'Alterado';
  expect((await service.getComments(1))[0].text).toBe(comment.text);
  expect(await service.getComments(999)).toEqual([]);
});
test('visitante consulta lista plana com autor texto e data', async () => {
  const get = vi.spyOn(community, 'getComments').mockResolvedValue([comment]); open();
  expect(await screen.findByText(comment.text)).toBeVisible();
  expect(screen.getByRole('link', { name: 'Leo' })).toHaveAttribute('href', '/perfil/2');
  expect(screen.getByText('03/01/2026')).toBeVisible();
  expect(screen.getByRole('list', { name: 'Comentários da review' })).toBeVisible();
  expect(get).toHaveBeenCalledWith(1);
});
test('lista vazia mostra mensagem', async () => {
  vi.spyOn(community, 'getComments').mockResolvedValue([]); open();
  expect(await screen.findByText('Nenhum comentário nesta review.')).toBeVisible();
});
test('erro na lista permite nova tentativa', async () => {
  vi.spyOn(community, 'getComments').mockRejectedValueOnce(new Error('Falha')).mockResolvedValueOnce([comment]);
  const interaction = userEvent.setup(); open();
  expect(await screen.findByText('Não foi possível carregar os comentários.')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText(comment.text)).toBeVisible();
});
