import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import type { ProfileCompletionResponse } from '../src/services/http/dtos';
import { deferred } from './fixtures';
import { wireGame, wireUser, withAuthentication } from './http-fixtures';
const initial: ProfileCompletionResponse = { country: null, state: null, bio: '', avatarUrl: null, favoriteGameIds: [], favoriteGameCount: 0, isComplete: false };
async function open(options: { logged?: boolean; owner?: boolean; data?: ProfileCompletionResponse; save?: () => Promise<Response>; search?: (q: string) => Promise<Response>; read?: () => Promise<Response> } = {}) {
 let data = options.data ?? initial; let user = { ...wireUser, bio: data.bio, avatarUrl: data.avatarUrl };
 const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async (url, init) => {
  const path = new URL(url).pathname;
  if (path.endsWith('/profile-completion')) return options.read ? options.read() : Response.json(data);
  if (path.endsWith('/profile') && init.method === 'PATCH') {
   if (options.save) return options.save();
   const input = JSON.parse(String(init.body)) as Record<string, unknown>;
   user = { ...user, ...input }; const ids = (input.favoriteGameIds ?? data.favoriteGameIds) as number[];
   data = { ...data, ...input, favoriteGameIds: ids, favoriteGameCount: ids.length };
   data.isComplete = Boolean(data.country && data.state && data.bio.trim() && ids.length >= 3);
   return Response.json({ ...user, completion: data });
  }
  if (path === '/api/v1/favorites') return Response.json({ games: data.favoriteGameIds.map(id => ({ ...wireGame, id, title: `Jogo ${id}` })), reviews: [] });
  if (path === '/api/v1/search') return options.search ? options.search(new URL(url).searchParams.get('q') ?? '') : Response.json(suggestions());
  if (path.endsWith('/follow/me')) return Response.json({ following: false });
  if (path.endsWith('/reviews') || path.endsWith('/followers') || path.endsWith('/following')) return Response.json([]);
  if (path.endsWith('/auth/logout')) return new Response(null, { status: 204 });
  return Response.json({ ...user, id: options.owner === false ? 99 : 1 });
 }));
 const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
 if (options.logged !== false) await services.auth.login({ email: 'test@example.test', password: 'test-only' });
 render(<MemoryRouter initialEntries={[`/perfil/${options.owner === false ? 99 : 1}`]}><AppRoutes adapters={services} /></MemoryRouter>);
 await screen.findByRole('heading', { name: 'Ana', level: 2 });
 return { interaction: userEvent.setup(), transport, patches: () => transport.mock.calls.filter(([, init]) => init.method === 'PATCH') };
}
function suggestions(title = 'Resultado') { return { query: 'jogo', people: { status: 'notRequested', items: [], page: null, pageSize: null, hasNextPage: null, error: null, metadata: null }, games: { status: 'ready', items: [21,22,23,24,25].map(id => ({ id, title: `${title} ${id}`, coverUrl: null, summary: '', releaseDate: null })), page: 1, pageSize: 5, hasNextPage: false, error: null, metadata: null }, error: null }; }
async function edit() { await userEvent.click(screen.getByRole('button', { name: 'Editar perfil' })); return screen.findByRole('dialog', { name: 'Editar perfil' }); }
function change(dialog: HTMLElement, label: string, value: string) { fireEvent.change(within(dialog).getByLabelText(label), { target: { value } }); }
test('somente botão junto ao nome, modal inicialmente fechado e disponível com perfil completo', async () => {
 await open({ data: { ...initial, country: 'Brasil', state: 'São Paulo', bio: 'Bio', favoriteGameIds: [11,12,13], favoriteGameCount: 3, isComplete: true } });
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.queryByRole('form')).not.toBeInTheDocument();
 expect(screen.getByRole('heading', { name: 'Ana', level: 2 }).parentElement).toContainElement(screen.getByRole('button', { name: 'Editar perfil' }));
 expect(within(await edit()).getByLabelText('País')).toHaveValue('Brasil');
});
test.each([{ logged: false }, { owner: false }])('privacidade %j', async options => { const { transport } = await open(options); expect(screen.queryByRole('button', { name: 'Editar perfil' })).not.toBeInTheDocument(); expect(transport.mock.calls.some(([url]) => url.endsWith('/profile-completion'))).toBe(false); });
test('selects dependentes sem escolha automática e cancelar descarta rascunho', async () => {
 const { patches } = await open(); const d = await edit(); expect(within(d).getByLabelText('País')).toHaveValue(''); expect(within(d).getByLabelText('Estado')).toBeDisabled();
 change(d,'País','Brasil'); change(d,'Estado','São Paulo'); change(d,'País','China'); expect(within(d).getByLabelText('Estado')).toHaveValue(''); expect(within(d).getByRole('option',{name:'Hubei'})).toBeInTheDocument(); expect(within(d).queryByRole('option',{name:'São Paulo'})).not.toBeInTheDocument();
 await userEvent.click(within(d).getByRole('button',{name:'Cancelar'})); expect(patches()).toHaveLength(0); expect(within(await edit()).getByLabelText('País')).toHaveValue('');
});
test('nome isolado salva incompleto com um PATCH e atualiza sessão/cabeçalho', async () => {
 const { patches } = await open(); const d = await edit(); change(d,'Nome de exibição','Ana nova'); await userEvent.click(within(d).getByRole('button',{name:'Salvar alterações'}));
 expect(await screen.findByText('Perfil atualizado.')).toBeVisible(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.getByRole('heading',{name:'Ana nova'})).toBeVisible(); expect(screen.getByLabelText('Usuário conectado')).toHaveTextContent('Ana nova');
 expect(patches()).toHaveLength(1); expect(JSON.parse(String(patches()[0][1].body))).toEqual({displayName:'Ana nova'}); expect(patches()[0][1].headers).toHaveProperty('Authorization','Bearer test-only');
});
test('localização legada é identificada e omitida ao salvar descrição', async () => {
 const { patches } = await open({ data: {...initial,country:' País antigo ',state:'Antigo'} }); const d=await edit(); expect(within(d).getByText(/Localização legada/)).toBeVisible(); change(d,'Descrição','Nova'); await userEvent.click(within(d).getByRole('button',{name:'Salvar alterações'})); await screen.findByText('Perfil atualizado.'); expect(JSON.parse(String(patches()[0][1].body))).toEqual({bio:'Nova'});
});
test('mais de cinco favoritos preservados; remoção somente no rascunho', async () => {
 const { patches,transport }=await open({data:{...initial,favoriteGameIds:[11,12,13,14,15,16],favoriteGameCount:6}}); const d=await edit(); expect(within(d).getAllByRole('button',{name:/^Remover Jogo/})).toHaveLength(6); await userEvent.click(within(d).getByRole('button',{name:'Remover Jogo 11'})); expect(patches()).toHaveLength(0); await userEvent.click(within(d).getByRole('button',{name:'Salvar alterações'})); await screen.findByText('Perfil atualizado.'); expect(JSON.parse(String(patches()[0][1].body))).toEqual({favoriteGameIds:[12,13,14,15,16]}); expect(transport.mock.calls.some(([url])=>/\/games\/\d+$/.test(url))).toBe(false);
});
test('busca debounce, limite cinco e Enter seleciona sem submeter/navegar', async () => {
 const { transport,patches }=await open(); const d=await edit(); vi.useFakeTimers();
 try { change(d,'Buscar jogos favoritos','ab'); await act(async()=>{await vi.advanceTimersByTimeAsync(350);}); expect(transport.mock.calls.filter(([url])=>url.includes('/search'))).toHaveLength(0); change(d,'Buscar jogos favoritos',' jogo '); await act(async()=>{await vi.advanceTimersByTimeAsync(299);}); expect(transport.mock.calls.filter(([url])=>url.includes('/search'))).toHaveLength(0); await act(async()=>{await vi.advanceTimersByTimeAsync(1);}); } finally {vi.useRealTimers();}
 const list=await within(d).findByRole('listbox',{name:'Sugestões de jogos favoritos'}); expect(within(list).getAllByRole('option')).toHaveLength(5); expect(within(list).getAllByText('Sem capa')).toHaveLength(5); const call=transport.mock.calls.find(([url])=>url.includes('/search')); expect(call?.[0]).toContain('scope=games'); expect(call?.[0]).toContain('mode=suggestions');
 const input=within(d).getByLabelText('Buscar jogos favoritos'); fireEvent.keyDown(input,{key:'ArrowDown'}); fireEvent.keyDown(input,{key:'Enter'}); expect(within(d).getByRole('button',{name:'Remover Resultado 21'})).toBeVisible(); expect(patches()).toHaveLength(0); expect(within(list).getByRole('option',{name:/Resultado 21/})).toHaveAttribute('aria-selected','true');
});
test('busca ignora resposta antiga e permite retry', async () => {
 const old=deferred<Response>(); let fail=true; const {transport}=await open({search:q=>q==='antigo'?old.promise:fail?Promise.reject(new Error('offline')):Promise.resolve(Response.json({...suggestions('Novo'),query:q}))}); const d=await edit(); change(d,'Buscar jogos favoritos','antigo'); await waitFor(()=>expect(transport.mock.calls.some(([url])=>url.includes('q=antigo'))).toBe(true)); change(d,'Buscar jogos favoritos','novo'); await within(d).findByText('Não foi possível buscar os jogos.'); fail=false; await userEvent.click(within(d).getByRole('button',{name:'Tentar novamente'})); await within(d).findByText('Novo 21'); await act(async()=>{old.resolve(Response.json(suggestions('Antigo')));}); expect(within(d).queryByText('Antigo 21')).not.toBeInTheDocument();
});
test('PATCH pendente bloqueia envio/fechamento; falha preserva rascunho', async () => {
 const pending=deferred<Response>(); const {patches}=await open({save:()=>pending.promise}); const d=await edit(); change(d,'Descrição','Rascunho'); const form=within(d).getByRole('form',{name:'Editar perfil'}); fireEvent.submit(form); fireEvent.submit(form); expect(patches()).toHaveLength(1); expect(within(d).getByRole('button',{name:'Cancelar'})).toBeDisabled(); fireEvent.keyDown(document,{key:'Escape'}); expect(d).toBeInTheDocument(); await act(async()=>{pending.resolve(Response.json({code:'storage_unavailable',message:'Indisponível'},{status:503}));}); expect(await within(d).findByRole('alert')).toHaveTextContent('armazenamento'); expect(within(d).getByLabelText('Descrição')).toHaveValue('Rascunho');
});
test('foco inicial, Tab restrito, Escape e retorno ao botão', async () => {
 const {interaction}=await open(); const d=await edit(); expect(within(d).getByLabelText('Nome de exibição')).toHaveFocus(); within(d).getByRole('button',{name:'Cancelar'}).focus(); await interaction.tab(); expect(within(d).getByRole('button',{name:'Fechar edição do perfil'})).toHaveFocus(); await interaction.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.getByRole('button',{name:'Editar perfil'})).toHaveFocus();
});
test('erro de leitura tem retry, sem rascunho vazio ou escrita', async () => {
 let fail=true; const {patches}=await open({read:()=>fail?Promise.reject(new Error('offline')):Promise.resolve(Response.json(initial))}); const d=await edit(); expect(await within(d).findByText('Não foi possível carregar os dados do perfil.')).toBeVisible(); expect(within(d).queryByRole('form')).not.toBeInTheDocument(); fail=false; await userEvent.click(within(d).getByRole('button',{name:'Tentar novamente'})); expect(await within(d).findByLabelText('Nome de exibição')).toHaveValue('Ana'); expect(patches()).toHaveLength(0);
});
test('valida nome e URL; avatar opcional permite limpar', async () => {
 const {patches}=await open({data:{...initial,avatarUrl:'https://example.test/avatar.png'}}); const d=await edit(); expect(within(d).getByRole('img',{name:'Prévia do avatar'})).toHaveAttribute('src','https://example.test/avatar.png'); change(d,'Nome de exibição',' '); await userEvent.click(within(d).getByRole('button',{name:'Salvar alterações'})); expect(patches()).toHaveLength(0); change(d,'Nome de exibição','Ana'); change(d,'URL do avatar (opcional)','javascript:bad'); await userEvent.click(within(d).getByRole('button',{name:'Salvar alterações'})); expect(patches()).toHaveLength(0); change(d,'URL do avatar (opcional)',''); await userEvent.click(within(d).getByRole('button',{name:'Salvar alterações'})); await screen.findByText('Perfil atualizado.'); expect(JSON.parse(String(patches()[0][1].body))).toEqual({avatarUrl:null});
});
test('salva localização parcial e favoritos com descrição no mesmo PATCH, reabre valores confirmados', async()=>{
 const {patches}=await open({data:{...initial,favoriteGameIds:[11,12],favoriteGameCount:2}}); const d=await edit(); change(d,'País','Brasil'); change(d,'Estado','São Paulo'); change(d,'Descrição','Bio');
 change(d,'Buscar jogos favoritos','jogo'); await userEvent.click(await within(d).findByRole('option',{name:/Resultado 21/})); expect(patches()).toHaveLength(0);
 await userEvent.click(within(d).getByRole('button',{name:'Salvar alterações'})); await screen.findByText('Perfil atualizado.'); expect(patches()).toHaveLength(1); expect(JSON.parse(String(patches()[0][1].body))).toEqual({bio:'Bio',country:'Brasil',state:'São Paulo',favoriteGameIds:[11,12,21]});
 expect(await within(screen.getByRole('region',{name:'Favoritos'})).findByRole('link',{name:'Jogo 21'})).toBeVisible(); const reopened=await edit(); expect(within(reopened).getByLabelText('Estado')).toHaveValue('São Paulo'); expect(within(reopened).getByText(/Perfil completo/)).toBeVisible();
});
test('X descarta rascunho e limpeza de país envia ambos os campos opcionais', async()=>{
 const {patches}=await open({data:{...initial,country:'Brasil',state:'São Paulo'}}); let d=await edit(); change(d,'Descrição','Não salvar'); await userEvent.click(within(d).getByRole('button',{name:'Fechar edição do perfil'})); expect(patches()).toHaveLength(0); d=await edit(); expect(within(d).getByLabelText('Descrição')).toHaveValue(''); change(d,'País',''); await userEvent.click(within(d).getByRole('button',{name:'Salvar alterações'})); await screen.findByText('Perfil atualizado.'); expect(JSON.parse(String(patches()[0][1].body))).toEqual({country:null,state:null});
});
test('401 descarta modal e sessão sem sucesso falso',async()=>{
 await open({save:async()=>Response.json({code:'unauthorized',message:'Sessão inválida'},{status:401})}); const d=await edit(); change(d,'Descrição','Bio'); await userEvent.click(within(d).getByRole('button',{name:'Salvar alterações'})); expect(await screen.findByText('Sua sessão expirou. Entre novamente.')).toBeVisible(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.queryByText('Perfil atualizado.')).not.toBeInTheDocument();
});
