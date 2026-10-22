import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { deferred } from './fixtures';
import { forumPage, openForum, topic } from './forum-fixtures';

test('Reviews é padrão e Fórum só consulta ao ativar; URL, links e histórico preservam contexto', async () => {
  const { transport } = await openForum(); const user = userEvent.setup();
  expect(await screen.findByText('Nota média: 4,5 de 5')).toBeVisible();
  expect(screen.getByRole('tab', { name: 'Reviews' })).toHaveAttribute('aria-selected', 'true');
  expect(transport.mock.calls.some(([url]) => url.includes('/forum/'))).toBe(false);
  await user.click(screen.getByRole('tab', { name: 'Fórum' }));
  expect(await screen.findByRole('link', { name: topic.title })).toHaveAttribute('href', '/jogos/12/forum/41');
  expect(screen.getByLabelText('URL atual')).toHaveTextContent('/jogos/12?aba=forum&page=1');
  expect(screen.getByRole('tabpanel')).toHaveTextContent('0 respostas');
  await user.click(screen.getByRole('button', { name: 'Voltar no histórico' }));
  expect(await screen.findByText('Nota média: 4,5 de 5')).toBeVisible();
});

test('link direto pagina na API, mantém cabeçalho e desabilita limites', async () => {
  const { transport } = await openForum('/jogos/12?aba=forum&page=2', async url => url.includes('/forum/topics') ? Response.json(forumPage([topic], 2)) : undefined);
  expect(await screen.findByRole('link', { name: topic.title })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Jogo HTTP' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
  expect(transport.mock.calls.some(([url]) => url.endsWith('/games/12/forum/topics?page=2'))).toBe(true);
});

test.each(['?aba=outra&page=2', '?page=9'])('aba inválida %s abre Reviews sem consulta de fórum', async query => {
  const { transport } = await openForum('/jogos/12' + query);
  expect(await screen.findByText('Nota média: 4,5 de 5')).toBeVisible();
  expect(screen.getByRole('tab', { name: 'Reviews' })).toHaveAttribute('aria-selected', 'true');
  expect(transport.mock.calls.some(([url]) => url.includes('/forum/'))).toBe(false);
});

test('página inválida vira 1, vazio é distinto de erro e retry não perde contexto', async () => {
  let reads = 0;
  const { transport } = await openForum('/jogos/12?aba=forum&page=-2', async url => {
    if (!url.includes('/forum/topics')) return undefined;
    return ++reads === 1 ? Response.json({ code: 'storage_unavailable', message: 'Indisponível' }, { status: 503 }) : Response.json(forumPage());
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os tópicos.');
  expect(screen.queryByText('Nenhum tópico neste jogo.')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Nenhum tópico neste jogo.')).toBeVisible();
  expect(transport.mock.calls.filter(([url]) => url.includes('/forum/topics')).every(([url]) => new URL(url).searchParams.get('page') === '1')).toBe(true);
});

test('paginação, teclado e resposta atrasada não misturam jogos', async () => {
  const pending = deferred<Response>();
  await openForum('/jogos/12?aba=forum&page=1', async url => {
    if (!url.includes('/forum/topics')) return undefined;
    const parsed = new URL(url), page = Number(parsed.searchParams.get('page'));
    if (url.includes('/games/13/')) return Response.json(forumPage([]));
    if (page === 2) return pending.promise;
    return Response.json(forumPage([topic], 1, true));
  });
  await screen.findByRole('link', { name: topic.title });
  const pager = screen.getByRole('navigation', { name: 'Páginas dos tópicos' });
  expect(within(pager).getByRole('button', { name: 'Anterior' })).toBeDisabled();
  await userEvent.click(within(pager).getByRole('button', { name: 'Próxima' }));
  expect(screen.getByText('Carregando tópicos…')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Outro jogo' }));
  await screen.findByText('Nenhum tópico neste jogo.');
  await act(async () => { pending.resolve(Response.json(forumPage([topic], 2))); });
  await waitFor(() => expect(screen.queryByRole('link', { name: topic.title })).not.toBeInTheDocument());
  screen.getByRole('tab', { name: 'Fórum' }).focus();
  await userEvent.keyboard('{ArrowLeft}');
  expect(screen.getByRole('tab', { name: 'Reviews' })).toHaveFocus();
});
