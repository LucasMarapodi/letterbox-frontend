import { withFilterOptions } from './http-fixtures';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wirePage, wireUser } from './http-fixtures';
import { deferred } from './fixtures';

function open(register: () => Promise<Response>, path = '/cadastro', state: unknown = null) {
  const transport = vi.fn<FetchTransport>().mockImplementation(url => url.endsWith('/auth/register') ? register() : Promise.resolve(Response.json(wirePage())));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: withFilterOptions(transport)});
  const router = createMemoryRouter([{ path: '*', element: <AppRoutes adapters={adapters} /> }], { initialEntries: [{ pathname: path, state }] });
  render(<RouterProvider router={router} />);
  return { router, adapters, transport, interaction: userEvent.setup() };
}
async function fill(interaction: ReturnType<typeof userEvent.setup>) {
  await interaction.type(screen.getByLabelText('Nome'), 'Nova Pessoa');
  await interaction.type(screen.getByLabelText('E-mail'), 'nova@example.test');
  await interaction.type(screen.getByLabelText('Senha'), 'test-only');
}

test('cadastro confirmado substitui rota por login com aviso, sem sessão nem dados privados no histórico', async () => {
  const pending = deferred<Response>();
  const { router, adapters, transport, interaction } = open(() => pending.promise, '/');
  await interaction.click(screen.getByRole('link', { name: 'Criar conta' }));
  await fill(interaction);
  const form = screen.getByRole('form', { name: 'Cadastro' });
  act(() => { fireEvent.submit(form); fireEvent.submit(form); });
  expect(router.state.location.pathname).toBe('/cadastro');
  expect(screen.getByRole('button', { name: 'Criando conta…' })).toBeDisabled();
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/auth/register'))).toHaveLength(1);
  await act(async () => { pending.resolve(Response.json(wireUser, { status: 201 })); await pending.promise; });
  await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  expect(screen.getByRole('status')).toHaveTextContent('Conta criada. Entre para continuar.');
  expect(screen.getByRole('form', { name: 'Login' })).toBeVisible();
  expect(screen.queryByRole('form', { name: 'Cadastro' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Senha')).toHaveValue('');
  expect(router.state.location.state).toEqual({ registrationComplete: true });
  expect(adapters.auth.sessionUser?.()).toBeNull();
  expect(transport.mock.calls.some(([url]) => /\/auth\/(login|me)$/.test(url))).toBe(false);
  await act(async () => { await router.navigate(-1); });
  expect(router.state.location.pathname).toBe('/');
  expect(screen.queryByRole('form', { name: 'Cadastro' })).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('link', { name: 'Entrar' }));
  expect(screen.queryByText('Conta criada. Entre para continuar.')).not.toBeInTheDocument();
});

test.each([400, 409, 500, 'network', 'invalid-body'] as const)('falha %s mantém cadastro e campos; retry confirmado redireciona', async failure => {
  let fail = true;
  const { router, transport, interaction } = open(async () => {
    if (!fail) return Response.json(wireUser, { status: 201 });
    if (failure === 'network') throw new TypeError('offline');
    if (failure === 'invalid-body') return Response.json({ id: 'incomplete' }, { status: 201 });
    return Response.json({ code: failure === 400 ? 'validation_failed' : failure === 409 ? 'conflict' : 'internal_error', message: 'Falha.' }, { status: failure });
  });
  await fill(interaction);
  await interaction.click(screen.getByRole('button', { name: 'Criar conta' }));
  await screen.findByRole('alert');
  expect(router.state.location.pathname).toBe('/cadastro');
  expect(screen.getByLabelText('Nome')).toHaveValue('Nova Pessoa');
  expect(screen.getByLabelText('E-mail')).toHaveValue('nova@example.test');
  expect(screen.getByLabelText('Senha')).toHaveValue('test-only');
  expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled();
  expect(screen.queryByText('Conta criada. Entre para continuar.')).not.toBeInTheDocument();
  fail = false;
  await interaction.click(screen.getByRole('button', { name: 'Criar conta' }));
  await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/auth/register'))).toHaveLength(2);
  expect(transport.mock.calls.some(([url]) => /\/auth\/(login|me)$/.test(url))).toBe(false);
});

test('validação local não envia nem redireciona', async () => {
  const { router, transport, interaction } = open(async () => Response.json(wireUser));
  await interaction.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(screen.getByText('Informe o nome.')).toBeVisible();
  expect(router.state.location.pathname).toBe('/cadastro');
  expect(transport).not.toHaveBeenCalled();
});

test.each([null, 'texto', { registrationComplete: 'true' }])('login com estado não confirmado %j não exibe aviso de cadastro', state => {
  open(async () => Response.json(wireUser), '/login', state);
  expect(screen.queryByText('Conta criada. Entre para continuar.')).not.toBeInTheDocument();
});
