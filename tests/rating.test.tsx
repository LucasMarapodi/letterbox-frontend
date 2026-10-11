import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { AppRoutes } from '../src/App';
import { createMockCommunityService } from '../src/mocks/communityService';
import type { User } from '../src/models';

const ana: User = { id: 'user-1', displayName: 'Ana', username: 'ana', bio: '', avatarUrl: null };
test.each([0, 5, 2.5])('serviço aceita nota %s independente de texto', async (value) => {
  expect(await createMockCommunityService().rate('game-1', value, ana)).toMatchObject({ gameId: 'game-1', userId: ana.id, value });
});
test.each([-1, 6, NaN, Infinity])('serviço rejeita nota %s', async (value) => {
  await expect(createMockCommunityService().rate('game-1', value, ana)).rejects.toMatchObject({ code: 'invalid-rating' });
});
test('serviço exige sessão', async () => {
  await expect(createMockCommunityService().rate('game-1', 3, null)).rejects.toMatchObject({ code: 'session-required' });
});
test('visitante não salva nota', async () => {
  render(<MemoryRouter initialEntries={['/jogos/game-1']}><AppRoutes /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Ecos do Horizonte' });
  expect(screen.queryByRole('button', { name: 'Salvar nota' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Entrar para continuar' })).toBeVisible();
});
test('usuário salva nota zero e logout remove controle', async () => {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes /></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByLabelText('Usuário conectado');
  await interaction.click(screen.getByRole('link', { name: 'Início' }));
  await interaction.click(screen.getByRole('link', { name: 'Jogo de exemplo' }));
  await interaction.selectOptions(await screen.findByLabelText('Sua nota'), '0');
  await interaction.click(screen.getByRole('button', { name: 'Salvar nota' }));
  expect(await screen.findByText('Nota 0 salva.')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Sair' }));
  expect(screen.queryByRole('button', { name: 'Salvar nota' })).not.toBeInTheDocument();
});
