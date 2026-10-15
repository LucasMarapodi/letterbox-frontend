import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { expect, test, vi } from 'vitest';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { ServiceProvider } from '../src/services/ServiceProvider';
import { SessionProvider } from '../src/session/SessionProvider';
import { LoginPage } from '../src/pages/LoginPage';
import { RegisterPage } from '../src/pages/RegisterPage';
import { ProfileEditor } from '../src/pages/ProfileEditor';
import { PublishReview } from '../src/pages/PublishReview';
import { EditReview } from '../src/pages/EditReview';
import { RatingForm } from '../src/pages/RatingForm';
import { CommentForm } from '../src/pages/CommentForm';
import { FavoriteButton } from '../src/components/FavoriteButton';
import { FollowButton } from '../src/components/FollowButton';
import { AppRoutes } from '../src/App';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, wireReview, wireRating, wireComment, wireFavorite, wirePage } from './http-fixtures';
import { deferred } from './fixtures';

interface MutationCase {
  name: string; guest?: boolean; endpoint: string; method: string;
  render(saved: () => void): ReactElement;
  fields: { label: string; value: string }[];
  button: string; pending: string; result: unknown;
}
const cases: MutationCase[] = [
  { name: 'login', guest: true, endpoint: '/auth/login', method: 'POST', render: () => <LoginPage />, fields: [{ label: 'E-mail', value: 'test@example.test' }, { label: 'Senha', value: 'test-only' }], button: 'Entrar', pending: 'Entrando…', result: { user: wireUser, token: 'test-only', expiresAt: '2080-01-01T00:00:00Z' } },
  { name: 'cadastro', guest: true, endpoint: '/auth/register', method: 'POST', render: () => <RegisterPage />, fields: [{ label: 'Nome', value: 'Ana' }, { label: 'E-mail', value: 'test@example.test' }, { label: 'Senha', value: 'test-only' }], button: 'Criar conta', pending: 'Criando conta…', result: wireUser },
  { name: 'perfil', endpoint: '/users/me/profile', method: 'PATCH', render: saved => <ProfileEditor profile={wireUser} onSaved={saved} />, fields: [{ label: 'Biografia', value: 'Rascunho' }], button: 'Salvar perfil', pending: 'Salvando perfil…', result: { ...wireUser, bio: 'Rascunho' } },
  { name: 'publicar review', endpoint: '/games/g/reviews', method: 'POST', render: saved => <PublishReview gameId="g" onSaved={saved} />, fields: [{ label: 'Sua review', value: 'Rascunho' }], button: 'Publicar review', pending: 'Publicando…', result: wireReview },
  { name: 'editar review', endpoint: `/reviews/${encodeURIComponent(wireReview.id)}`, method: 'PATCH', render: saved => <EditReview review={wireReview} onSaved={saved} />, fields: [{ label: 'Sua review', value: 'Rascunho' }], button: 'Salvar review', pending: 'Salvando…', result: { ...wireReview, text: 'Rascunho' } },
  { name: 'nota', endpoint: '/games/g/rating/me', method: 'PUT', render: saved => <RatingForm gameId="g" onSaved={saved} />, fields: [], button: 'Salvar nota', pending: 'Salvando…', result: wireRating },
  { name: 'comentário', endpoint: '/reviews/r/comments', method: 'POST', render: saved => <CommentForm reviewId="r" authorId="other" onSaved={saved} />, fields: [{ label: 'Seu comentário', value: 'Rascunho' }], button: 'Publicar comentário', pending: 'Publicando…', result: wireComment },
  ...(['game', 'review'] as const).map(kind => ({ name: `favorito ${kind}`, endpoint: `/favorites/${kind}/g`, method: 'PUT', render: () => <FavoriteButton kind={kind} targetId="g" />, fields: [], button: `Favoritar ${kind === 'game' ? 'jogo' : 'review'}`, pending: 'Atualizando favorito…', result: { ...wireFavorite, targetType: kind } })),
  { name: 'seguir', endpoint: '/users/other/follow', method: 'PUT', render: saved => <FollowButton targetId="other" name="Outro" onChanged={saved} />, fields: [], button: 'Seguir Outro', pending: 'Atualizando relação…', result: { following: true } },
];
function readBody(path: string): unknown {
  if (path.endsWith('/auth/login')) return { user: wireUser, token: 'test-only', expiresAt: '2080-01-01T00:00:00Z' };
  if (path.endsWith('/auth/me')) return wireUser;
  if (path.endsWith('/reviews/me')) return { review: null };
  if (path.endsWith('/rating/me')) return { rating: null };
  if (path.includes('/favorites/')) return { favorite: null };
  if (path.endsWith('/follow/me')) return { following: false };
  if (path.endsWith('/games')) return wirePage();
  if (path.endsWith('/dashboard')) return { favorites: { games: [], reviews: [] }, feed: [] };
  return [];
}

