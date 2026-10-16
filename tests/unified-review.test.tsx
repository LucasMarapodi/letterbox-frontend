import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { decodeReview } from '../src/services/http/decoders';
import type { FetchTransport } from '../src/services/http/client';
import { wireGame, wireReview, wireUser, withAuthentication } from './http-fixtures';
import { deferred } from './fixtures';

type Rated = typeof wireReview & { rating: number | null };
async function open(options: { logged?: boolean; own?: Rated; path?: string; write?: () => Promise<Response>; other?: boolean; conflict?: boolean } = {}) {
  let review = options.own ?? null;
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async (url, init) => {
    const path = new URL(url).pathname;
    if ((init.method === 'POST' && path.endsWith('/reviews')) || init.method === 'PATCH') {
      if (options.write) return options.write();
      const input = JSON.parse(String(init.body)) as { rating: number; text: string };
      review = { ...wireReview, ...input };
      if (options.conflict && init.method === 'POST') return Response.json({ code: 'conflict', message: 'Conflito' }, { status: 409 });
      return Response.json(review, { status: init.method === 'POST' ? 201 : 200 });
    }
    if (path.endsWith('/reviews/me')) return Response.json({ review });
    if (path.endsWith('/dashboard')) return Response.json({ favorites: { games: [], reviews: review ? [review] : [] }, feed: review ? [review] : [] });
    if (path.endsWith('/feed/following') || /^\/api\/v1\/users\/\d+\/reviews$/.test(path)) return Response.json(review ? [review] : []);
    if (path.endsWith('/opinions')) return Response.json({ averageRating: review?.rating ?? null, reviews: review ? [review] : [] });
    if (path.endsWith('/favorites')) return Response.json({ games: [], reviews: review ? [review] : [] });
    if (path.includes('/favorites/')) return Response.json({ favorite: null });
    if (path.endsWith('/games/filters')) return Response.json({ genres: [], platforms: [] });
    if (path.endsWith('/games')) return Response.json({ items: [wireGame], page: 1, pageSize: 20, hasNextPage: false });
    if (path.endsWith('/recent') || path.endsWith('/most-commented')) return Response.json(review ? path.endsWith('/recent') ? [review] : [] : []);
    if (path.endsWith('/reviews/55')) return Response.json(review && options.other ? { ...review, userId: 99, author: { ...review.author, id: 99 } } : review);
    if (path.endsWith('/reviews') || path.endsWith('/comments') || path.endsWith('/followers') || path.endsWith('/following') || path.endsWith('/in-discussion')) return Response.json([]);
    if (path.endsWith('/profile-completion')) return Response.json({ country: null, state: null, bio: '', avatarUrl: null, favoriteGameIds: [], favoriteGameCount: 0, isComplete: false });
    if (path.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    if (path.includes('/users/')) return Response.json(wireUser);
    return Response.json({ ...wireGame, averageRating: review?.rating ?? null });
  }, { isolateDashboard: false }));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  if (options.logged !== false) await adapters.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={[options.path ?? '/jogos/12']}><AppRoutes adapters={adapters} /></MemoryRouter>);
  const interaction = userEvent.setup();
  const writes = () => transport.mock.calls.filter(([, init]) => ['POST', 'PATCH', 'PUT'].includes(init.method ?? '') && !String(init.body).includes('test@example.test'));
  return { interaction, writes, transport };
}
async function form(edit = false) {
  await userEvent.click(await screen.findByRole('button', { name: edit ? 'Editar minha review' : 'Criar review' }));
  return screen.getByRole('form', { name: edit ? 'Salvar review' : 'Publicar review' });
}
test('uma ação e nota sem seleção; ausente não vira zero; cancelar não escreve', async () => {
  const { writes } = await open(); const editor = await form();
  expect(within(editor).getByLabelText('Nota (0 a 5)')).toHaveValue(null);
  fireEvent.submit(editor); expect(within(editor).getByText('Escolha uma nota de 0 a 5.')).toBeVisible();
  expect(writes()).toHaveLength(0);
  await userEvent.click(within(editor).getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('form', { name: 'Publicar review' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Salvar nota' })).not.toBeInTheDocument();
});
test.each([0, 4.25, 5])('nota %s sem descrição gera uma única review e revalida própria/média', async rating => {
  const { writes, transport } = await open(); const editor = await form();
  fireEvent.change(within(editor).getByLabelText('Nota (0 a 5)'), { target: { value: String(rating) } });
  fireEvent.submit(editor); await screen.findByText('Review publicada.');
  expect(writes()).toHaveLength(1); expect(JSON.parse(String(writes()[0][1].body))).toEqual({ rating, title: null, text: '' });
  expect(writes()[0][1].headers).toHaveProperty('Authorization', 'Bearer test-only');
  await screen.findByRole('button', { name: 'Editar minha review' });
  await waitFor(() => expect(transport.mock.calls.filter(([url]) => url.endsWith('/reviews/me')).length).toBeGreaterThan(1));
  await waitFor(() => expect(transport.mock.calls.filter(([url]) => url.endsWith('/opinions')).length).toBeGreaterThan(1));
  expect(transport.mock.calls.some(([url]) => url.endsWith('/rating/me'))).toBe(false);
  const reopened = await form(true); expect(within(reopened).getByLabelText('Nota (0 a 5)')).toHaveValue(rating);
});
test('edição de detalhe carrega nota fracionada e envia texto vazio com PATCH único', async () => {
  const { writes } = await open({ own: { ...wireReview, rating: 4.25 }, path: '/reviews/55' });
  const editor = await form(true); expect(within(editor).getByLabelText('Nota (0 a 5)')).toHaveValue(4.25);
  fireEvent.change(within(editor).getByLabelText('Descrição (opcional)'), { target: { value: '' } });
  fireEvent.submit(editor); await screen.findByText('Review atualizada.');
  expect(writes()).toHaveLength(1); expect(writes()[0][1].method).toBe('PATCH'); expect(JSON.parse(String(writes()[0][1].body))).toEqual({ rating: 4.25, title: null, text: '' });
  expect(screen.getByRole('link', { name: 'Jogo HTTP' })).toBeVisible();
});
test('legado sem nota permanece legível e exige seleção na edição', async () => {
  const { writes } = await open({ own: { ...wireReview, rating: null }, path: '/reviews/55' });
  expect(await screen.findByText('Nota não informada (review antiga).')).toBeVisible();
  const editor = await form(true); fireEvent.submit(editor); expect(writes()).toHaveLength(0);
  expect(within(editor).getByText('Escolha uma nota de 0 a 5.')).toBeVisible();
});
test('visitante recebe convite de login e outro autor não edita', async () => {
  const { writes } = await open({ logged: false }); await userEvent.click(await screen.findByRole('button', { name: 'Criar review' }));
  expect(screen.getByRole('form', { name: 'Login' })).toBeVisible(); expect(screen.queryByText('Entrar para criar review')).not.toBeInTheDocument(); expect(writes()).toHaveLength(0);
});
test('review de outro usuário não oferece edição', async () => {
  await open({ own: { ...wireReview, rating: 0, text: '' }, other: true, path: '/reviews/55' });
  expect(await screen.findByText('Nota: 0 de 5')).toBeVisible(); expect(screen.queryByRole('button', { name: 'Editar minha review' })).not.toBeInTheDocument();
});
test('falha mantém rascunho; submit duplo e resposta após logout não declaram sucesso', async () => {
  const pending = deferred<Response>(); let fail = true;
  const { writes, interaction } = await open({ write: async () => fail ? Response.json({ code: 'storage_unavailable', message: 'Falha' }, { status: 503 }) : pending.promise });
  const editor = await form(); fireEvent.change(within(editor).getByLabelText('Nota (0 a 5)'), { target: { value: '3' } });
  fireEvent.change(within(editor).getByLabelText('Descrição (opcional)'), { target: { value: 'Rascunho' } }); fireEvent.change(within(editor).getByLabelText('T\u00edtulo'), {target:{value:'Minha aventura'}}); fireEvent.submit(editor);
  expect(await within(editor).findByRole('alert')).toHaveTextContent('Não foi possível publicar');
  expect(within(editor).getByLabelText('Descrição (opcional)')).toHaveValue('Rascunho');
  fail = false; fireEvent.submit(editor); fireEvent.submit(editor); expect(writes()).toHaveLength(2);
  expect(within(editor).getByRole('button', { name: 'Publicando…' })).toBeDisabled();
  await interaction.click(screen.getByRole('button', { name: /Sair/ }));
  await act(async () => { pending.resolve(Response.json({ ...wireReview, rating: 3 }, { status: 201 })); });
  expect(screen.queryByText('Review publicada.')).not.toBeInTheDocument();
});
test('conflito oferece edição após consultar a review existente sem sucesso falso', async () => {
  const { writes } = await open({ conflict: true }); const editor = await form();
  fireEvent.change(within(editor).getByLabelText('Nota (0 a 5)'), { target: { value: '2' } }); fireEvent.submit(editor);
  await screen.findByRole('button', { name: 'Editar minha review' }); expect(writes()).toHaveLength(1);
  expect(screen.queryByText('Review publicada.')).not.toBeInTheDocument();
});
test.each([undefined, '4', -1, 5.1])('decoder não inventa/converte nota inválida %s', rating => {
  expect(() => decodeReview({ ...wireReview, rating })).toThrow();
});
test.each(['/jogos/12', '/reviews/55', `/perfil/${wireUser.id}`, '/comunidade', '/'])('review sem descrição e nota zero permanece visível em %s', async path => {
  const {interaction}=await open({ own: { ...wireReview, text: '', rating: 0 }, path });
  if(path==='/'){await interaction.click(screen.getByRole('link',{name:'Comunidade'}));await interaction.click(screen.getByRole('button',{name:'Feed de reviews'}));}
  expect((await screen.findAllByText('Nota: 0 de 5')).length).toBeGreaterThan(0);
  expect(document.querySelectorAll('p.review-text')).toHaveLength(0);
});
test.each([-1, 6])('formulário rejeita nota %s antes de escrever', async rating => {
  const { writes } = await open(); const editor = await form();
  fireEvent.change(within(editor).getByLabelText('Nota (0 a 5)'), { target: { value: String(rating) } }); fireEvent.submit(editor);
  expect(within(editor).getByText('Escolha uma nota de 0 a 5.')).toBeVisible(); expect(writes()).toHaveLength(0);
});
test('limite de descrição é validado e cancelamento da edição não escreve', async () => {
  const { writes } = await open({ own: { ...wireReview, rating: 3 } }); const editor = await form(true);
  fireEvent.change(within(editor).getByLabelText('Descrição (opcional)'), { target: { value: 'a'.repeat(10001) } }); fireEvent.submit(editor);
  expect(within(editor).getByText('Descrição deve ter até 10000 caracteres.')).toBeVisible();
  await userEvent.click(within(editor).getByRole('button', { name: 'Cancelar' })); expect(writes()).toHaveLength(0);
});
