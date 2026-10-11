import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { AppRoutes } from '../src/App';

test('visitante abre Comunidade por teclado e retorna ao catálogo', async () => {
  const interaction = userEvent.setup();
  render(<MemoryRouter><AppRoutes /></MemoryRouter>);
  const link = screen.getByRole('link', { name: 'Comunidade' });
  expect(link).toHaveAttribute('href', '/comunidade');
  link.focus(); await interaction.keyboard('{Enter}');
  expect(screen.getByRole('heading', { name: 'Comunidade' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Recentes' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Mais comentadas' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Jogos em discussão' })).toBeVisible();
  await interaction.click(screen.getByRole('link', { name: 'Início' }));
  expect(await screen.findByRole('textbox', { name: 'Buscar jogos' })).toBeVisible();
});
test('acesso direto à Comunidade é público', () => {
  render(<MemoryRouter initialEntries={['/comunidade']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Comunidade' })).toBeVisible();
  expect(screen.queryByText('Entre para acessar este conteúdo.')).not.toBeInTheDocument();
});
test('sessão autenticada preserva o item Comunidade', async () => {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes /></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByRole('link', { name: 'Meu perfil' });
  await interaction.click(screen.getByRole('link', { name: 'Comunidade' }));
  expect(screen.getByRole('heading', { name: 'Comunidade' })).toBeVisible();
});
