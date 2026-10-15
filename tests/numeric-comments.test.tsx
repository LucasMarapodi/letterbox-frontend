import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { decodeComment, decodeNotification } from '../src/services/http/decoders';
import type { FetchTransport } from '../src/services/http/client';
import { wireComment, wireReview, wireNotification, withAuthentication } from './http-fixtures';

const root = { ...wireComment, id: 81, parentCommentId: null, likeCount: 0, text: 'Comentário principal' };
const reply = { ...root, id: 82, parentCommentId: 81, likeCount: 3, text: 'Resposta existente' };

test('P-PR-04 preserva IDs numéricos, pai nullable e contagem zero/positiva na leitura', () => {
  expect(decodeComment(root)).toEqual(root);
  expect(decodeComment(reply)).toEqual(reply);
  expect(decodeComment({ ...reply, id: 2_147_483_647, parentCommentId: 2_147_483_646, likeCount: 2_147_483_647 }).id).toBe(2_147_483_647);
});

test.each([0, -1, 1.5, 2_147_483_648, '81', NaN, Infinity, null, undefined, true])('ID de comentário inválido %j é rejeitado', id => {
  expect(() => decodeComment({ ...root, id })).toThrow();
});

test.each([0, -1, 1.5, 2_147_483_648, '81', undefined])('parentCommentId inválido %j é rejeitado', parentCommentId => {
  expect(() => decodeComment({ ...reply, parentCommentId })).toThrow();
});

test.each([-1, 1.5, 2_147_483_648, '3', NaN, Infinity, null, undefined])('likeCount inválido %j é rejeitado', likeCount => {
  expect(() => decodeComment({ ...root, likeCount })).toThrow();
});

test('notificação de comentário aceita commentId numérico e mantém ID próprio textual', () => {
  expect(decodeNotification({ ...wireNotification, type: 'review-comment', commentId: 82 })).toMatchObject({ id: wireNotification.id, commentId: 82 });
  for (const commentId of [0, -1, 1.5, 2_147_483_648, '82', null]) {
    expect(() => decodeNotification({ ...wireNotification, type: 'review-comment', commentId })).toThrow();
  }
});

test('lista e publicação aceitam o contrato novo; notificação numérica abre a review', async () => {
  let published = false;
  const created = { ...root, id: 83, text: 'Comentário novo' };
  const otherReview = { ...wireReview, userId: 2, author: { ...wireReview.author, id: 2, displayName: 'Outro' } };
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async (url, init) => {
    const path = new URL(url).pathname;
    if (path === '/api/v1/reviews/55') return Response.json(otherReview);
    if (path.endsWith('/comments')) {
      if (init.method === 'POST') { published = true; return Response.json(created, { status: 201 }); }
      return Response.json(published ? [root, reply, created] : [root, reply]);
    }
    if (path.includes('/favorites/')) return Response.json({ favorite: null });
    if (path === '/api/v1/notifications') return Response.json([{ ...wireNotification, type: 'review-comment', commentId: 82 }]);
    throw new Error(`Consulta inesperada: ${path}`);
  }));
  const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  await services.auth.login({ email: 'test@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={['/reviews/55']}><AppRoutes adapters={services} /></MemoryRouter>);
  const interaction = userEvent.setup();
  const comments = await screen.findByRole('region', { name: 'Comentários' });
  expect(await within(comments).findByText(root.text)).toBeVisible();
  expect(within(comments).getByText(reply.text)).toBeVisible();
  await interaction.type(await screen.findByLabelText('Seu comentário'), created.text);
  await interaction.click(screen.getByRole('button', { name: 'Publicar comentário' }));
  expect(await screen.findByText('Comentário publicado.')).toBeVisible();
  expect(await within(comments).findByText(created.text)).toBeVisible();
  const request = transport.mock.calls.find(([, init]) => init.method === 'POST');
  expect(request?.[1].body).toBe(JSON.stringify({ text: created.text }));
  await interaction.click(screen.getByRole('button', { name: 'Notificações' }));
  const dialog = await screen.findByRole('dialog');
  const link = await within(dialog).findByRole('link', { name: /comentou na sua review/ });
  expect(link).toHaveAttribute('href', '/reviews/55');
  await interaction.click(link);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText(root.text)).toBeVisible();
});
