import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser } from './http-fixtures';
import { deferred } from './fixtures';
test('runtime de produção cadastra pela API com corpo exato sem autenticar', async () => {
  const transport = vi.fn<FetchTransport>().mockResolvedValue(Response.json(wireUser, { status: 201 }));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5207' }, { transport });
  expect(await adapters.auth.register({ name: 'Ana', email: 'test@example.com', password: 'test-only' })).toEqual(wireUser);
  expect(transport).toHaveBeenCalledTimes(1);
  expect(transport.mock.calls[0][0]).toBe('http://localhost:5207/api/v1/auth/register');
  expect(transport.mock.calls[0][1]).toMatchObject({ method: 'POST', body: '{"name":"Ana","email":"test@example.com","password":"test-only"}' });
  expect(transport.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
});
async function open(transport: FetchTransport): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/cadastro']}><AppRoutes adapters={createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5207' }, { transport })} /></MemoryRouter>);
  await interaction.type(screen.getByLabelText('Nome'), 'Ana');
  await interaction.type(screen.getByLabelText('E-mail'), 'test@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'test-only'); return interaction;
}
test.each([[400,'validation_failed','Os dados do cadastro são inválidos. Confira os campos.'],[409,'conflict','Este e-mail já está cadastrado.']] as const)('cadastro HTTP %s mostra erro sem sucesso ou conta local', async (status, code, message) => {
  const interaction = await open(vi.fn<FetchTransport>().mockResolvedValue(Response.json({ code, message: 'Seguro' }, { status })));
  await interaction.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(screen.queryByText('Conta criada. Entre para continuar.')).not.toBeInTheDocument();
});
test('pendência HTTP bloqueia envio duplicado e sucesso abre login sem sessão', async () => {
  const pending = deferred<Response>(); const transport = vi.fn<FetchTransport>().mockReturnValue(pending.promise);
  await open(transport);
  await act(async () => { fireEvent.submit(screen.getByRole('form', { name: 'Cadastro' })); fireEvent.submit(screen.getByRole('form', { name: 'Cadastro' })); });
  expect(transport).toHaveBeenCalledTimes(1); expect(screen.getByRole('button', { name: 'Criando conta…' })).toBeDisabled();
  await act(async () => { pending.resolve(Response.json(wireUser, { status: 201 })); await pending.promise; });
  expect(await screen.findByRole('form', { name: 'Login' })).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('Conta criada. Entre para continuar.');
  expect(screen.queryByLabelText('Usuário conectado')).not.toBeInTheDocument();
});
test('resposta incompatível e API desligada não criam conta substituta', async () => {
  const transport = vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json({ id: 'incomplete' }, { status: 201 })).mockRejectedValueOnce(new Error('offline'));
  const auth = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5207' }, { transport }).auth;
  await expect(auth.register({ name: 'Ana', email: 'test@example.com', password: 'test-only' })).rejects.toMatchObject({ kind: 'contract' });
  await expect(auth.register({ name: 'Ana', email: 'test@example.com', password: 'test-only' })).rejects.toMatchObject({ kind: 'network' });
});
