import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { community } from '../src/services/community';
import { createMockCommunityService } from '../src/mocks/communityService';
import type { Review } from '../src/models';
afterEach(() => vi.restoreAllMocks());
const base: Review = { id: 'old', userId: 'user-1', gameId: 'game-1', text: 'Antiga com atividade nova', createdAt: '2026-01-01T12:00:00Z', updatedAt: '2026-10-01T12:00:00Z' };
test('publicação ordena todos os autores com desempate por ID e ignora edição/comentário', async () => {
  const service = createMockCommunityService({ reviews: [base, { ...base, id: 'z', userId: 'user-2', createdAt: '2026-02-01T12:00:00Z' }, { ...base, id: 'a', createdAt: '2026-02-01T12:00:00Z' }] });
  const result = await service.getRecentReviews();
  expect(result.map((review) => review.id)).toEqual(['a', 'z', 'old']);
  expect(result.map((review) => review.author.displayName)).toContain('Leo');
  result[0].text = 'Alterado';
  expect((await service.getRecentReviews())[0].text).not.toBe('Alterado');
});
test('Recentes é inicial pública com texto autor jogo data e links corretos', async () => {
  render(<MemoryRouter initialEntries={['/comunidade']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Recentes' })).toHaveAttribute('aria-pressed', 'true');
  const section = await screen.findByRole('region', { name: 'Reviews recentes' });
  const cards = await within(section).findAllByRole('article');
  expect(within(cards[0]).getByRole('link', { name: 'Leo' })).toHaveAttribute('href', '/perfil/user-2');
  expect(within(cards[0]).getByRole('link', { name: 'Ecos do Horizonte' })).toHaveAttribute('href', '/jogos/game-1');
  expect(within(cards[0]).getByRole('link', { name: 'Ler review' })).toHaveAttribute('href', '/reviews/review-2');
  expect(within(cards[0]).getByText('02/01/2026')).toBeVisible();
});
test('carregamento erro recuperação e vazio são tratados', async () => {
  vi.spyOn(community, 'getRecentReviews').mockRejectedValueOnce(new Error('Falha')).mockResolvedValue([]);
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/comunidade']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByText('Carregando reviews recentes…')).toBeVisible();
  expect(await screen.findByText('Não foi possível carregar as reviews recentes.')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Nenhuma review publicada.')).toBeVisible();
});
