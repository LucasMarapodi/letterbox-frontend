import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { community } from '../src/services/community';
import { createMockCommunityService } from './doubles/communityService';
import type { ReviewDetails } from '../src/services/communityContracts';
import { deferred } from './fixtures';
import { encodeRouteId } from '../src/routing/encodeRouteId';

const review: ReviewDetails = { id: 'review%2F42', userId: 'ana/.', gameId: '..', text: 'Review completa pública', createdAt: '2026-01-02T12:00:00Z', updatedAt: null, author: { id: 'ana/.', displayName: 'Ana', avatarUrl: null }, game: { id: '..', title: 'Jogo da review' } };
afterEach(() => vi.restoreAllMocks());
function open(): void { render(<MemoryRouter initialEntries={[`/reviews/${encodeRouteId(review.id)}`]}><AppRoutes /></MemoryRouter>); }
test('leitura pública preserva ID opaco e mostra autor jogo data e links', async () => {
  const get = vi.spyOn(community, 'getReview').mockResolvedValue(review);
  open();
  expect(await screen.findByText(review.text)).toBeVisible();
  expect(get).toHaveBeenCalledWith(review.id);
  expect(screen.getByRole('link', { name: 'Ana' })).toHaveAttribute('href', `/perfil/${encodeRouteId(review.author.id)}`);
  expect(screen.getByRole('link', { name: 'Jogo da review' })).toHaveAttribute('href', `/jogos/${encodeRouteId(review.game.id)}`);
  expect(screen.getByText('02/01/2026')).toBeVisible();
});
test('leitura trata inexistência', async () => {
  vi.spyOn(community, 'getReview').mockResolvedValue(null); open();
  expect(await screen.findByText('Review não encontrada.')).toBeVisible();
});
test('carregamento e erro oferecem nova tentativa', async () => {
  const pending = deferred<ReviewDetails | null>();
  vi.spyOn(community, 'getReview').mockRejectedValueOnce(new Error('Falha')).mockReturnValueOnce(pending.promise);
  const interaction = userEvent.setup(); open();
  expect(await screen.findByText('Não foi possível carregar a review.')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(screen.getByText('Carregando review…')).toBeVisible();
  await act(async () => { pending.resolve(review); await pending.promise; });
  expect(screen.getByText(review.text)).toBeVisible();
});
test('serviço lê review com dados públicos e retorna null para ID ausente', async () => {
  const service = createMockCommunityService();
  expect(await service.getReview('review-1')).toMatchObject({ id: 'review-1', author: { id: 'user-1' }, game: { id: 'game-1' } });
  expect(await service.getReview('ausente')).toBeNull();
});
