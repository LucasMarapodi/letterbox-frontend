import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router-dom';
import { StrictMode } from 'react';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireComment, wireGame, wireReview, wireUser, withAuthentication } from './http-fixtures';
import { deferred } from './fixtures';

async function open(options: { path?: string; guest?: boolean; rating?: number | null; cover?: string | null; stale?: boolean; game?: (id: number) => Promise<Response>; invalid?: boolean; strict?: boolean } = {}) {
  const review = { ...wireReview, userId: 2, author: { ...wireReview.author, id: 2, displayName: 'Leo' }, title: 'Minha aventura', text: 'Minha experiência', rating: options.rating === undefined ? 4.25 : options.rating, game: { ...wireReview.game, coverUrl: options.cover === undefined ? '/cover.jpg' : options.cover } };
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async url => {
    const path = new URL(url).pathname;
    const headers = options.stale ? { 'X-Catalog-Stale': 'true', 'X-Catalog-Fetched-At': wireReview.createdAt } : {};
    if (path === '/api/v1/reviews/55') return options.invalid ? Response.json({ code: 'not_found', message: 'Não encontrada' }, { status: 404 }) : Response.json(review, { headers });
    if (path === '/api/v1/reviews/56') return Response.json({ ...review, id: 56, gameId: 13, game: { ...review.game, id: 13, title: 'Outro jogo' } });
    const game = path.match(/^\/api\/v1\/games\/(\d+)$/);
    if (game) return options.game ? options.game(Number(game[1])) : Response.json({ ...wireGame, summary: 'Resumo do jogo', averageRating: 1 }, { headers });
    if (path.endsWith('/comments')) return Response.json([wireComment]);
    if (path.endsWith('/favorites')) return Response.json({ games: [], reviews: [] });
    if (path.includes('/favorites/')) return Response.json({ favorite: null });
    if (path.endsWith('/like/me')) return Response.json({ likedByMe: false });
    return Response.json([]);
  }));
  const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  if (!options.guest) await services.auth.login({ email: 'context@example.test', password: 'test-only' });
  const app = <MemoryRouter initialEntries={[options.path ?? '/reviews/55']}><AppRoutes adapters={services} /><Link to="/reviews/56">Outra review</Link><Link to="/comunidade">Sair da review</Link></MemoryRouter>;
  render(options.strict ? <StrictMode>{app}</StrictMode> : app);
  return { interaction: userEvent.setup(), transport, review };
}

test('primeiro bloco identifica jogo com capa, link, resumo e nota do autor, sem ID/duplicação', async () => {
  const { transport } = await open(); const context = await screen.findByRole('region', { name: 'Contexto do jogo' });
  expect(await within(context).findByText('Resumo do jogo')).toBeVisible();
  expect(context.closest('article')?.firstElementChild).toBe(context);
  expect(within(context).getByRole('heading', { name: 'Jogo HTTP' })).toBeVisible();
  expect(within(context).getByRole('link', { name: 'Jogo HTTP' })).toHaveAttribute('href', '/jogos/12');
  expect(within(context).getByRole('img', { name: 'Capa de Jogo HTTP' })).toHaveAttribute('src', '/cover.jpg');
  expect(within(context).getByText('Nota desta review: 4.25 de 5')).toBeVisible();
  expect(screen.queryByText(/ID da review/)).not.toBeInTheDocument(); expect(screen.queryByText('Nota: 4.25 de 5')).not.toBeInTheDocument();
  expect(screen.getAllByRole('img', { name: 'Capa de Jogo HTTP' })).toHaveLength(1); expect(screen.queryByText(/Nota.*1 de 5/)).not.toBeInTheDocument();
  expect(screen.getByText('Minha experiência')).toBeVisible(); expect(screen.getByRole('heading', { name: 'Minha aventura' })).toBeVisible();
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/games/12'))).toHaveLength(1);
});

test('StrictMode não duplica consulta de resumo na mesma tentativa', async () => {
  const { transport } = await open({ strict: true }); await screen.findByText('Resumo do jogo');
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/games/12'))).toHaveLength(1);
});

test.each([null, '/broken.jpg'])('capa %s conserva fallback sem nova consulta', async cover => {
  const { transport } = await open({ cover });
  if (cover) fireEvent.error(await screen.findByRole('img', { name: 'Capa de Jogo HTTP' }));
  expect(await screen.findByRole('img', { name: 'Capa de Jogo HTTP indisponível' })).toHaveTextContent('Sem capa');
  await screen.findByText('Resumo do jogo'); expect(transport.mock.calls.filter(([url]) => url.endsWith('/games/12'))).toHaveLength(1);
});

