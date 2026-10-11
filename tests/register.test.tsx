import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { AuthError, type AuthService } from '../src/services/authContracts';
import type { User } from '../src/models';
import { deferred } from './fixtures';

const user: User = { id: 'new-user', displayName: 'Nova Pessoa', username: 'mock-user', avatarUrl: null, bio: '' };
function renderRegister(register: AuthService['register']): void {
  const authService: AuthService = { register, login: vi.fn<AuthService['login']>().mockResolvedValue(user) };
  render(<MemoryRouter initialEntries={['/cadastro']}><AppRoutes authService={authService} /></MemoryRouter>);
}
async function fillRegister(email: string = 'nova@example.com'): Promise<void> {
  const interaction = userEvent.setup();
  await interaction.type(screen.getByRole('textbox', { name: 'Nome' }), 'Nova Pessoa');
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), email);
  await interaction.type(screen.getByLabelText('Senha'), 'x');
}
test('cadastro vazio valida presença dos três campos sem envio', async () => {
  const interaction = userEvent.setup();
  const register = vi.fn<AuthService['register']>().mockResolvedValue(user);
  renderRegister(register);
  await interaction.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(screen.getByText('Informe o nome.')).toBeVisible();
  expect(screen.getByText('Informe o e-mail.')).toBeVisible();
  expect(screen.getByText('Informe a senha.')).toBeVisible();
  expect(register).not.toHaveBeenCalled();
});
test('formato inválido de e-mail impede envio', async () => {
  const interaction = userEvent.setup();
  const register = vi.fn<AuthService['register']>().mockResolvedValue(user);
  renderRegister(register);
  await fillRegister('invalido');
  await interaction.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(screen.getByText('Informe um e-mail válido.')).toBeVisible();
  expect(register).not.toHaveBeenCalled();
});
test('cadastro válido mostra sucesso sem login automático nem exigência de senha longa', async () => {
  const interaction = userEvent.setup();
  const register = vi.fn<AuthService['register']>().mockResolvedValue(user);
  renderRegister(register);
  await fillRegister();
  await interaction.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Conta criada. Entre para continuar.');
  expect(register).toHaveBeenCalledWith({ name: 'Nova Pessoa', email: 'nova@example.com', password: 'x' });
  expect(screen.queryByLabelText('Usuário conectado')).not.toBeInTheDocument();
});
test('e-mail duplicado mostra erro no cadastro', async () => {
  const interaction = userEvent.setup();
  renderRegister(vi.fn<AuthService['register']>().mockRejectedValue(new AuthError('duplicate-email')));
  await fillRegister();
  await interaction.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Este e-mail já está cadastrado.');
});
test('cadastro pendente não permite duplicar envio', async () => {
  const pending = deferred<User>();
  const register = vi.fn<AuthService['register']>().mockReturnValue(pending.promise);
  renderRegister(register);
  await fillRegister();
  const form = screen.getByRole('form', { name: 'Cadastro' });
  await act(async () => { fireEvent.submit(form); fireEvent.submit(form); });
  expect(register).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Criando conta…' })).toBeDisabled();
  await act(async () => { pending.resolve(user); await pending.promise; });
  expect(screen.getByRole('status')).toHaveTextContent('Conta criada. Entre para continuar.');
});
