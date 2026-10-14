import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import type { User } from '../src/models';
import { wireUser, wireGame, wirePage } from './http-fixtures';
import { deferred } from './fixtures';

function Location(): React.ReactElement { return <output aria-label="Rota atual">{useLocation().pathname}</output>; }
async function open(path: string, options: { logout?: Promise<Response>; favorites?: Promise<Response> } = {}) {
  let currentUser: User = wireUser;
  let logins = 0;
  const transport = vi.fn<FetchTransport>().mockImplementation(async (url) => {
    const route = new URL(url).pathname;
    if (route.endsWith('/auth/login')) { logins++; currentUser = logins === 1 ? wireUser : { ...wireUser, id: `${wireUser.id}-next`, displayName: 'Nova conta' }; return Response.json({ user: currentUser, token: `test-session-${logins}`, expiresAt: '2080-01-01T00:00:00Z' }); }
    if (route.endsWith('/auth/me')) return Response.json(currentUser);
    if (route.endsWith('/auth/logout')) return options.logout ?? new Response(null, { status: 204 });
    if (route === '/api/v1/games') return Response.json(wirePage());
    if (route === '/api/v1/dashboard') return Response.json({ favorites: { games: [], reviews: [] }, feed: [] });
    if (route === '/api/v1/favorites') return options.favorites ?? Response.json({ games: [wireGame], reviews: [] });
    if (route.endsWith('/follow/me')) return Response.json({ following: false });
    if (route.endsWith('/reviews') || route.endsWith('/followers') || route.endsWith('/following') || route.includes('/community/')) return Response.json([]);
    if (route.includes('/users/')) return Response.json(currentUser);
    if (route.includes('/reviews/')) return Response.json({ code: 'not_found', message: 'Ausente' }, { status: 404 });
    throw new Error('Chamada não prevista no cenário.');
  });
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  await adapters.auth.login({ email: 'test@example.test', password: 'test-only' });
  const router = createMemoryRouter([{ path: '*', element: <><AppRoutes adapters={adapters} /><Location /></> }], { initialEntries: ['/comunidade', path], initialIndex: 1 });
  render(<RouterProvider router={router} />);
  await screen.findByRole('button', { name: 'Sair' });
  return { router, adapters, transport, user: userEvent.setup() };
}
test.each(['/perfil/u%252F1', '/reviews/review', '/comunidade'])('logout em %s substitui rota por Início como visitante', async (path) => {
  const { user, transport } = await open(path);
  await user.click(screen.getByRole('button', { name: 'Sair' }));
  await waitFor(() => expect(screen.getByLabelText('Rota atual')).toHaveTextContent(/^\/$/));
  expect(screen.queryByRole('link', { name: 'Meu perfil' })).not.toBeInTheDocument();
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/auth/logout'))).toHaveLength(1);
});
test('redireciona após limpeza local sem aguardar revogação; falha mantém aviso no Início', async () => {
  const pending = deferred<Response>();
  const { user } = await open('/comunidade', { logout: pending.promise });
  await user.click(screen.getByRole('button', { name: 'Sair' }));
  expect(screen.getByLabelText('Rota atual')).toHaveTextContent(/^\/$/);
  await act(async () => { pending.resolve(Response.error()); await pending.promise; });
  expect(await screen.findByRole('alert')).toHaveTextContent('não foi possível confirmar a revogação na API');
  expect(screen.queryByRole('link', { name: 'Meu perfil' })).not.toBeInTheDocument();
});
test('replace remove perfil do histórico; resposta privada tardia não reaparece nem reutiliza token', async () => {
  const pending = deferred<Response>();
  const { user, router, transport } = await open('/perfil/u%252F1', { favorites: pending.promise });
  await screen.findByText('Carregando favoritos…');
  const request = transport.mock.calls.find(([url]) => url.endsWith('/favorites'))?.[1];
  await user.click(screen.getByRole('button', { name: 'Sair' }));
  expect(screen.getByLabelText('Rota atual')).toHaveTextContent(/^\/$/);
  expect(request?.signal?.aborted).toBe(true);
  const afterLogout = transport.mock.calls.length;
  await act(async () => { pending.resolve(Response.json({ games: [wireGame], reviews: [] })); await pending.promise; });
  await act(async () => { await router.navigate(-1); });
  expect(screen.getByLabelText('Rota atual')).toHaveTextContent('/comunidade');
  expect(screen.queryByRole('region', { name: 'Jogos favoritos' })).not.toBeInTheDocument();
  for (const [, init] of transport.mock.calls.slice(afterLogout)) expect(init.headers).not.toHaveProperty('Authorization');
});
test.each([204, 503])('logout anterior tardio (%s) não encerra nem navega sobre nova sessão', async (status) => {
  const pending = deferred<Response>();
  const { user } = await open('/comunidade', { logout: pending.promise });
  await user.click(screen.getByRole('button', { name: 'Sair' }));
  await user.click(screen.getByRole('link', { name: 'Entrar', exact: true }));
  await user.type(screen.getByLabelText('E-mail'), 'new@example.test'); await user.type(screen.getByLabelText('Senha'), 'test-only');
  await user.click(screen.getByRole('button', { name: 'Entrar', exact: true }));
  await screen.findByText('Nova conta');
  await user.click(screen.getByRole('link', { name: 'Meu perfil' }));
  const path = screen.getByLabelText('Rota atual').textContent;
  await act(async () => { pending.resolve(status === 204 ? new Response(null, { status }) : Response.json({ code: 'http_error', message: 'Seguro' }, { status })); await pending.promise; });
  expect(screen.getByLabelText('Rota atual')).toHaveTextContent(path ?? '');
  expect(screen.getByLabelText('Usuário conectado')).toHaveTextContent('Nova conta');
  expect(screen.queryByText(/não foi possível confirmar a revogação/)).not.toBeInTheDocument();
});
