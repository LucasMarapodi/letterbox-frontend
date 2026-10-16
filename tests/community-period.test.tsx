import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { AppRoutes } from '../src/App';
import { commentsInPeriod } from './doubles/commentWindow';
import { isRankingPeriod, type RankingPeriod } from '../src/services/communityContracts';
import type { Comment } from '../src/models';

test('somente períodos documentados são aceitos', () => {
  expect(['24h', '7d', '30d'].every(isRankingPeriod)).toBe(true);
  expect(isRankingPeriod('1d')).toBe(false); expect(isRankingPeriod(null)).toBe(false);
});
test.each<[RankingPeriod, number]>([['24h', 24], ['7d', 168], ['30d', 720]])('janela %s inclui limites e normaliza fuso, exclui antes e futuro', (period, hours) => {
  const now = Date.parse('2026-10-11T12:00:00Z');
  const base: Comment = { id: 1, parentCommentId: null, likeCount: 0, reviewId: 1, userId: 2, text: 'Comentário', createdAt: '2026-10-11T09:00:00-03:00' };
  const comments = [base, { ...base, id: 2, createdAt: new Date(now - hours * 3600000).toISOString() }, { ...base, id: 3, createdAt: new Date(now - hours * 3600000 - 1).toISOString() }, { ...base, id: 4, createdAt: new Date(now + 1).toISOString() }];
  expect(commentsInPeriod(comments, period, () => new Date(now)).map((comment) => comment.id)).toEqual([1, 2]);
});
test('padrão 7 dias e seleção compartilhada entre rankings sem filtrar Recentes', async () => {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/comunidade']}><AppRoutes /></MemoryRouter>);
  expect(screen.queryByRole('combobox', { name: 'Período dos rankings' })).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('button', { name: 'Mais comentadas' }));
  expect(screen.getByRole('combobox', { name: 'Período dos rankings' })).toHaveValue('7d');
  await interaction.selectOptions(screen.getByRole('combobox'), '24h');
  await interaction.click(screen.getByRole('button', { name: 'Jogos em discussão' }));
  expect(screen.getByRole('combobox')).toHaveValue('24h');
  await interaction.click(screen.getByRole('button', { name: 'Recentes' }));
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(await screen.findByRole('link', { name: 'Leo' })).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Mais comentadas' }));
  expect(screen.getByRole('combobox')).toHaveValue('24h');
});
