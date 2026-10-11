import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { AppRoutes } from '../src/App';
import userEvent from '@testing-library/user-event';

test('dashboard apresenta marca no topo e introdução central com acesso ao cadastro', () => {
  render(<MemoryRouter><AppRoutes /></MemoryRouter>);
  const header = screen.getByRole('banner');
  expect(within(header).getByRole('link', { name: 'Game Reviews' })).toHaveAttribute('href', '/');
  expect(within(header).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
  expect(within(header).getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro');
  expect(screen.getByText('Cada jogo, uma nova história.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Comece sua jornada' })).toHaveAttribute('href', '/cadastro');
});
test('dashboard autenticada apresenta catálogo sem apresentação ou convite de cadastro', async () => {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes /></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('heading', { name: 'Game Reviews', level: 1 })).toBeVisible();
  expect(screen.queryByText('Cada jogo, uma nova história.')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Comece sua jornada' })).not.toBeInTheDocument();
  expect(screen.getByRole('form', { name: 'Busca de jogos' })).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Sair' }));
  expect(screen.getByRole('link', { name: 'Comece sua jornada' })).toBeVisible();
});
