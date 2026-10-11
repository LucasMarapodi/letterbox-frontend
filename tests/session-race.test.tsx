import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { SessionProvider, useSession } from '../src/session/SessionProvider';
import type { AuthService } from '../src/services/authContracts';
import type { User } from '../src/models';
import { deferred } from './fixtures';

const ana: User = { id: 'user-1', displayName: 'Ana', username: 'ana', bio: '', avatarUrl: null };
function SessionExample(): React.ReactElement {
  const { user, signIn, signOut } = useSession();
  return <><p>{user ? user.displayName : 'Visitante'}</p><button onClick={() => { void signIn({ email: 'ana@example.com', password: 'x' }).catch(() => undefined); }}>Entrar</button><button onClick={signOut}>Sair</button></>;
}
test('resposta de login anterior ao logout não restaura sessão e login novo funciona', async () => {
  const pending = deferred<User>();
  const service: AuthService = { login: vi.fn<AuthService['login']>().mockResolvedValueOnce(ana).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(ana), async register() { return ana; } };
  const interaction = userEvent.setup();
  render(<SessionProvider service={service}><SessionExample /></SessionProvider>);
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(screen.getByText('Ana')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await interaction.click(screen.getByRole('button', { name: 'Sair' }));
  expect(screen.getByText('Visitante')).toBeVisible();
  await act(async () => { pending.resolve(ana); await pending.promise; });
  expect(screen.getByText('Visitante')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(screen.getByText('Ana')).toBeVisible();
});
