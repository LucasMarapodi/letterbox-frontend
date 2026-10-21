import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { deferred } from './fixtures';
import { forumPage, openForum, topic, reply } from './forum-fixtures';

test('visitante lê tópico e respostas, sem formulários nem escritas; volta ao fórum', async () => {
  const { transport } = await openForum('/jogos/12/forum/41', async url => url.includes('/replies') ? Response.json(forumPage([reply])) : undefined);
  expect(await screen.findByRole('heading', { name: topic.title })).toBeVisible();
  expect(await screen.findByText(reply.text)).toBeVisible();
  expect(screen.getByText(topic.text)).toBeVisible();
  expect(screen.getByRole('link', { name: 'Voltar ao Fórum' })).toHaveAttribute('href', '/jogos/12?aba=forum&page=1');
  expect(screen.getByRole('link', { name: 'Entrar para responder' })).toHaveAttribute('href', '/login');
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(transport.mock.calls.some(([, init]) => init.method === 'POST')).toBe(false);
  expect(screen.queryByRole('button', { name: 'Responder nesta resposta' })).not.toBeInTheDocument();
});

test('rota com contexto divergente não mostra conteúdo nem busca respostas', async () => {
  const { transport } = await openForum('/jogos/13/forum/41');
  expect(await screen.findByText('Tópico não encontrado neste jogo.')).toBeVisible();
  expect(screen.queryByText(topic.text)).not.toBeInTheDocument();
  expect(transport.mock.calls.some(([url]) => url.includes('/replies'))).toBe(false);
});

test.each(['/jogos/12/forum/0', '/jogos/abc/forum/41'])('ID inválido não consulta tópico: %s', async path => {
  const { transport } = await openForum(path);
  expect(await screen.findByText('Tópico não encontrado neste jogo.')).toBeVisible();
  expect(transport.mock.calls.some(([url]) => url.includes('/forum/'))).toBe(false);
});

test('visitante vê convite para criar tópico sem POST; cancelar autenticado descarta rascunho', async () => {
  const { transport } = await openForum('/jogos/12?aba=forum&page=1');
  expect(await screen.findByRole('link', { name: 'Entrar para criar tópico' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Criar tópico' })).not.toBeInTheDocument();
  expect(transport.mock.calls.some(([, init]) => init.method === 'POST')).toBe(false);
});

test('criação modal: cancelar, limite, erro mantém rascunho, trava duplo envio e abre tópico salvo', async () => {
  const pending = deferred<Response>(); let writes = 0;
  const { transport } = await openForum('/jogos/12?aba=forum&page=1', async (url, init) => {
    if (url.endsWith('/forum/topics') && init.method === 'POST') {
      writes++; return writes === 1 ? Response.json({ code: 'storage_unavailable', message: 'Persistência indisponível' }, { status: 503 }) : pending.promise;
    }
    return undefined;
  }, true);
  const user = userEvent.setup();
  const trigger = await screen.findByRole('button', { name: 'Criar tópico' });
  await user.click(trigger); await user.type(screen.getByLabelText('Título do tópico'), 'Descartar');
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(trigger).toHaveFocus(); expect(writes).toBe(0);
  await user.click(trigger);
  expect(screen.getByLabelText('Título do tópico')).toHaveValue('');
  expect(screen.getByLabelText('Título do tópico')).toHaveAttribute('maxlength', '150');
  expect(screen.getByLabelText('Mensagem inicial')).toHaveAttribute('maxlength', '10000');
  await user.type(screen.getByLabelText('Título do tópico'), topic.title);
  await user.type(screen.getByLabelText('Mensagem inicial'), topic.text);
  await user.click(screen.getByRole('button', { name: 'Publicar tópico' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Persistência temporariamente indisponível');
  expect(screen.getByLabelText('Mensagem inicial')).toHaveValue(topic.text);
  await user.dblClick(screen.getByRole('button', { name: 'Publicar tópico' }));
  expect(writes).toBe(2);
  await act(async () => { pending.resolve(Response.json(topic, { status: 201 })); });
  await waitFor(() => expect(screen.getByLabelText('URL atual')).toHaveTextContent('/jogos/12/forum/41'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const request = transport.mock.calls.find(([, init]) => init.method === 'POST')!;
  expect(JSON.parse(String(request[1].body))).toEqual({ title: topic.title, text: topic.text });
  expect(request[1].headers).toHaveProperty('Authorization', 'Bearer test-only');
});

test('resposta: erro preserva rascunho; sucesso reconsulta contagem e última página, sem reenviar POST', async () => {
  let writes = 0, updated = false;
  const { transport } = await openForum('/jogos/12/forum/41', async (url, init) => {
    if (url.includes('/replies') && init.method === 'POST') {
      writes++;
      if (writes === 1) return Response.json({ code: 'validation_failed', message: 'Inválido' }, { status: 400 });
      updated = true; return Response.json(reply, { status: 201 });
    }
    if (url.endsWith('/forum/topics/41')) return Response.json({ ...topic, replyCount: updated ? 21 : 20 });
    if (url.includes('/replies')) { const p = Number(new URL(url).searchParams.get('page')); return Response.json(forumPage(p === 2 ? [reply] : [], p)); }
    return undefined;
  }, true);
  const user = userEvent.setup();
  const input = await screen.findByLabelText('Sua resposta'); await user.type(input, reply.text);
  await user.click(screen.getByRole('button', { name: 'Publicar resposta' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Revise os campos'); expect(input).toHaveValue(reply.text);
  await user.click(screen.getByRole('button', { name: 'Publicar resposta' }));
  expect(await screen.findByText(reply.text)).toBeVisible();
  expect(screen.getByText('Página 2')).toBeVisible(); expect(screen.getByLabelText('Sua resposta')).toHaveValue('');
  expect(writes).toBe(2);
  expect(transport.mock.calls.filter(([, init]) => init.method === 'POST').every(([, init]) => JSON.stringify(JSON.parse(String(init.body))) === JSON.stringify({ text: reply.text }))).toBe(true);
});

test('criação tardia após troca de sessão não navega e limpa rascunho privado', async () => {
  const pending = deferred<Response>();
  const { adapters } = await openForum('/jogos/12?aba=forum&page=1', async (url, init) => url.endsWith('/forum/topics') && init.method === 'POST' ? pending.promise : undefined, true);
  const user = userEvent.setup(); await user.click(await screen.findByRole('button', { name: 'Criar tópico' }));
  await user.type(screen.getByLabelText('Título do tópico'), topic.title); await user.type(screen.getByLabelText('Mensagem inicial'), topic.text);
  await user.click(screen.getByRole('button', { name: 'Publicar tópico' }));
  await act(async () => { adapters.http!().session.clear(); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await act(async () => { pending.resolve(Response.json(topic, { status: 201 })); });
  expect(screen.getByLabelText('URL atual')).toHaveTextContent('?aba=forum');
});

test('respostas falham isoladamente, permitem retry e renderizam HTML como texto', async () => {
  let reads = 0;
  await openForum('/jogos/12/forum/41', async url => {
    if (!url.includes('/replies')) return undefined;
    return ++reads === 1 ? Response.json({ code: 'storage_unavailable', message: 'Indisponível' }, { status: 503 }) : Response.json(forumPage([{ ...reply, text: '<script>alert(1)</script>' }]));
  });
  expect(await screen.findByRole('heading', { name: topic.title })).toBeVisible();
  const region = await screen.findByRole('region', { name: 'Respostas do tópico' });
  await userEvent.click(await within(region).findByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('<script>alert(1)</script>')).toBeVisible();
  expect(document.querySelector('script')).toBeNull();
});