test.each(cases)('$name: dois submits/cliques enviam uma mutação, erro libera retry e preserva dados', async item => {
  let response = deferred<Response>();
  const transport = vi.fn<FetchTransport>().mockImplementation((url, init) => new URL(url).pathname === `/api/v1${item.endpoint}` && init.method === item.method ? response.promise : Promise.resolve(Response.json(readBody(new URL(url).pathname))));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  if (!item.guest) await adapters.auth.login({ email: 'test@example.test', password: 'test-only' });
  transport.mockClear();
  const saved = vi.fn();
  render(<MemoryRouter><ServiceProvider value={adapters}><SessionProvider service={adapters.auth}>{item.render(saved)}</SessionProvider></ServiceProvider></MemoryRouter>);
  const interaction = userEvent.setup();
  for (const field of item.fields) {
    const input = await screen.findByLabelText(field.label);
    await interaction.clear(input); await interaction.type(input, field.value);
  }
  const button = await screen.findByRole('button', { name: item.button });
  function dispatchTwice() {
    act(() => {
      fireEvent.click(button);
      const form = button.closest('form');
      // submit cobre Enter/requestSubmit mesmo antes do próximo render de disabled.
      if (form) { fireEvent.submit(form); fireEvent.submit(form); }
      else fireEvent.click(button);
    });
  }
  const calls = () => transport.mock.calls.filter(([url, init]) => new URL(url).pathname === `/api/v1${item.endpoint}` && init.method === item.method);
  dispatchTwice();
  expect(calls()).toHaveLength(1);
  expect(screen.getByRole('button', { name: item.pending })).toBeDisabled();
  expect(saved).not.toHaveBeenCalled();
  await act(async () => { response.resolve(Response.json({ code: 'internal_error', message: 'Falha de teste.' }, { status: 500 })); await response.promise; });
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: item.button })).toBeEnabled();
  for (const field of item.fields) expect(screen.getByLabelText(field.label)).toHaveValue(field.value);
  expect(saved).not.toHaveBeenCalled();
  response = deferred<Response>();
  dispatchTwice();
  expect(calls()).toHaveLength(2);
  expect(screen.getByRole('button', { name: item.pending })).toBeDisabled();
  await act(async () => { response.resolve(Response.json(item.result)); await response.promise; });
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(calls()).toHaveLength(2);
  if (!item.guest && !item.name.startsWith('favorito')) expect(saved).toHaveBeenCalledTimes(1);
});

test.each(['comentário', 'editar review'])('%s: nova tentativa pendente/fracassada não mantém sucesso antigo', async name => {
  const item = cases.find(item => item.name === name)!;
  let response = deferred<Response>();
  const transport: FetchTransport = (url, init) => init.method !== 'GET' && !url.endsWith('/auth/login') ? response.promise : Promise.resolve(Response.json(readBody(new URL(url).pathname)));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  await adapters.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter><ServiceProvider value={adapters}><SessionProvider service={adapters.auth}>{item.render(vi.fn())}</SessionProvider></ServiceProvider></MemoryRouter>);
  const interaction = userEvent.setup();
  await interaction.type(await screen.findByLabelText(item.fields[0].label), 'Primeira versão');
  await interaction.click(screen.getByRole('button', { name: item.button }));
  await act(async () => { response.resolve(Response.json(item.result)); await response.promise; });
  const success = name === 'comentário' ? 'Comentário publicado.' : 'Review atualizada.';
  await screen.findByText(success);
  response = deferred<Response>();
  await interaction.type(screen.getByLabelText(item.fields[0].label), 'Nova versão');
  await interaction.click(screen.getByRole('button', { name: item.button }));
  expect(screen.queryByText(success)).not.toBeInTheDocument();
  await act(async () => { response.resolve(Response.json({ code: 'internal_error', message: 'Falha.' }, { status: 500 })); await response.promise; });
  await screen.findByRole('alert');
  expect(screen.queryByText(success)).not.toBeInTheDocument();
  expect(screen.getByLabelText(item.fields[0].label)).toHaveValue(expect.stringContaining('Nova versão'));
});

test('logout informa revogação pendente sem bloquear novo login; resposta antiga não afeta nova sessão', async () => {
  const pending = deferred<Response>();
  const transport = vi.fn<FetchTransport>().mockImplementation((url) => url.endsWith('/auth/logout') ? pending.promise : Promise.resolve(Response.json(readBody(new URL(url).pathname))));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  await adapters.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter><AppRoutes adapters={adapters} /></MemoryRouter>);
  const interaction = userEvent.setup();
  const logout = screen.getByRole('button', { name: 'Sair' });
  act(() => { fireEvent.click(logout); fireEvent.click(logout); });
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/auth/logout'))).toHaveLength(1);
  expect(screen.getByText('Encerrando sessão…')).toHaveAttribute('role', 'status');
  await interaction.click(screen.getByRole('link', { name: 'Entrar' }));
  await interaction.type(screen.getByLabelText('E-mail'), 'test@example.test');
  await interaction.type(screen.getByLabelText('Senha'), 'test-only');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByLabelText('Usuário conectado');
  expect(screen.queryByText('Encerrando sessão…')).not.toBeInTheDocument();
  await act(async () => { pending.resolve(Response.json({ code: 'internal_error', message: 'Falha.' }, { status: 500 })); await pending.promise; });
  expect(screen.getByLabelText('Usuário conectado')).toHaveTextContent('Ana');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
