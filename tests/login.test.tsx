import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import type { AuthService } from '../src/services/authContracts';
import { AuthError } from '../src/services/authContracts';
import type { User } from '../src/models';
import { deferred } from './fixtures';

const user: User = { id: 'user-1', displayName: 'Ana', username: 'ana', avatarUrl: null, bio: '' };
function renderLogin(authService: Pick<AuthService, 'login'>): void {
  const service: AuthService = { ...authService, async register() { throw new Error('Cadastro não esperado no teste de login.'); } };
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes authService={service} /></MemoryRouter>);
}
async function fillLogin(): Promise<void> {
  const interaction = userEvent.setup();
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
}
test('campos vazios são validados sem chamar o serviço', async () => {
  const interaction = userEvent.setup();
  const login = vi.fn<AuthService['login']>().mockResolvedValue(user);
  renderLogin({ login });
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(screen.getByText('Informe o e-mail.')).toBeVisible();
  expect(screen.getByText('Informe a senha.')).toBeVisible();
  expect(login).not.toHaveBeenCalled();
});
test('login válido inicia sessão central e preserva sessão ao navegar', async () => {
  const interaction = userEvent.setup();
  const login = vi.fn<AuthService['login']>().mockResolvedValue(user);
  renderLogin({ login });
  await fillLogin();
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('heading', { name: 'Game Reviews', level: 1 })).toBeVisible();
  expect(screen.queryByRole('form', { name: 'Login' })).not.toBeInTheDocument();
  expect(screen.queryByText('Você entrou como Ana.')).not.toBeInTheDocument();
  expect(login).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'teste123' });
  await interaction.click(screen.getByRole('link', { name: 'Início' }));
  expect(screen.getByLabelText('Usuário conectado')).toHaveTextContent('Ana');
});

test('sessão troca links de autenticação por avatar e nome e logout restaura links', async () => {
  const interaction = userEvent.setup();
  renderLogin({ login: vi.fn<AuthService['login']>().mockResolvedValue({ ...user, avatarUrl: '/ana-avatar.png' }) });
  await fillLogin();
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  const header = within(screen.getByRole('banner'));
  expect(await header.findByRole('img', { name: 'Ana' })).toHaveAttribute('src', '/ana-avatar.png');
  expect(header.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
  expect(header.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument();
  expect(header.getByLabelText('Usuário conectado')).toHaveTextContent('Ana');
  await interaction.click(header.getByRole('button', { name: 'Sair' }));
  expect(header.getByRole('link', { name: 'Entrar' })).toBeVisible();
  expect(header.getByRole('link', { name: 'Criar conta' })).toBeVisible();
  expect(header.queryByRole('img', { name: 'Ana' })).not.toBeInTheDocument();
});
test('credenciais inválidas apresentam erro sem iniciar sessão', async () => {
  const interaction = userEvent.setup();
  renderLogin({ login: vi.fn<AuthService['login']>().mockRejectedValue(new AuthError('invalid-credentials')) });
  await fillLogin();
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
  expect(screen.queryByLabelText('Usuário conectado')).not.toBeInTheDocument();
});
test('envio pendente anuncia estado e impede submissões duplicadas', async () => {
  const pending = deferred<User>();
  const login = vi.fn<AuthService['login']>().mockReturnValue(pending.promise);
  renderLogin({ login });
  await fillLogin();
  const form = screen.getByRole('form', { name: 'Login' });
  await act(async () => { fireEvent.submit(form); fireEvent.submit(form); });
  expect(login).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Entrando…');
  await act(async () => { pending.resolve(user); await pending.promise; });
  expect(screen.getByLabelText('Usuário conectado')).toHaveTextContent('Ana');
});
