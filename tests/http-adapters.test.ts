import { wirePage } from './http-fixtures';
import { expect, test, vi } from 'vitest';
import { createHttpAdapters, createHttpSessionStore, readHttpConfig, type HttpAdapters } from '../src/services/http/adapters';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, wireGame, wireReview, wireComment, wireRating, wireFavorite, wireNotification } from './http-fixtures';
import { deferred } from './fixtures';
const login = { user: wireUser, token: 'test-only', expiresAt: '2080-01-01T00:00:00Z' };
test('configuração HTTP obrigatória e isolada de doubles da aplicação', () => {
  expect(readHttpConfig({ apiBaseUrl: ' http://localhost:5207/ ' })).toEqual({ apiBaseUrl: 'http://localhost:5207' });
  for (const input of [{}, { apiBaseUrl: '' }, { apiBaseUrl: 42 }, { apiBaseUrl: '/api' }, { apiBaseUrl: 'ftp://localhost' }]) expect(() => readHttpConfig(input)).toThrow();
});
interface EndpointCase { name: string; method: string; path: string; run(adapters: HttpAdapters): Promise<unknown>; response: unknown; private?: boolean; body?: unknown; }
const endpoints: EndpointCase[] = [
  { name: 'register', method: 'POST', path: '/auth/register', run: (a) => a.auth.register({ name: 'Ana', email: 'test@example.com', password: 'test-only' }), response: wireUser, body: { name: 'Ana', email: 'test@example.com', password: 'test-only' } },
  { name: 'login', method: 'POST', path: '/auth/login', run: (a) => a.auth.login({ email: 'test@example.com', password: 'test-only' }), response: login, body: { email: 'test@example.com', password: 'test-only' } },
  { name: 'me', method: 'GET', path: '/auth/me', run: (a) => a.auth.me(), response: wireUser, private: true },
  { name: 'logout', method: 'POST', path: '/auth/logout', run: (a) => a.auth.logout(), response: undefined, private: true },
  { name: 'games', method: 'GET', path: '/games?term=a+%26+b&sort=name-desc', run: (a) => a.games.list({ term: 'a & b', sort: 'name-desc' }), response: wirePage([wireGame]) },
  { name: 'game', method: 'GET', path: '/games/game%252F42', run: (a) => a.games.get(wireGame.id), response: wireGame },
  { name: 'opinions', method: 'GET', path: '/games/g/opinions', run: (a) => a.games.opinions('g'), response: { averageRating: 0, reviews: [wireReview] } },
  { name: 'rating-read', method: 'GET', path: '/games/g/rating/me', run: (a) => a.games.myRating('g'), response: { rating: null }, private: true },
  { name: 'rating-write', method: 'PUT', path: '/games/g/rating/me', run: (a) => a.games.rate('g', { value: 4.5 }), response: wireRating, private: true, body: { value: 4.5 } },
  { name: 'game-reviews', method: 'GET', path: '/games/g/reviews', run: (a) => a.games.reviews('g'), response: [wireReview] },
  { name: 'own-review', method: 'GET', path: '/games/g/reviews/me', run: (a) => a.games.myReview('g'), response: { review: null }, private: true },
  { name: 'publish', method: 'POST', path: '/games/g/reviews', run: (a) => a.games.publish('g', { text: 'Review' }), response: wireReview, private: true, body: { text: 'Review' } },
  { name: 'review', method: 'GET', path: '/reviews/r%2F1', run: (a) => a.reviews.get(wireReview.id), response: wireReview },
  { name: 'edit-review', method: 'PATCH', path: '/reviews/r%2Fedit-unused', run: (a) => a.reviews.edit('r/edit-unused', { text: 'Review' }), response: wireReview, private: true, body: { text: 'Review' } },
  { name: 'comments', method: 'GET', path: '/reviews/r/comments', run: (a) => a.reviews.comments('r'), response: [wireComment] },
  { name: 'comment', method: 'POST', path: '/reviews/r/comments', run: (a) => a.reviews.comment('r', { text: 'Olá' }), response: wireComment, private: true, body: { text: 'Olá' } },
  { name: 'user', method: 'GET', path: '/users/u', run: (a) => a.profiles.get('u'), response: wireUser },
  { name: 'profile-edit', method: 'PATCH', path: '/users/me/profile', run: (a) => a.profiles.edit({ bio: '', avatarUrl: null }), response: wireUser, private: true, body: { bio: '', avatarUrl: null } },
  { name: 'user-reviews', method: 'GET', path: '/users/u/reviews', run: (a) => a.profiles.reviews('u'), response: [wireReview] },
  { name: 'followers', method: 'GET', path: '/users/u/followers', run: (a) => a.profiles.followers('u'), response: [wireUser] },
  { name: 'following', method: 'GET', path: '/users/u/following', run: (a) => a.profiles.following('u'), response: [wireUser] },
  { name: 'follow', method: 'PUT', path: '/users/u/follow', run: (a) => a.social.setFollowing('u', true), response: { following: true }, private: true },
  { name: 'unfollow', method: 'DELETE', path: '/users/u/follow', run: (a) => a.social.setFollowing('u', false), response: undefined, private: true },
  { name: 'follow-status', method: 'GET', path: '/users/u/follow/me', run: (a) => a.social.isFollowing('u'), response: { following: false }, private: true },
  { name: 'favorites', method: 'GET', path: '/favorites', run: (a) => a.social.favorites(), response: { games: [wireGame], reviews: [wireReview] }, private: true },
  { name: 'favorite-status', method: 'GET', path: '/favorites/game/g', run: (a) => a.social.favorite('game', 'g'), response: { favorite: null }, private: true },
  { name: 'favorite', method: 'PUT', path: '/favorites/review/r', run: (a) => a.social.setFavorite('review', 'r', true), response: wireFavorite, private: true },
  { name: 'unfavorite', method: 'DELETE', path: '/favorites/game/g', run: (a) => a.social.setFavorite('game', 'g', false), response: undefined, private: true },
  { name: 'dashboard', method: 'GET', path: '/dashboard', run: (a) => a.community.dashboard(), response: { favorites: { games: [], reviews: [] }, feed: [wireReview] }, private: true },
  { name: 'feed', method: 'GET', path: '/feed/following', run: (a) => a.community.feed(), response: [wireReview], private: true },
  { name: 'recent', method: 'GET', path: '/community/reviews/recent', run: (a) => a.community.recent(), response: [wireReview] },
  { name: 'ranked-reviews', method: 'GET', path: '/community/reviews/most-commented?period=24h', run: (a) => a.community.mostCommented('24h'), response: [{ review: wireReview, commentCount: 1, lastCommentAt: wireReview.createdAt }] },
  { name: 'ranked-games', method: 'GET', path: '/community/games/in-discussion?period=30d', run: (a) => a.community.gamesInDiscussion('30d'), response: [{ game: wireGame, commentCount: 1, lastCommentAt: wireReview.createdAt }] },
  { name: 'notifications', method: 'GET', path: '/notifications', run: (a) => a.notifications.list(), response: [wireNotification], private: true },
];
test.each(endpoints)('$name usa método rota DTO e autorização corretos no mesmo cliente', async (operation) => {
  const transport = vi.fn<FetchTransport>().mockResolvedValue(operation.response === undefined ? new Response(null, { status: 204 }) : Response.json(operation.response));
  const adapters = createHttpAdapters({ apiBaseUrl: 'http://localhost:5207' }, { transport }); adapters.session.establish(login);
  await operation.run(adapters);
  expect(transport).toHaveBeenCalledTimes(1);
  const [url, request] = transport.mock.calls[0];
  expect(url).toBe(`http://localhost:5207/api/v1${operation.path}`);
  expect(request.method).toBe(operation.method);
  expect(request.body).toBe(operation.body === undefined ? undefined : JSON.stringify(operation.body));
  expect(request.headers).toEqual({ Accept: 'application/json', ...(operation.private ? { Authorization: 'Bearer test-only' } : {}), ...(operation.body === undefined ? {} : { 'Content-Type': 'application/json' }) });
});
test('perfil e conexões compõem duas consultas públicas sem Bearer', async () => {
  const transport = vi.fn<FetchTransport>().mockImplementation(async (url) => Response.json(url.endsWith('/reviews') ? [wireReview] : url.endsWith('/followers') || url.endsWith('/following') ? [wireUser] : wireUser));
  const adapters = createHttpAdapters({ apiBaseUrl: 'http://localhost:5207' }, { transport });
  expect(await adapters.profiles.profile('u')).toEqual({ user: wireUser, reviews: [wireReview] });
  expect(await adapters.profiles.connections('u')).toEqual({ followers: [wireUser], following: [wireUser] });
  expect(transport).toHaveBeenCalledTimes(4);
});
test('payloads de escrita são reconstruídos sem identidade ou campos extras', async () => {
  const transport = vi.fn<FetchTransport>().mockResolvedValue(Response.json(wireComment));
  const adapters = createHttpAdapters({ apiBaseUrl: 'http://localhost:5207' }, { transport }); adapters.session.establish(login);
  const input = { text: 'Olá', userId: 'forged', author: wireUser }; await adapters.reviews.comment('r', input);
  expect(transport.mock.calls[0][1].body).toBe('{"text":"Olá"}');
});
test('falhas de rede HTTP e contrato nunca usam fixtures ou sucesso substituto', async () => {
  const transport = vi.fn<FetchTransport>().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json({ code: 'not_found', message: 'Seguro' }, { status: 404 })).mockResolvedValueOnce(Response.json({ invalid: true }));
  const adapters = createHttpAdapters({ apiBaseUrl: 'http://localhost:5207' }, { transport });
  await expect(adapters.games.list()).rejects.toMatchObject({ kind: 'network' });
  await expect(adapters.games.get('missing')).rejects.toMatchObject({ kind: 'http', status: 404 });
  await expect(adapters.community.recent()).rejects.toMatchObject({ kind: 'contract' });
  expect(transport).toHaveBeenCalledTimes(3);
});
test('sessão compartilhada é exigida apenas em privados e logout limpa mesmo com falha', async () => {
  const transport = vi.fn<FetchTransport>().mockRejectedValue(new Error('offline'));
  const session = createHttpSessionStore(); const adapters = createHttpAdapters({ apiBaseUrl: 'http://localhost:5207' }, { transport, session });
  await expect(adapters.notifications.list()).rejects.toMatchObject({ status: 401 }); expect(transport).not.toHaveBeenCalled();
  session.establish(login);
  await expect(adapters.auth.logout()).rejects.toMatchObject({ kind: 'network' }); expect(session.current()).toBeNull();
});
test('401 privado revoga sessão atual, mas 401 de login não revoga outra sessão', async () => {
  const transport = vi.fn<FetchTransport>().mockImplementation(async () => Response.json({ code: 'unauthorized', message: 'Seguro' }, { status: 401 }));
  const adapters = createHttpAdapters({ apiBaseUrl: 'http://localhost:5207' }, { transport }); adapters.session.establish(login);
  await expect(adapters.auth.login({ email: 'test@example.com', password: 'wrong' })).rejects.toMatchObject({ status: 401 }); expect(adapters.session.current()).not.toBeNull();
  await expect(adapters.auth.me()).rejects.toMatchObject({ status: 401 }); expect(adapters.session.current()).toBeNull();
});
test('401 privado com corpo incompatível ainda revoga a sessão', async () => {
  const transport = vi.fn<FetchTransport>().mockResolvedValue(new Response('não é JSON', { status: 401 }));
  const adapters = createHttpAdapters({ apiBaseUrl: 'http://localhost:5207' }, { transport }); adapters.session.establish(login);
  await expect(adapters.auth.me()).rejects.toMatchObject({ kind: 'contract', status: 401 });
  expect(adapters.session.current()).toBeNull();
});
test('resposta da sessão anterior é invalidada sem limpar a sessão nova', async () => {
  const pending = deferred<Response>(); const transport = vi.fn<FetchTransport>().mockReturnValue(pending.promise);
  const adapters = createHttpAdapters({ apiBaseUrl: 'http://localhost:5207' }, { transport }); adapters.session.establish(login);
  const old = adapters.notifications.list(); const captured = transport.mock.calls[0][1].signal;
  adapters.session.establish({ ...login, token: 'new-test-only' }); expect(captured?.aborted).toBe(true);
  pending.resolve(Response.json({ code: 'unauthorized', message: 'Seguro' }, { status: 401 }));
  await expect(old).rejects.toMatchObject({ kind: 'cancelled' }); expect(adapters.session.current()?.token).toBe('new-test-only');
});
