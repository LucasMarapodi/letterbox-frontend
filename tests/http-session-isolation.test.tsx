import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { SessionProvider, useSession } from '../src/session/SessionProvider';
import { createHttpSessionStore } from '../src/services/http/adapters';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, wireNotification, wireGame, withCatalog } from './http-fixtures';
import { deferred } from './fixtures';
const userA = { ...wireUser, id: 'user-1', displayName: 'Ana API' };
const userB = { ...wireUser, id: 'user-b', displayName: 'Bia API' };
const loginA = { user: userA, token: 'test-a', expiresAt: '2080-01-01T00:00:00Z' };
const loginB = { user: userB, token: 'test-b', expiresAt: loginA.expiresAt };
test('autenticação usa dashboard e não consulta favoritos/feed/notificações separadamente', async () => {
  const transport = vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json(loginA)).mockResolvedValueOnce(Response.json(userA));
  const adapters = createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport:withCatalog(transport)});
  const favorites = vi.spyOn(adapters.community,'getFavorites'); const feed = vi.spyOn(adapters.community,'getFeed'); const notifications = vi.spyOn(adapters.notifications,'list');
  const interaction = userEvent.setup(); render(<MemoryRouter initialEntries={['/login']}><AppRoutes adapters={adapters}/></MemoryRouter>);
  await interaction.type(screen.getByLabelText('E-mail'),'a@example.com'); await interaction.type(screen.getByLabelText('Senha'),'test-only'); await interaction.click(screen.getByRole('button',{name:'Entrar'}));
  expect(await screen.findByLabelText('Usuário conectado')).toHaveTextContent('Ana API');
  expect(favorites).not.toHaveBeenCalled(); expect(feed).not.toHaveBeenCalled(); expect(notifications).not.toHaveBeenCalled();
  expect(await screen.findByRole('region',{name:'Jogos favoritos'})).toBeVisible(); expect(screen.getByRole('button',{name:'Notificações'})).toBeVisible();
  expect(adapters.privateFeatures?.opinions).toBe(false);
});
test('serviços privados não aceitam identidade de usuário sem sessão HTTP', async () => {
  const adapters = createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'});
  await expect(adapters.community.getFeed(userA)).rejects.toMatchObject({code:'session-required'});
  await expect(adapters.notifications.list(userA)).rejects.toMatchObject({kind:'http',status:401});
});
function Probe(): React.ReactElement {
  const {user,signIn,signOut,version}=useSession();
  return <><p>{user?.displayName ?? 'Visitante'}</p><output aria-label="Versão da sessão">{version}</output><button onClick={()=>{void signIn({email:'a@example.com',password:'test-only'}).catch(()=>undefined);}}>Conta A</button><button onClick={()=>{void signIn({email:'b@example.com',password:'test-only'}).catch(()=>undefined);}}>Conta B</button><button onClick={()=>{void signOut();}}>Sair</button></>;
}
test('versão única e dados tardios de A não entram em B após logout', async () => {
  const pending = deferred<Response>();
  const transport = vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json(loginA)).mockResolvedValueOnce(Response.json(userA)).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(new Response(null,{status:204})).mockResolvedValueOnce(Response.json(loginB)).mockResolvedValueOnce(Response.json(userB)).mockResolvedValueOnce(Response.json([]));
  const session = createHttpSessionStore(); const adapters = createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport,session});
  const interaction=userEvent.setup(); render(<SessionProvider service={adapters.auth}><Probe/></SessionProvider>);
  await interaction.click(screen.getByRole('button',{name:'Conta A'})); await screen.findByText('Ana API');
  expect(Number(screen.getByLabelText('Versão da sessão').textContent)).toBe(session.version());
  const http=adapters.http?.(); expect(http).toBeDefined(); if(!http) throw new Error('Composição HTTP ausente.');
  expect(http.session).toBe(session);
  const old=http.notifications.list().catch((error:unknown)=>error);
  await interaction.click(screen.getByRole('button',{name:'Sair'})); expect(screen.getByText('Visitante')).toBeVisible();
  await interaction.click(screen.getByRole('button',{name:'Conta B'})); await screen.findByText('Bia API');
  await act(async()=>{pending.resolve(Response.json([{...wireNotification,userId:userA.id}])); await pending.promise;});
  expect(await old).toMatchObject({kind:'cancelled'}); expect(screen.queryByText('Ana API')).not.toBeInTheDocument();
  expect(await http.notifications.list()).toEqual([]);
  expect(Number(screen.getByLabelText('Versão da sessão').textContent)).toBe(session.version());
});
test('visitante não dispara consultas HTTP privadas', async()=>{
  const transport=vi.fn<FetchTransport>().mockImplementation(async()=>Response.json([wireGame])); render(<MemoryRouter><AppRoutes adapters={createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{transport})}/></MemoryRouter>);
  await screen.findByRole('link',{name:wireGame.title}); expect(transport).toHaveBeenCalledTimes(1);
  expect(transport.mock.calls[0][0]).toContain('/api/v1/games'); expect(transport.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
});
