import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { decodeUser, decodeReview, decodeComment, decodeRating, decodeFavorite, decodeNotification, decodeLogin } from '../src/services/http/decoders';
import { wireUser, wireReview, wireComment, wireRating, wireFavorite, wireNotification, wireGame, wirePage } from './http-fixtures';

const numericUser = { ...wireUser, id: 42 };
const numericAuthor = { ...wireReview.author, id: 42 };
const numericReview = { ...wireReview, userId: 42, author: numericAuthor };
test('identidade numérica da API usa números consistentes em todas as projeções', () => {
  expect(decodeUser(numericUser).id).toBe(42);
  expect(decodeReview(numericReview)).toMatchObject({ userId: 42, author: { id: 42 } });
  expect(decodeComment({ ...wireComment, userId: 42, author: numericAuthor })).toMatchObject({ userId: 42, author: { id: 42 } });
  expect(decodeRating({ ...wireRating, userId: 42 }).userId).toBe(42);
  expect(decodeFavorite({ ...wireFavorite, userId: 42 }).userId).toBe(42);
  expect(decodeNotification({ ...wireNotification, userId: 43, actorId: 42, actor: numericAuthor })).toMatchObject({ userId: 43, actorId: 42, actor: { id: 42 } });
});
test.each([0, -1, 1.5, NaN, Infinity, 2_147_483_648, null, true, {}, '42', 'u%2F1', ''])('identidade numérica inválida %j é rejeitada', id => {
  expect(() => decodeUser({ ...numericUser, id })).toThrow();
});
test('IDs próprios de favoritos e tokens continuam textuais', () => {
  expect(() => decodeFavorite({ ...wireFavorite, id: 42 })).toThrow();
  expect(() => decodeLogin({ user: numericUser, token: 42, expiresAt: '2080-01-01T00:00:00Z' })).toThrow();
});
test('login numérico confirma me, abre dashboard e mantém perfil próprio/edição de review acessíveis', async () => {
  const transport = vi.fn<FetchTransport>().mockImplementation(async url => {
    const path = new URL(url).pathname;
    if (path.endsWith('/auth/login')) return Response.json({ token: 'test-only', expiresAt: '2080-01-01T00:00:00Z', user: numericUser });
    if (path.endsWith('/auth/me') || path === '/api/v1/users/42') return Response.json(numericUser);
    if (path.endsWith('/dashboard')) return Response.json({ favorites: { games: [], reviews: [] }, feed: [numericReview] });
    if (path === '/api/v1/games') return Response.json(wirePage());
    if (path.endsWith('/favorites')) return Response.json({ games: [], reviews: [] });
    if (path.includes('/favorites/')) return Response.json({ favorite: null });
    if (path === `/api/v1/reviews/${encodeURIComponent(wireReview.id)}`) return Response.json(numericReview);
    if (path === '/api/v1/users/42/reviews') return Response.json([numericReview]);
    return Response.json([]);
  });
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes adapters={adapters} /></MemoryRouter>);
  const interaction = userEvent.setup();
  await interaction.type(screen.getByLabelText('E-mail'), 'test@example.test');
  await interaction.type(screen.getByLabelText('Senha'), 'test-only');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByLabelText('Usuário conectado')).toHaveTextContent('Ana');
  await waitFor(() => expect(screen.queryByRole('form', { name: 'Login' })).not.toBeInTheDocument());
  expect(screen.getByRole('link', { name: 'Meu perfil' })).toHaveAttribute('href', '/perfil/42');
  expect(adapters.auth.sessionUser?.()?.id).toBe(42);
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/auth/me'))).toHaveLength(1);
  await interaction.click(screen.getByRole('link', { name: 'Meu perfil' }));
  expect(await screen.findByRole('form', { name: 'Editar perfil' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Seguir Ana' })).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('link', { name: `Ler review de ${wireGame.title}` }));
  expect(await screen.findByRole('form', { name: 'Salvar review' })).toBeVisible();
  expect(screen.queryByLabelText('Seu comentário')).not.toBeInTheDocument();
});

test.each(['login', 'register'] as const)('storage_unavailable em %s é reconhecido sem criar sessão e permite retry', async operation => {
  const transport = vi.fn<FetchTransport>().mockImplementation(async () => Response.json({ code: 'storage_unavailable', message: 'Armazenamento indisponível.' }, { status: 503 }));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  const input = { name: 'Teste', email: 'test@example.test', password: 'test-only' };
  await expect(adapters.auth[operation](input)).rejects.toMatchObject({ code: 'storage-unavailable' });
  expect(adapters.auth.sessionUser?.()).toBeNull();
  render(<MemoryRouter initialEntries={[operation === 'login' ? '/login' : '/cadastro']}><AppRoutes adapters={adapters} /></MemoryRouter>);
  const interaction = userEvent.setup();
  if (operation === 'register') await interaction.type(screen.getByLabelText('Nome'), input.name);
  await interaction.type(screen.getByLabelText('E-mail'), input.email);
  await interaction.type(screen.getByLabelText('Senha'), input.password);
  await interaction.click(screen.getByRole('button', { name: operation === 'login' ? 'Entrar' : 'Criar conta' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('O armazenamento está temporariamente indisponível. Tente novamente.');
  expect(screen.getByLabelText('Senha')).toHaveValue('test-only');
  expect(screen.getByRole('button', { name: operation === 'login' ? 'Entrar' : 'Criar conta' })).toBeEnabled();
});

test('storage_unavailable na confirmação me elimina token ainda não confirmado', async () => {
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: async url => url.endsWith('/auth/login') ? Response.json({ token: 'test-only', expiresAt: '2080-01-01T00:00:00Z', user: numericUser }) : Response.json({ code: 'storage_unavailable', message: 'Armazenamento indisponível.' }, { status: 503 }) });
  await expect(adapters.auth.login({ email: 'test@example.test', password: 'test-only' })).rejects.toMatchObject({ code: 'storage-unavailable' });
  expect(adapters.http?.().session.current()).toBeNull();
  expect(adapters.auth.sessionUser?.()).toBeNull();
});
