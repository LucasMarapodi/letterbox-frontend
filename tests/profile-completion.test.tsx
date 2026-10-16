import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { deferred } from './fixtures';
import { wireGame, wireUser, withAuthentication } from './http-fixtures';

interface Completion { country: string | null; state: string | null; bio: string; avatarUrl: string | null; favoriteGameIds: number[]; favoriteGameCount: number; isComplete: boolean; }
const initial: Completion = { country: 'Brasil', state: null, bio: 'Descrição salva', avatarUrl: null, favoriteGameIds: [11, 12], favoriteGameCount: 2, isComplete: false };
async function open(options: { owner?: boolean; logged?: boolean; initial?: Completion; get?: () => Promise<Response>; favorites?: () => Promise<Response>; save?: (input: Completion) => Promise<Response> } = {}) {
  let persisted = options.initial ?? initial;
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async (url, init) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/profile-completion')) {
      if (init.method === 'PUT') {
        const input = JSON.parse(String(init.body)) as Completion;
        if (options.save) return options.save(input);
        persisted = { ...input, favoriteGameCount: input.favoriteGameIds.length, isComplete: true };
        return Response.json(persisted);
      }
      return options.get ? options.get() : Response.json(persisted);
    }
    if (path.endsWith('/profile') && init.method === 'PATCH') { persisted = { ...persisted, bio: '', isComplete: false }; return Response.json({ ...wireUser, bio: '' }); }
    if (path === '/api/v1/games/filters') return Response.json({ genres: [], platforms: [] });
    if (path === '/api/v1/games') return Response.json({ items: [11, 12, 13, 14].map(id => ({ ...wireGame, id, title: `Jogo ${id}` })), page: 1, pageSize: 20, hasNextPage: false });
    if (path === '/api/v1/favorites') return options.favorites ? options.favorites() : Response.json({ games: persisted.favoriteGameIds.map(id => ({ ...wireGame, id, title: `Jogo ${id}` })), reviews: [] });
    if (path.endsWith('/follow/me')) return Response.json({ following: false });
    if (path.endsWith('/reviews') || path.endsWith('/followers') || path.endsWith('/following')) return Response.json([]);
    if (path.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    return Response.json({ ...wireUser, id: options.owner === false ? 99 : wireUser.id, bio: persisted.bio, avatarUrl: persisted.avatarUrl });
  }));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  if (options.logged !== false) await adapters.auth.login({ email: 'test@example.test', password: 'test-only' });
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={[`/perfil/${options.owner === false ? 99 : wireUser.id}`]}><AppRoutes adapters={adapters} /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Ana', level: 2 });
  const calls = (method: string) => transport.mock.calls.filter(([url, init]) => url.endsWith('/profile-completion') && (init.method ?? 'GET') === method);
  return { interaction, transport, calls };
}
async function edit() { await userEvent.click(await screen.findByRole('button', { name: 'Completar perfil' })); return screen.getByRole('form', { name: 'Completar perfil' }); }
async function fill() {
  const form = await edit();
  fireEvent.change(within(form).getByLabelText('Estado / província / região'), { target: { value: ' São Paulo ' } });
  fireEvent.change(within(form).getByLabelText('Buscar jogos favoritos'), { target: { value: ' Jogo ' } });
  await userEvent.click(within(form).getByRole('button', { name: 'Buscar jogos' }));
  await userEvent.click(await within(form).findByRole('button', { name: 'Adicionar Jogo 13' }));
  return form;
}

