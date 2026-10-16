import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { notifications } from '../src/services/notifications';
import type { NotificationItem } from '../src/services/notificationContracts';
import { deferred } from './fixtures';

afterEach(() => vi.restoreAllMocks());
function Location(): React.ReactElement { return <output aria-label="Endereço atual">{useLocation().pathname}</output>; }
async function login(): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes /><Location /></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByRole('link', { name: 'Review de exemplo' });
  return interaction;
}
test('visitante não vê sino e rota exclusiva continua inexistente', async () => {
  const list = vi.spyOn(notifications, 'list');
  render(<MemoryRouter initialEntries={['/notificacoes']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Notificações' })).not.toBeInTheDocument();
  expect(list).not.toHaveBeenCalled();
});
test('sino abre modal nomeado sem mudar URL e exibe eventos pessoais na ordem do serviço', async () => {
  const interaction = await login();
  await interaction.click(screen.getByRole('link', { name: 'Jogo de exemplo' }));
  await interaction.click(screen.getByRole('button', { name: 'Notificações' }));
  const dialog = screen.getByRole('dialog', { name: 'Notificações' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(screen.getByLabelText('Endereço atual')).toHaveTextContent('/jogos/game-1');
  const items = await within(dialog).findAllByRole('link');
  expect(items.map((item) => item.textContent)).toEqual([
    expect.stringContaining('Leo comentou na sua review'), expect.stringContaining('Leo publicou uma nova review'),
  ]);
  expect(items[0]).toHaveAttribute('href', '/reviews/review-1');
  expect(within(dialog).getByText(/03\/01\/2026/)).toBeVisible();
});
test('carregamento e vazio ficam no modal e fechar descarta consulta pendente', async () => {
  const pending = deferred<NotificationItem[]>();
  vi.spyOn(notifications, 'list').mockReturnValueOnce(pending.promise).mockResolvedValue([]);
  const interaction = await login();
  await interaction.click(screen.getByRole('button', { name: 'Notificações' }));
  expect(within(screen.getByRole('dialog')).getByText('Carregando notificações…')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Fechar notificações' }));
  await act(async () => { pending.resolve([]); await pending.promise; });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('button', { name: 'Notificações' }));
  expect(await within(screen.getByRole('dialog')).findByText('Nenhuma notificação.')).toBeVisible();
});
test('erro no modal permite nova tentativa', async () => {
  vi.spyOn(notifications, 'list').mockRejectedValueOnce(new Error('Falha')).mockResolvedValue([]);
  const interaction = await login();
  await interaction.click(screen.getByRole('button', { name: 'Notificações' }));
  const dialog = screen.getByRole('dialog');
  expect(await within(dialog).findByText('Não foi possível carregar as notificações.')).toBeVisible();
  await interaction.click(within(dialog).getByRole('button', { name: 'Tentar novamente' }));
  expect(await within(dialog).findByText('Nenhuma notificação.')).toBeVisible();
});
test('selecionar notificação fecha modal e abre review correta', async () => {
  const interaction = await login();
  await interaction.click(screen.getByRole('button', { name: 'Notificações' }));
  await interaction.click(await within(screen.getByRole('dialog')).findByRole('link', { name: /Leo publicou uma nova review/ }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Endereço atual')).toHaveTextContent('/reviews/review-2');
  expect(await screen.findByText('Um mundo pequeno, mas cheio de detalhes para descobrir.')).toBeVisible();
});
