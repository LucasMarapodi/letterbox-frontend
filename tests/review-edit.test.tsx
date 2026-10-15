import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createMockCommunityService } from './doubles/communityService';
import { community } from '../src/services/community';
import type { User } from '../src/models';

const author: User = { id: 1, displayName: 'Ana', username: 'ana', bio: '', avatarUrl: null };
afterEach(() => vi.restoreAllMocks());
test('edição pelo autor mantém ID quantidade e data de criação', async () => {
  const service = createMockCommunityService();
  const original = await service.getReview('review-1');
  const updated = await service.editReview('review-1', ' Texto atualizado ', author);
  expect(updated).toMatchObject({ id: original?.id, createdAt: original?.createdAt, text: 'Texto atualizado' });
  expect(updated.updatedAt).not.toBeNull();
  expect((await service.getOpinions(1)).reviews).toHaveLength(2);
  expect((await service.getReview('review-1'))?.text).toBe('Texto atualizado');
});
test.each([null, { ...author, id: 2 }])('edição rejeita visitante ou outro usuário %s', async (user) => {
  await expect(createMockCommunityService().editReview('review-1', 'Novo', user)).rejects.toMatchObject({ code: user ? 'forbidden' : 'session-required' });
});
test('edição rejeita texto vazio e ID inexistente', async () => {
  const service = createMockCommunityService();
  await expect(service.editReview('review-1', '  ', author)).rejects.toMatchObject({ code: 'empty-text' });
  await expect(service.editReview('ausente', 'Novo', author)).rejects.toMatchObject({ code: 'not-found' });
});
async function openAuthenticated(user: User = author): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes authService={{ async login() { return user; }, async register() { return user; } }} /></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'x');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByLabelText('Usuário conectado');
  await interaction.click(screen.getByRole('link', { name: 'Início' }));
  await interaction.click(screen.getByRole('link', { name: 'Review de exemplo' }));
  return interaction;
}
test('autor recebe conteúdo existente e falha preserva rascunho', async () => {
  vi.spyOn(community, 'editReview').mockRejectedValue(new Error('Falha'));
  const interaction = await openAuthenticated();
  const input = await screen.findByLabelText('Sua review');
  expect(input).toHaveValue('A exploração convida a seguir cada caminho. A trilha sonora acompanha muito bem a aventura.');
  await interaction.clear(input); await interaction.type(input, 'Rascunho atualizado');
  await interaction.click(screen.getByRole('button', { name: 'Salvar review' }));
  expect(await screen.findByText('Não foi possível salvar a review. Tente novamente.')).toBeVisible();
  expect(input).toHaveValue('Rascunho atualizado');
});
test('outro usuário não recebe controle de edição', async () => {
  await openAuthenticated({ ...author, id: 2 });
  await screen.findByText(/A exploração convida/);
  expect(screen.queryByLabelText('Sua review')).not.toBeInTheDocument();
});
test('visitante lê sem controle de edição', async () => {
  render(<MemoryRouter initialEntries={['/reviews/review-1']}><AppRoutes /></MemoryRouter>);
  await screen.findByText(/A exploração convida/);
  expect(screen.queryByLabelText('Sua review')).not.toBeInTheDocument();
});
