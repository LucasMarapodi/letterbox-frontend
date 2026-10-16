import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { AppRoutes } from '../src/App';
import { createMockServices } from './doubles/services';
import { authService } from '../src/services/auth';

test('cadastro disponibiliza perfil público antes de qualquer interação do autor', async () => {
  const services = createMockServices();
  const registered = await services.auth.register({ name: 'Nova pessoa', email: 'nova@example.com', password: 'teste123' });
  expect(await services.community.getProfile(registered.id)).toEqual({ user: registered, reviews: [] });
  registered.displayName = 'Alterado';
  expect((await services.community.getProfile(registered.id))?.user.displayName).toBe('Nova pessoa');
  await expect(services.auth.register({ name: 'Duplicado', email: 'nova@example.com', password: 'outra' })).rejects.toMatchObject({ code: 'duplicate-email' });
  expect(await services.community.getProfile('mock-user-2')).toBeNull();
  expect(await createMockServices().community.getProfile(registered.id)).toBeNull();
});

test('visitante abre perfil recém-cadastrado usando os serviços reais da aplicação', async () => {
  const registered = await authService.register({ name: 'Visitável', email: 'public-profile@example.com', password: 'teste123' });
  render(<MemoryRouter initialEntries={[`/perfil/${registered.id}`]}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Visitável' })).toBeVisible();
  expect(screen.getByText('Nenhuma review publicada por este usuário.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Entrar' })).toBeVisible();
  expect(screen.queryByText('Perfil não encontrado.')).not.toBeInTheDocument();
});
