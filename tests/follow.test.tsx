import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createMockCommunityService } from './doubles/communityService';
import { community } from '../src/services/community';
import { userFixtures } from './doubles/opinions';
import { deferred } from './fixtures';

afterEach(() => vi.restoreAllMocks());
const ana = userFixtures[0];
test('seguir e deixar de seguir são direcionais e duplicidade é rejeitada', async () => {
  const service = createMockCommunityService();
  expect(await service.isFollowing(2, ana)).toBe(false);
  await service.setFollowing(2, true, ana);
  expect(await service.isFollowing(2, ana)).toBe(true);
  expect(await service.isFollowing(1, userFixtures[1])).toBe(false);
  await expect(service.setFollowing(2, true, ana)).rejects.toMatchObject({ code: 'duplicate-follow' });
  await service.setFollowing(2, false, ana);
  expect(await service.isFollowing(2, ana)).toBe(false);
});
test('serviço bloqueia visitante própria conta e destino inexistente', async () => {
  const service = createMockCommunityService();
  await expect(service.setFollowing(2, true, null)).rejects.toMatchObject({ code: 'session-required' });
  await expect(service.setFollowing(ana.id, true, ana)).rejects.toMatchObject({ code: 'self-follow' });
  await expect(service.setFollowing(999, true, ana)).rejects.toMatchObject({ code: 'not-found' });
});
async function open(): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes /><Link to="/perfil/2">Perfil de Leo</Link></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByRole('link', { name: 'Meu perfil' });
  await interaction.click(screen.getByRole('link', { name: 'Perfil de Leo' }));
  return interaction;
}
test('perfil consulta estado alterna relação e próprio perfil não permite seguir', async () => {
  const service = createMockCommunityService();
  vi.spyOn(community, 'isFollowing').mockImplementation(service.isFollowing);
  vi.spyOn(community, 'setFollowing').mockImplementation(service.setFollowing);
  const interaction = await open();
  await interaction.click(await screen.findByRole('button', { name: 'Seguir' }));
  await interaction.click(await screen.findByRole('button', { name: 'Deixar de seguir' }));
  expect(await screen.findByRole('button', { name: 'Seguir' })).toHaveAttribute('aria-pressed', 'false');
  await interaction.click(screen.getByRole('link', { name: 'Meu perfil' }));
  await screen.findByRole('heading', { name: 'Ana' });
  expect(screen.queryByRole('button', { name: 'Seguir' })).not.toBeInTheDocument();
});
test('visitante tem acesso público mas não altera relações', async () => {
  const set = vi.spyOn(community, 'setFollowing');
  render(<MemoryRouter initialEntries={['/perfil/2']}><AppRoutes /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Leo' });
  expect(screen.getByRole('link', { name: 'Entrar para seguir' })).toHaveAttribute('href', '/login');
  expect(set).not.toHaveBeenCalled();
});
test('erro de alteração não confirma relação e erro de leitura permite nova tentativa', async () => {
  vi.spyOn(community, 'isFollowing').mockRejectedValueOnce(new Error('Falha')).mockResolvedValue(false);
  vi.spyOn(community, 'setFollowing').mockRejectedValue(new Error('Falha'));
  const interaction = await open();
  await screen.findByText('Não foi possível consultar a relação.');
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await interaction.click(await screen.findByRole('button', { name: 'Seguir' }));
  expect(await screen.findByText('Não foi possível atualizar a relação. Tente novamente.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Seguir' })).toHaveAttribute('aria-pressed', 'false');
});
test('envio pendente não duplica e resposta após logout não restaura ação', async () => {
  const pending = deferred<void>();
  vi.spyOn(community, 'isFollowing').mockResolvedValue(false);
  const set = vi.spyOn(community, 'setFollowing').mockReturnValue(pending.promise);
  const interaction = await open();
  const button = await screen.findByRole('button', { name: 'Seguir' });
  await act(async () => { fireEvent.click(button); fireEvent.click(button); });
  expect(set).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Seguir' })).toBeDisabled();
  await interaction.click(screen.getByRole('button', { name: 'Sair' }));
  await act(async () => { pending.resolve(); await pending.promise; });
  expect(screen.queryByRole('button', { name: 'Deixar de seguir' })).not.toBeInTheDocument();
});