test.each(['', '  '])('resumo vazio %j tem fallback sem inventar texto', async summary => {
  await open({ game: async () => Response.json({ ...wireGame, summary }) });
  expect(await screen.findByText('Resumo não informado.')).toBeVisible(); expect(screen.getByText('Minha experiência')).toBeVisible();
});

test.each([0, null])('nota %s preserva zero explícito ou legado sem nota', async rating => {
  await open({ rating }); const context = await screen.findByRole('region', { name: 'Contexto do jogo' });
  expect(within(context).getByText(rating === null ? 'Nota não informada (review antiga).' : 'Nota desta review: 0 de 5')).toBeVisible();
  expect(screen.getAllByText(rating === null ? 'Nota não informada (review antiga).' : 'Nota desta review: 0 de 5')).toHaveLength(1);
});

test('chegada do resumo preserva rascunho, discussão e foco no comentário destacado', async () => {
  const pending = deferred<Response>(); const { interaction, transport } = await open({ path: '/reviews/55#comentario-81', game: () => pending.promise });
  const comment = await screen.findByText('Comentário'); const target = comment.closest('li')!; expect(target).toHaveFocus();
  const draft = screen.getByLabelText('Seu comentário'); await interaction.type(draft, 'Rascunho em andamento');
  expect(screen.getByText('Carregando resumo…')).toBeVisible(); expect(screen.getByText('Nota desta review: 4.25 de 5')).toBeVisible();
  await act(async () => pending.resolve(Response.json({ ...wireGame, summary: 'Resumo chegou' })));
  expect(screen.getByLabelText('Seu comentário')).toBe(draft); expect(draft).toHaveValue('Rascunho em andamento'); expect(draft).toHaveFocus(); expect(screen.getByText('Comentário').closest('li')).toBe(target);
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/comments'))).toHaveLength(1);
});

test('erro de resumo tem retry local e não recarrega review/comentários', async () => {
  let fail = true; const { interaction, transport } = await open({ game: async () => fail ? Response.json({ code: 'storage_unavailable', message: 'Erro' }, { status: 503 }) : Response.json({ ...wireGame, summary: 'Resumo recuperado' }) });
  await screen.findByText('Não foi possível carregar o resumo do jogo.'); expect(screen.getByText('Minha experiência')).toBeVisible(); await screen.findByText('Comentário');
  fail = false; await interaction.click(within(screen.getByRole('region', { name: 'Contexto do jogo' })).getByRole('button', { name: 'Tentar novamente' })); await screen.findByText('Resumo recuperado');
  for (const suffix of ['/reviews/55', '/comments']) expect(transport.mock.calls.filter(([url]) => url.endsWith(suffix))).toHaveLength(1);
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/games/12'))).toHaveLength(2);
});

test('resumo de rota anterior é ignorado sem misturar jogos', async () => {
  const pending = deferred<Response>(); const { interaction } = await open({ game: id => id === 12 ? pending.promise : Promise.resolve(Response.json({ ...wireGame, id: 13, summary: 'Resumo novo' })) });
  await screen.findByText('Carregando resumo…'); await interaction.click(screen.getByRole('link', { name: 'Outra review' })); await screen.findByText('Resumo novo');
  await act(async () => pending.resolve(Response.json({ ...wireGame, summary: 'Resumo antigo' })));
  expect(screen.queryByText('Resumo antigo')).not.toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Outro jogo' })).toHaveAttribute('href', '/jogos/13');
});

test('aviso stale vem depois da identificação sem duplicar a nota', async () => {
  await open({ stale: true }); const context = await screen.findByRole('region', { name: 'Contexto do jogo' }); await screen.findByText('Resumo do jogo');
  const notice = screen.getByRole('complementary', { name: 'Atualização do catálogo' }); expect(context.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); expect(within(notice).getByRole('button', { name: 'Consultar novamente' })).toBeVisible();
});

test('ID inválido e review inexistente não consultam detalhes de jogo', async () => {
  const { transport } = await open({ path: '/reviews/invalido', guest: true }); await screen.findByText('Review não encontrada.');
  expect(screen.queryByText(/ID da review/)).not.toBeInTheDocument(); expect(transport.mock.calls.some(([url]) => /\/games\/\d+$/.test(url))).toBe(false);
});

test('review inexistente preserva estado vazio sem enriquecimento', async () => {
  const { transport } = await open({ invalid: true, guest: true }); await screen.findByText('Review não encontrada.');
  await waitFor(() => expect(transport.mock.calls.filter(([url]) => url.endsWith('/reviews/55'))).toHaveLength(1)); expect(transport.mock.calls.some(([url]) => /\/games\/\d+$/.test(url))).toBe(false);
});
