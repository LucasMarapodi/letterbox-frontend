import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { createHttpAdapters, createHttpSessionStore } from '../src/services/http/adapters';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, withCatalog } from './http-fixtures';
import { deferred } from './fixtures';
const login = { user: wireUser, token: 'test-only', expiresAt: '2080-01-01T00:00:00Z' };
async function open(transport: FetchTransport, session = createHttpSessionStore()): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes adapters={createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5207' }, { transport: withCatalog(transport), session })} /></MemoryRouter>);
  await interaction.type(screen.getByLabelText('E-mail'),'test@example.com'); await interaction.type(screen.getByLabelText('Senha'),'test-only');
  await interaction.click(screen.getByRole('button',{ name: 'Entrar' })); await screen.findByLabelText('Usuário conectado'); return interaction;
}
test('logout envia token capturado e limpa UI/store antes de 204 pendente', async () => {
  const pending = deferred<Response>(); const transport = vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json(login)).mockResolvedValueOnce(Response.json(wireUser)).mockReturnValueOnce(pending.promise);
  const session = createHttpSessionStore(); const interaction = await open(transport, session);
  await interaction.click(screen.getByRole('button',{ name: 'Sair' }));
  expect(screen.queryByLabelText('Usuário conectado')).not.toBeInTheDocument(); expect(screen.queryByRole('button',{ name:'Notificações' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region',{ name:'Jogos favoritos' })).not.toBeInTheDocument(); expect(session.current()).toBeNull();
  expect(transport.mock.calls[2]?.[0]).toBe('http://localhost:5207/api/v1/auth/logout');
  expect(transport.mock.calls[2]?.[1].headers).toHaveProperty('Authorization','Bearer test-only');
  await act(async () => { pending.resolve(new Response(null,{status:204})); await pending.promise; });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
test('falha de revogação informa erro sem restaurar usuário', async () => {
  const transport = vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json(login)).mockResolvedValueOnce(Response.json(wireUser)).mockRejectedValueOnce(new Error('offline'));
  const interaction = await open(transport);
  await interaction.click(screen.getByRole('button',{ name:'Sair' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Você saiu deste dispositivo, mas não foi possível confirmar a revogação na API.');
  expect(screen.queryByLabelText('Usuário conectado')).not.toBeInTheDocument();
});
test('401 privado atual limpa usuário/sino/dados e mostra necessidade de login', async () => {
  const transport = vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json(login)).mockResolvedValueOnce(Response.json(wireUser)).mockResolvedValueOnce(Response.json({ code:'unauthorized',message:'Seguro' },{status:401}));
  const session = createHttpSessionStore(); await open(transport, session);
  const http = createHttpAdapters({apiBaseUrl:'http://localhost:5207'},{transport,session});
  await act(async () => { await expect(http.auth.me()).rejects.toMatchObject({status:401}); });
  expect(screen.queryByLabelText('Usuário conectado')).not.toBeInTheDocument(); expect(screen.queryByRole('button',{name:'Notificações'})).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Sua sessão expirou. Entre novamente.');
});
test('logout invalida login que ainda espera confirmação', async () => {
  const pending = deferred<Response>(); const transport = vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json(login)).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(new Response(null,{status:204}));
  const session = createHttpSessionStore(); const auth = createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport,session}).auth;
  const entering = auth.login({email:'test@example.com',password:'test-only'}).catch((error:unknown)=>error);
  // O transporte privado me precisa ter iniciado antes da revogação.
  await vi.waitFor(()=>expect(transport).toHaveBeenCalledTimes(2));
  await auth.logout?.(); pending.resolve(Response.json(wireUser));
  expect(await entering).toMatchObject({kind:'cancelled'}); expect(session.current()).toBeNull();
  expect(transport.mock.calls[2]?.[0]).toContain('/auth/logout');
});