test.each([{ owner: false }, { logged: false }])('conclusão é privada: %j', async options => {
  const { calls } = await open(options);
  expect(screen.queryByRole('button', { name: 'Completar perfil' })).not.toBeInTheDocument();
  expect(calls('GET')).toHaveLength(0);
});
test('loading e erro não assumem conclusão; retry é independente', async () => {
  const pending = deferred<Response>(); let retry = false;
  const { calls, interaction } = await open({ get: () => retry ? Promise.resolve(Response.json(initial)) : pending.promise });
  expect(screen.getByRole('region', { name: 'Conclusão do perfil' })).toHaveAttribute('aria-busy', 'true');
  expect(screen.queryByRole('button', { name: 'Completar perfil' })).not.toBeInTheDocument();
  await act(async () => { pending.resolve(Response.json({ code: 'storage_unavailable', message: 'Indisponível' }, { status: 503 })); });
  const region = await screen.findByRole('region', { name: 'Conclusão do perfil' });
  expect(within(region).getByRole('alert')).toHaveTextContent('Não foi possível consultar a conclusão do perfil.');
  retry = true; await interaction.click(within(region).getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByRole('button', { name: 'Completar perfil' }); expect(calls('GET')).toHaveLength(2);
});
test('preenche dados salvos, não duplica jogos, aceita mais de três e cancela sem PUT', async () => {
  const { calls, interaction } = await open(); const form = await fill();
  expect(within(form).getByLabelText('País')).toHaveValue('Brasil');
  expect(within(form).getByLabelText('Descrição')).toHaveValue('Descrição salva');
  expect(within(form).getByRole('button', { name: 'Adicionar Jogo 11' })).toBeDisabled();
  expect(within(form).getByText('3 de 3 jogos necessários')).toBeVisible();
  await interaction.click(within(form).getByRole('button', { name: 'Adicionar Jogo 14' }));
  expect(within(form).getByText('4 de 3 jogos necessários')).toBeVisible();
  await interaction.click(within(form).getByRole('button', { name: 'Remover Jogo 12' }));
  await interaction.click(within(form).getByRole('button', { name: 'Cancelar' }));
  expect(calls('PUT')).toHaveLength(0); expect(screen.queryByRole('form', { name: 'Completar perfil' })).not.toBeInTheDocument();
  const reopened = await edit(); expect(within(reopened).getByText('2 de 3 jogos necessários')).toBeVisible();
});
test('valida campos e mínimo distintos antes de salvar', async () => {
  const { calls } = await open(); const form = await edit();
  fireEvent.change(within(form).getByLabelText('País'), { target: { value: '  ' } });
  fireEvent.change(within(form).getByLabelText('Descrição'), { target: { value: '  ' } });
  fireEvent.submit(form);
  expect(within(form).getByText('Informe o país (até 100 caracteres).')).toBeVisible();
  expect(within(form).getByText('Informe o estado, província ou região (até 100 caracteres).')).toBeVisible();
  expect(within(form).getByText('Informe uma descrição (até 2000 caracteres).')).toBeVisible();
  expect(within(form).getByText('Selecione pelo menos três jogos distintos.')).toBeVisible();
  expect(calls('PUT')).toHaveLength(0);
});
test('salva sem avatar, trim, Bearer e resposta persistida atualiza favoritos e conclusão', async () => {
  const { calls, transport } = await open(); const form = await fill(); fireEvent.submit(form);
  expect(await screen.findByText('Perfil concluído.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Completar perfil' })).not.toBeInTheDocument();
  expect(JSON.parse(String(calls('PUT')[0][1].body))).toEqual({ country: 'Brasil', state: 'São Paulo', bio: 'Descrição salva', avatarUrl: null, favoriteGameIds: [11, 12, 13] });
  expect(calls('PUT')[0][1].headers).toHaveProperty('Authorization', 'Bearer test-only');
  await waitFor(() => expect(within(screen.getByRole('region', { name: 'Favoritos' })).getByRole('link', { name: 'Jogo 13' })).toBeVisible());
  expect(transport.mock.calls.some(([url]) => new URL(url).pathname === '/api/v1/games' && new URL(url).searchParams.get('term') === 'Jogo')).toBe(true);
});
test('falha preserva rascunho; envio duplo e logout não produzem sucesso tardio', async () => {
  const pending = deferred<Response>(); let fail = true;
  const { calls, interaction } = await open({ save: () => fail ? Promise.resolve(Response.json({ code: 'storage_unavailable', message: 'Indisponível' }, { status: 503 })) : pending.promise });
  const form = await fill(); fireEvent.submit(form);
  expect(await within(form).findByRole('alert')).toHaveTextContent('armazenamento');
  expect(within(form).getByLabelText('Estado / província / região')).toHaveValue(' São Paulo ');
  expect(screen.getByRole('button', { name: 'Completar perfil' })).toBeVisible();
  fail = false; fireEvent.submit(form); fireEvent.submit(form); expect(calls('PUT')).toHaveLength(2);
  expect(within(form).getByRole('button', { name: 'Salvando conclusão…' })).toBeDisabled();
  await interaction.click(screen.getByRole('button', { name: /Sair/ }));
  await act(async () => { pending.resolve(Response.json({ ...initial, isComplete: true, state: 'SP', favoriteGameIds: [11, 12, 13], favoriteGameCount: 3 })); });
  expect(screen.queryByText('Perfil concluído.')).not.toBeInTheDocument();
});
test('avatar opcional tem prévia e remoção explícita', async () => {
  const { calls, interaction } = await open({ initial: { ...initial, avatarUrl: 'https://example.test/ana.png' } });
  const form = await fill(); expect(within(form).getByRole('img', { name: 'Prévia do avatar' })).toHaveAttribute('src', 'https://example.test/ana.png');
  await interaction.clear(within(form).getByLabelText('URL do avatar (opcional)'));
  fireEvent.submit(form); await screen.findByText('Perfil concluído.');
  expect(JSON.parse(String(calls('PUT')[0][1].body)).avatarUrl).toBeNull();
});
test('perfil completo sem avatar mantém edição comum; apagar bio revalida conclusão', async () => {
  const { interaction, calls } = await open({ initial: { ...initial, state: 'SP', favoriteGameIds: [11, 12, 13], favoriteGameCount: 3, isComplete: true } });
  await waitFor(() => expect(calls('GET')).toHaveLength(1));
  expect(screen.queryByRole('button', { name: 'Completar perfil' })).not.toBeInTheDocument();
  await interaction.clear(screen.getByLabelText('Biografia')); await interaction.click(screen.getByRole('button', { name: 'Salvar perfil' }));
  await screen.findByRole('button', { name: 'Completar perfil' }); expect(calls('GET').length).toBeGreaterThan(1);
});
test.each(['11', -1, 1.5])('IDs inválidos %s da conclusão não são convertidos', async id => {
  await open({ get: async () => Response.json({ ...initial, favoriteGameIds: [id, 12] }) });
  expect(await screen.findByText('Não foi possível consultar a conclusão do perfil.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Completar perfil' })).not.toBeInTheDocument();
});
test('reabrir próprio perfil revalida remoção externa do terceiro favorito', async () => {
  let data = { ...initial, state: 'SP', favoriteGameIds: [11, 12, 13], favoriteGameCount: 3, isComplete: true };
  const { calls, interaction } = await open({ get: async () => Response.json(data) });
  await waitFor(() => expect(calls('GET')).toHaveLength(1));
  await interaction.click(screen.getByRole('link', { name: 'Início' }));
  data = { ...data, favoriteGameIds: [11, 12], favoriteGameCount: 2, isComplete: false };
  await interaction.click(screen.getByRole('link', { name: 'Meu perfil' }));
  await screen.findByRole('button', { name: 'Completar perfil' }); expect(calls('GET')).toHaveLength(2);
});
test('limites e protocolo do avatar são validados sem consulta de escrita', async () => {
  const { calls } = await open(); const form = await fill();
  for (const [label, value] of [['País', 'a'.repeat(101)], ['Estado / província / região', 'b'.repeat(101)], ['Descrição', 'c'.repeat(2001)], ['URL do avatar (opcional)', 'javascript:alert(1)']]) fireEvent.change(within(form).getByLabelText(label), { target: { value } });
  fireEvent.submit(form); expect(within(form).getAllByRole('alert')).toHaveLength(4); expect(calls('PUT')).toHaveLength(0);
});
test('busca fora de ordem não troca os resultados atuais', async () => {
  const old = deferred<Response>();
  const { transport } = await open();
  transport.mockImplementationOnce(async () => old.promise);
  const form = await edit(); const search = within(form).getByLabelText('Buscar jogos favoritos');
  fireEvent.change(search, { target: { value: 'antigo' } }); fireEvent.keyDown(search, { key: 'Enter' });
  fireEvent.change(search, { target: { value: 'atual' } }); fireEvent.keyDown(search, { key: 'Enter' });
  await within(form).findByRole('button', { name: 'Adicionar Jogo 13' });
  await act(async () => { old.resolve(Response.json({ items: [{ ...wireGame, title: 'Resultado antigo' }], page: 1, pageSize: 20, hasNextPage: false })); });
  expect(within(form).queryByText('Resultado antigo')).not.toBeInTheDocument();
});
test('salvar invalida favoritos pendentes anteriores e mantém a lista confirmada', async () => {
  const old = deferred<Response>(); let count = 0;
  const latest = { games: [11, 12, 13].map(id => ({ ...wireGame, id, title: `Jogo ${id}` })), reviews: [] };
  await open({ favorites: async () => ++count === 1 ? old.promise : Response.json(latest) });
  const form = await fill(); fireEvent.submit(form); await screen.findByText('Perfil concluído.');
  await waitFor(() => expect(count).toBe(2));
  await act(async () => { old.resolve(Response.json({ games: [], reviews: [] })); });
  expect(within(screen.getByRole('region', { name: 'Favoritos' })).getByRole('link', { name: 'Jogo 13' })).toBeVisible();
});
