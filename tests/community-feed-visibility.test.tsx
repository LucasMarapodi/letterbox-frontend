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

test('autenticado vê o feed sob demanda; após logout Comunidade abre em Recentes sem Feed', async () => {
  const services = createTestApplicationServices();
  const feed = vi.spyOn(services.community, 'getFeed'); const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes adapters={services} /></MemoryRouter>);
  await interaction.type(screen.getByLabelText('E-mail'), 'ana@example.com'); await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' })); await screen.findByLabelText('Usuário conectado');
  await interaction.click(screen.getByRole('link', { name: 'Comunidade' }));
  expect(feed).not.toHaveBeenCalled(); await interaction.click(screen.getByRole('button', { name: 'Feed de reviews' }));
  await screen.findByRole('region', { name: 'Feed de reviews' }); expect(feed).toHaveBeenCalledOnce();
  await interaction.click(screen.getByRole('button', { name: /Sair/ }));
  await interaction.click(screen.getByRole('link', { name: 'Comunidade' }));
  expect(screen.queryByRole('button', { name: 'Feed de reviews' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Feed de reviews' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Recentes' })).toHaveAttribute('aria-pressed', 'true');
  expect(await screen.findByRole('heading', { name: 'Reviews recentes' })).toBeVisible();
});
