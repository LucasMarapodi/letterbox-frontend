import { render } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireGame, wireUser, withAuthentication, withFilterOptions } from './http-fixtures';

export const forumAuthor = { ...wireUser, username: 'ana' };
export const topic = { id: 41, gameId: 12, title: 'Dicas para começar', text: 'Como começar?', author: forumAuthor, createdAt: '2026-10-21T12:00:00Z', replyCount: 0, lastActivityAt: '2026-10-21T12:00:00Z', game: { id: 12, title: wireGame.title, coverUrl: null } };
export const reply = { id: 71, topicId: 41, author: { ...forumAuthor, id: 2, displayName: 'Leo' }, text: 'Explore o mapa.', createdAt: '2026-10-21T13:00:00Z' };
export const forumPage = (items: unknown[] = [], page = 1, hasNextPage = false) => ({ items, page, pageSize: 20, hasNextPage });
function Navigation() {
  const navigate = useNavigate(), location = useLocation();
  return <><output aria-label="URL atual">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>Voltar no histórico</button><button onClick={() => navigate('/jogos/13?aba=forum&page=1')}>Outro jogo</button></>;
}
export async function openForum(path = '/jogos/12', handler?: (url: string, init: RequestInit) => Promise<Response | undefined>, authenticated = false) {
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async (url, init) => {
    const result = await handler?.(url, init);
    if (result) return result;
    const route = new URL(url).pathname;
    if (/\/games\/\d+$/.test(route)) return Response.json({ ...wireGame, id: Number(route.split('/').at(-1)) });
    if (route.endsWith('/opinions')) return Response.json({ averageRating: 4.5, reviews: [] });
    if (route.endsWith('/forum/topics')) return Response.json(forumPage([topic], Number(new URL(url).searchParams.get('page') ?? 1)));
    if (route.endsWith('/replies')) return Response.json(forumPage([]));
    if (route.endsWith('/forum/topics/41')) return Response.json(topic);
    if (route.endsWith('/favorites')) return Response.json({ games: [], reviews: [] });
    if (route.includes('/favorites/')) return Response.json({ favorite: null });
    if (route.endsWith('/reviews/me')) return Response.json({ review: null });
    return Response.json([]);
  }));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: withFilterOptions(transport) });
  if (authenticated) await adapters.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={[path]}><Navigation /><AppRoutes adapters={adapters} /></MemoryRouter>);
  return { transport, adapters };
}
