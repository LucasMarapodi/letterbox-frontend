import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import type { ReactElement } from 'react';
import { NotificationBell } from '../src/components/NotificationBell';
import { SessionProvider, useSession } from '../src/session/SessionProvider';
import { createMockAuthService } from './doubles/authService';
import { userFixtures } from './doubles/opinions';
import { notifications } from '../src/services/notifications';
import type { NotificationItem } from '../src/services/notificationContracts';
import { deferred } from './fixtures';

afterEach(() => vi.restoreAllMocks());
function Harness(): ReactElement {
  const { signIn, signOut } = useSession();
  return <><button onClick={() => { void signIn({ email: 'ana@example.com', password: 'teste123' }); }}>Sessão Ana</button><button onClick={() => { void signIn({ email: 'leo@example.com', password: 'teste123' }); }}>Sessão Leo</button><button onClick={signOut}>Encerrar sessão</button><NotificationBell /></>;
}
function open(): ReturnType<typeof userEvent.setup> {
  const service = createMockAuthService({ accounts: userFixtures.map((user) => ({ user, email: `${user.username}@example.com`, password: 'teste123' })) });
  render(<MemoryRouter><SessionProvider service={service}><Harness /></SessionProvider></MemoryRouter>);
  return userEvent.setup();
}
async function login(): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = open();
  await interaction.click(screen.getByRole('button', { name: 'Sessão Ana' }));
  await interaction.click(screen.getByRole('button', { name: 'Notificações' }));
  return interaction;
}
test('componente não oferece sino sem sessão', () => {
  open();
  expect(screen.queryByRole('button', { name: 'Notificações' })).not.toBeInTheDocument();
});
test('foco inicial Tab Shift+Tab e tentativa de foco externo ficam no modal', async () => {
  const interaction = await login();
  const dialog = screen.getByRole('dialog');
  const close = within(dialog).getByRole('button', { name: 'Fechar notificações' });
  expect(close).toHaveFocus();
  const links = await within(dialog).findAllByRole('link');
  await interaction.tab({ shift: true });
  expect(links.at(-1)).toHaveFocus();
  await interaction.tab();
  expect(close).toHaveFocus();
  await interaction.tab();
  expect(links[0]).toHaveFocus();
  act(() => { screen.getByRole('button', { name: 'Sessão Leo' }).focus(); });
  expect(close).toHaveFocus();
});
test('botão fechar e Escape devolvem foco ao sino', async () => {
  const interaction = await login();
  await interaction.click(screen.getByRole('button', { name: 'Fechar notificações' }));
  expect(screen.getByRole('button', { name: 'Notificações' })).toHaveFocus();
  await interaction.click(screen.getByRole('button', { name: 'Notificações' }));
  await interaction.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Notificações' })).toHaveFocus();
});
test('modal vazio ou carregando mantém foco com um único controle', async () => {
  const pending = deferred<NotificationItem[]>();
  vi.spyOn(notifications, 'list').mockReturnValue(pending.promise);
  const interaction = await login();
  const close = screen.getByRole('button', { name: 'Fechar notificações' });
  await interaction.tab(); expect(close).toHaveFocus();
  await act(async () => { pending.resolve([]); await pending.promise; });
  await interaction.tab({ shift: true }); expect(close).toHaveFocus();
});
test('logout fecha modal e descarta dados e resposta pendente', async () => {
  const pending = deferred<NotificationItem[]>();
  vi.spyOn(notifications, 'list').mockReturnValue(pending.promise);
  await login();
  fireEvent.click(screen.getByRole('button', { name: 'Encerrar sessão' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await act(async () => { pending.resolve([]); await pending.promise; });
  expect(screen.queryByRole('button', { name: 'Notificações' })).not.toBeInTheDocument();
});
test('troca de conta fecha modal e ignora resposta da conta anterior', async () => {
  const pending = deferred<NotificationItem[]>();
  vi.spyOn(notifications, 'list').mockReturnValueOnce(pending.promise).mockResolvedValue([]);
  const interaction = await login();
  fireEvent.click(screen.getByRole('button', { name: 'Sessão Leo' }));
  await act(async () => { await Promise.resolve(); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('button', { name: 'Notificações' }));
  expect(await within(screen.getByRole('dialog')).findByText('Nenhuma notificação.')).toBeVisible();
  await act(async () => { pending.resolve([{ id: 'old', userId: 1, actorId: 2, reviewId: 'review-1', createdAt: '2026-01-01T12:00:00Z', type: 'new-review', actor: { id: 2, displayName: 'Evento antigo', avatarUrl: null } }]); await pending.promise; });
  expect(screen.queryByText(/Evento antigo/)).not.toBeInTheDocument();
  expect(notifications.list).toHaveBeenLastCalledWith(userFixtures[1]);
});
