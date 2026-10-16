import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { decodeReview, decodeReviewLikeStatus } from '../src/services/http/decoders';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, wireReview, wireGame } from './http-fixtures';
import { deferred } from './fixtures';

async function open(path = '/comunidade', options: {
  visitor?: boolean; liked?: boolean; favorite?: boolean; bonusAfterWrite?: number;
  status?: (userId: number) => Promise<Response>; write?: () => Promise<Response>; countRead?: () => Promise<Response>;
} = {}) {
  let account = wireUser;
  const likers = new Set(options.liked ? [wireUser.id] : []);
  let bonus = 0;
  let favorite = options.favorite ?? false;
  const review = () => ({ ...wireReview, rating: 0, text: '', likeCount: 2 + bonus + likers.size });
  const lists = () => ({ games: [], reviews: favorite ? [review()] : [] });
  const transport = vi.fn<FetchTransport>().mockImplementation(async (url, init) => {
    const endpoint = new URL(url).pathname;
    const owner = Number(String((init.headers as Record<string, string>)?.Authorization ?? '').split('-').at(-1));
    if (endpoint.endsWith('/auth/login')) return Response.json({ user: account, token: `test-${account.id}`, expiresAt: '2080-01-01T00:00:00Z' });
    if (endpoint.endsWith('/auth/me')) return Response.json(account);
    if (endpoint.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    if (endpoint.endsWith('/reviews/55/like/me')) return options.status ? options.status(owner) : Response.json({ likedByMe: likers.has(owner) });
    if (endpoint.endsWith('/reviews/55/like')) {
      const response = options.write ? await options.write() : new Response(null, { status: 204 });
      if (response.ok) { if (init.method === 'PUT') likers.add(owner); else likers.delete(owner); bonus = options.bonusAfterWrite ?? 0; }
      return response;
    }
    if (endpoint.endsWith('/reviews/55')) return options.countRead ? options.countRead() : Response.json(review());
    if (endpoint.endsWith('/games/filters')) return Response.json({ genres: [], platforms: [] });
    if (endpoint === '/api/v1/games') return Response.json({ items: [wireGame], page: 1, pageSize: 20, hasNextPage: false });
    if (endpoint.endsWith('/games/12')) return Response.json(wireGame);
    if (endpoint.endsWith('/opinions')) return Response.json({ averageRating: 0, reviews: [review()] });
    if (endpoint.endsWith('/reviews/me')) return Response.json({ review: null });
    if (endpoint.endsWith('/favorites')) return Response.json(lists());
    if (endpoint.endsWith('/favorites/review/55')) {
      if (init.method === 'PUT') favorite = true;
      if (init.method === 'DELETE') favorite = false;
      const value = favorite ? { id: 91, userId: account.id, targetType: 'review', targetId: 55 } : null;
      return init.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json(init.method === 'GET' ? { favorite: value } : value);
    }
    if (endpoint.includes('/favorites/')) return Response.json({ favorite: null });
    if (endpoint.endsWith('/dashboard')) return Response.json({ favorites: lists(), feed: [review()] });
    if (endpoint.endsWith('/recent') || endpoint.endsWith('/feed/following') || /\/users\/\d+\/reviews$/.test(endpoint)) return Response.json([review()]);
    if (endpoint.endsWith('/profile-completion')) return Response.json({ country: null, state: null, bio: '', avatarUrl: null, favoriteGameIds: [], favoriteGameCount: 0, isComplete: false });
    if (endpoint.endsWith('/follow/me')) return Response.json({ following: false });
    if (/\/users\/\d+$/.test(endpoint)) return Response.json(wireUser);
    return Response.json([]);
  });
  const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  if (!options.visitor) await services.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={[path]}><AppRoutes adapters={services} /></MemoryRouter>);
  const interaction = userEvent.setup();
  const calls = (suffix: string, method?: string) => transport.mock.calls.filter(([url, init]) => new URL(url).pathname.endsWith(suffix) && (!method || init.method === method));
  return { calls, transport, interaction, switchAccount() { account = { ...wireUser, id: 4, displayName: 'Outra conta' }; } };
}
test.each(['/comunidade', '/jogos/12', '/reviews/55', '/perfil/1', '/'])('contagem e estado privado em %s', async path => {
  const { calls } = await open(path);
  expect(await screen.findByRole('button', { name: 'Curtir review de Ana' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('2 curtidas')).toBeVisible(); expect(calls('/like/me', 'GET')).toHaveLength(1);
});
test('PUT/DELETE sem corpo, contagem revalidada e likes independentes dos favoritos', async () => {
  const { calls, interaction } = await open();
  await interaction.click(await screen.findByRole('button', { name: 'Curtir review de Ana' }));
  expect(await screen.findByRole('button', { name: 'Retirar curtida da review de Ana' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('3 curtidas')).toBeVisible();
  expect(calls('/like', 'PUT')).toHaveLength(1); expect(calls('/like', 'PUT')[0][1]).not.toHaveProperty('body');
  expect(calls('/like', 'PUT')[0][1].headers).toHaveProperty('Authorization', 'Bearer test-1');
  expect(calls('/like', 'PUT')[0][1].headers).not.toHaveProperty('Content-Type');
  expect(calls('/reviews/55', 'GET')).toHaveLength(1);
  expect(calls('/favorites/review/55', 'PUT')).toHaveLength(0);
  await interaction.click(screen.getByRole('button', { name: 'Favoritar review de Ana' }));
  await screen.findByRole('button', { name: 'Remover review de Ana dos favoritos' }); expect(calls('/like', 'PUT')).toHaveLength(1);
  await interaction.click(screen.getByRole('button', { name: 'Retirar curtida da review de Ana' }));
  await screen.findByRole('button', { name: 'Curtir review de Ana' }); expect(screen.getByText('2 curtidas')).toBeVisible();
  expect(calls('/like', 'DELETE')).toHaveLength(1); expect(calls('/like', 'DELETE')[0][1]).not.toHaveProperty('body');
  expect(screen.getByRole('button', { name: 'Remover review de Ana dos favoritos' })).toHaveAttribute('aria-pressed', 'true');
});
test('duas instâncias compartilham GET pessoal, trava síncrona e confirmação', async () => {
  const pending = deferred<Response>(); const { calls } = await open('/perfil/1', { favorite: true, write: () => pending.promise });
  const buttons = await screen.findAllByRole('button', { name: 'Curtir review de Ana' }); expect(buttons).toHaveLength(2);
  expect(calls('/like/me', 'GET')).toHaveLength(1);
  act(() => { fireEvent.click(buttons[0]); fireEvent.click(buttons[1]); fireEvent.click(buttons[0]); });
  expect(calls('/like', 'PUT')).toHaveLength(1);
  for (const button of buttons) expect(button).toBeDisabled();
  expect(screen.getAllByText('2 curtidas')).toHaveLength(2); expect(screen.queryByText('3 curtidas')).not.toBeInTheDocument();
  await act(async () => { pending.resolve(new Response(null, { status: 204 })); });
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Retirar curtida da review de Ana' })).toHaveLength(2));
  expect(screen.getAllByText('3 curtidas')).toHaveLength(2);
});
test('usa a contagem da API, incluindo curtidas concorrentes, sem incremento local', async () => {
  const { interaction } = await open('/comunidade', { bonusAfterWrite: 2 });
  await interaction.click(await screen.findByRole('button', { name: 'Curtir review de Ana' }));
  expect(await screen.findByText('5 curtidas')).toBeVisible();
});
test('visitante vê contagem e convite ao clicar, sem consultas privadas ou escrita', async () => {
  const { calls, interaction } = await open('/comunidade', { visitor: true });
  expect(await screen.findByText('2 curtidas')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Curtir review de Ana' }));
  expect(screen.getByRole('link', { name: 'Entrar para curtir review de Ana' })).toHaveAttribute('href', '/login');
  expect(calls('/like/me')).toHaveLength(0); expect(calls('/like')).toHaveLength(0);
});
test('falha de consulta pessoal permite retry sem escrita', async () => {
  let fail = true;
  const { calls, interaction } = await open('/comunidade', { status: async () => fail ? Response.json({ code: 'storage_unavailable', message: 'Falha' }, { status: 503 }) : Response.json({ likedByMe: false }) });
  const retry = await screen.findByRole('button', { name: 'Tentar novamente curtida da review de Ana' });
  expect(screen.queryByRole('button', { name: 'Curtir review de Ana' })).not.toBeInTheDocument();
  fail = false; await interaction.click(retry); await screen.findByRole('button', { name: 'Curtir review de Ana' });
  expect(calls('/like/me')).toHaveLength(2); expect(calls('/like')).toHaveLength(0);
});
test('erro de escrita não confirma estado falso e retry consulta antes de liberar ação', async () => {
  const { calls, interaction } = await open('/comunidade', { write: async () => Response.json({ code: 'storage_unavailable', message: 'Falha' }, { status: 503 }) });
  await interaction.click(await screen.findByRole('button', { name: 'Curtir review de Ana' }));
  await screen.findByRole('button', { name: 'Tentar novamente curtida da review de Ana' });
  expect(screen.getByText('2 curtidas')).toBeVisible(); expect(screen.queryByRole('button', { name: 'Retirar curtida da review de Ana' })).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente curtida da review de Ana' }));
  await screen.findByRole('button', { name: 'Curtir review de Ana' }); expect(calls('/like', 'PUT')).toHaveLength(1);
});
test('erro após 204 é recuperado só por GET, sem repetir escrita já confirmada', async () => {
  let fail = true;
  const { calls, interaction } = await open('/comunidade', { countRead: async () => fail ? Response.json({ code: 'storage_unavailable', message: 'Falha' }, { status: 503 }) : Response.json({ ...wireReview, likeCount: 3 }) });
  await interaction.click(await screen.findByRole('button', { name: 'Curtir review de Ana' }));
  await screen.findByRole('button', { name: 'Tentar novamente curtida da review de Ana' }); expect(screen.getByText('2 curtidas')).toBeVisible();
  fail = false; await interaction.click(screen.getByRole('button', { name: 'Tentar novamente curtida da review de Ana' }));
  await screen.findByRole('button', { name: 'Retirar curtida da review de Ana' }); expect(screen.getByText('3 curtidas')).toBeVisible(); expect(calls('/like', 'PUT')).toHaveLength(1);
});
test('resposta pessoal antiga após logout não contamina a próxima conta', async () => {
  const old = deferred<Response>();
  const { interaction, switchAccount } = await open('/comunidade', { status: id => id === 1 ? old.promise : Promise.resolve(Response.json({ likedByMe: false })) });
  await screen.findByText('2 curtidas'); await interaction.click(screen.getByRole('button', { name: /Sair/ }));
  switchAccount(); await interaction.click(screen.getByRole('link', { name: 'Entrar' }));
  await interaction.type(screen.getByLabelText('E-mail'), 'next@example.test'); await interaction.type(screen.getByLabelText('Senha'), 'test-only'); await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('button', { name: 'Curtir review de Ana' })).toHaveAttribute('aria-pressed', 'false');
  await act(async () => { old.resolve(Response.json({ likedByMe: true })); });
  expect(screen.getByRole('button', { name: 'Curtir review de Ana' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByLabelText('Usuário conectado')).toHaveTextContent('Outra conta');
});
test.each([undefined, '2', -1, 1.5, 2147483648])('contador inválido %s não é convertido', likeCount => {
  expect(() => decodeReview({ ...wireReview, likeCount })).toThrow();
});
test('contrato privado exige booleano, e contagem pública aceita zero e int32 máximo', () => {
  for (const likedByMe of [true, false]) expect(decodeReviewLikeStatus({ likedByMe })).toEqual({ likedByMe });
  for (const likedByMe of [undefined, null, 'true', 'false', 0, 1, {}]) expect(() => decodeReviewLikeStatus({ likedByMe })).toThrow();
  for (const likeCount of [0, 2147483647]) expect(decodeReview({ ...wireReview, likeCount }).likeCount).toBe(likeCount);
});
test('resposta de escrita antiga não altera curtidas da próxima sessão', async () => {
  const pending = deferred<Response>(); const { interaction, switchAccount } = await open('/comunidade', { write: () => pending.promise });
  await interaction.click(await screen.findByRole('button', { name: 'Curtir review de Ana' }));
  await interaction.click(screen.getByRole('button', { name: /Sair/ })); switchAccount();
  await interaction.click(screen.getByRole('link', { name: 'Entrar' }));
  await interaction.type(screen.getByLabelText('E-mail'), 'next@example.test'); await interaction.type(screen.getByLabelText('Senha'), 'test-only'); await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('button', { name: 'Curtir review de Ana' })).toHaveAttribute('aria-pressed', 'false');
  await act(async () => { pending.resolve(new Response(null, { status: 204 })); });
  expect(screen.getByRole('button', { name: 'Curtir review de Ana' })).toHaveAttribute('aria-pressed', 'false');
});
test('detalhe agrupa curtir, favoritar e editar em uma barra antes dos comentários', async()=>{
 await open('/reviews/55');
 const actions=await screen.findByRole('group',{name:'Ações da review'});
 expect(await within(actions).findByRole('button',{name:'Curtir review de Ana'})).toBeEnabled();
 expect(await within(actions).findByRole('button',{name:'Favoritar review'})).toBeVisible();
 await userEvent.click(within(actions).getByRole('button',{name:'Editar minha review'}));
 expect(within(actions).getByRole('form')).toBeVisible();
 expect(within(actions).queryByRole('heading',{name:'Comentários'})).not.toBeInTheDocument();
 await userEvent.click(within(actions).getByRole('button',{name:'Cancelar'}));
 expect(within(actions).getByRole('button',{name:'Editar minha review'})).toBeVisible();
});
