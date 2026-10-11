import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { AppRoutes } from '../src/App';

test('dashboard apresenta marca no topo e introdução central com acesso ao cadastro', () => {
  render(<MemoryRouter><AppRoutes /></MemoryRouter>);
  const header = screen.getByRole('banner');
  expect(within(header).getByRole('link', { name: 'Game Reviews' })).toHaveAttribute('href', '/');
  expect(within(header).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
  expect(within(header).getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro');
  expect(screen.getByText('Cada jogo, uma nova história.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Comece sua jornada' })).toHaveAttribute('href', '/cadastro');
});
