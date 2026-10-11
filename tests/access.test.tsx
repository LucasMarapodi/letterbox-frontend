import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { SessionProvider, useSession } from '../src/session/SessionProvider';
import { RequireSession } from '../src/session/RequireSession';
import type { AuthService } from '../src/services/authContracts';
import type { User } from '../src/models';

const user: User = { id: 'user-1', displayName: 'Ana', username: 'ana', avatarUrl: null, bio: '' };
function service(): AuthService {
  return { login: vi.fn<AuthService['login']>().mockResolvedValue(user), register: vi.fn<AuthService['register']>().mockResolvedValue(user) };
}
test('visitante recebe caminho de login ao abrir notificações', () => {
  render(<MemoryRouter initialEntries={['/notificacoes']}><AppRoutes authService={service()} /></MemoryRouter>);
  expect(screen.getByText('Entre para acessar este conteúdo.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Entrar para continuar' })).toHaveAttribute('href', '/login');
  expect(screen.queryByText('Esta página é provisória. Funcionalidade prevista para as próximas US.')).not.toBeInTheDocument();
});
test('login libera notificações e logout revoga acesso na página atual', async () => {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes authService={service()} /></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByLabelText('Usuário conectado');
  await interaction.click(screen.getByRole('link', { name: 'Notificações' }));
  expect(screen.queryByText('Entre para acessar este conteúdo.')).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('button', { name: 'Sair' }));
  expect(screen.queryByLabelText('Usuário conectado')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Entrar para continuar' })).toBeVisible();
  await interaction.click(screen.getByRole('link', { name: 'Início' }));
  expect(screen.getByRole('heading', { name: 'Jogos' })).toBeVisible();
});
function ActionExample({ action }: { action: () => void }): React.ReactElement {
  const { signIn } = useSession();
  return <><button onClick={() => { void signIn({ email: 'ana@example.com', password: 'teste123' }); }}>Iniciar sessão</button><RequireSession><button onClick={action}>Ação restrita</button></RequireSession></>;
}
test('proteção reutilizável impede ação visitante e libera ação autenticada', async () => {
  const action = vi.fn<() => void>();
  const interaction = userEvent.setup();
  render(<MemoryRouter><SessionProvider service={service()}><ActionExample action={action} /></SessionProvider></MemoryRouter>);
  expect(screen.queryByRole('button', { name: 'Ação restrita' })).not.toBeInTheDocument();
  expect(action).not.toHaveBeenCalled();
  await interaction.click(screen.getByRole('button', { name: 'Iniciar sessão' }));
  await interaction.click(await screen.findByRole('button', { name: 'Ação restrita' }));
  expect(action).toHaveBeenCalledTimes(1);
});
