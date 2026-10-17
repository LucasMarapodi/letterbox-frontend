import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createTestApplicationServices } from './doubles/applicationServices';

test('visitante não vê aba Feed de reviews nem convite de acesso', async () => {
  const services = createTestApplicationServices(); const feed = vi.spyOn(services.community, 'getFeed');
  render(<MemoryRouter initialEntries={['/comunidade']}><AppRoutes adapters={services} /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Reviews recentes' });
  expect(screen.queryByRole('button', { name: 'Feed de reviews' })).not.toBeInTheDocument();
  expect(screen.queryByText('Entrar para ver o feed')).not.toBeInTheDocument(); expect(feed).not.toHaveBeenCalled();
});

test('autenticado vê o feed sob demanda; logout remove aba/conteúdo e volta a Recentes', async () => {
  const services = createTestApplicationServices(); await services.auth.login({ email: 'ana@example.com', password: 'teste123' });
  const feed = vi.spyOn(services.community, 'getFeed'); const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/comunidade']}><AppRoutes adapters={services} /></MemoryRouter>);
  expect(feed).not.toHaveBeenCalled(); await interaction.click(screen.getByRole('button', { name: 'Feed de reviews' }));
  await screen.findByRole('region', { name: 'Feed de reviews' }); expect(feed).toHaveBeenCalledOnce();
  await interaction.click(screen.getByRole('button', { name: /Sair/ }));
  expect(screen.queryByRole('button', { name: 'Feed de reviews' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Feed de reviews' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Recentes' })).toHaveAttribute('aria-pressed', 'true');
  expect(await screen.findByRole('heading', { name: 'Reviews recentes' })).toBeVisible();
});
