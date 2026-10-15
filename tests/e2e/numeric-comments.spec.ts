import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { wireUser, wireReview, wireComment, wireNotification, wirePage } from '../http-fixtures';

const review = { ...wireReview, userId: 2, author: { ...wireReview.author, id: 2, displayName: 'Outro' } };
const root = { ...wireComment, id: 81, text: 'Comentário principal' };
const reply = { ...wireComment, id: 82, parentCommentId: 81, likeCount: 3, text: 'Resposta existente' };
const created = { ...wireComment, id: 83, text: 'Comentário numérico publicado' };
let server: Server;
let published = false;
let submittedBody = '';

test.beforeAll(async () => {
  server = createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'OPTIONS') { response.statusCode = 204; response.end(); return; }
    const path = new URL(request.url ?? '/', 'http://127.0.0.1:5091').pathname;
    let body: unknown;
    if (path.endsWith('/auth/login')) body = { token: 'test-only', expiresAt: '2080-01-01T00:00:00Z', user: wireUser };
    else if (path.endsWith('/auth/me')) body = wireUser;
    else if (path === '/api/v1/games') body = wirePage();
    else if (path.endsWith('/dashboard')) body = { favorites: { games: [], reviews: [] }, feed: [review] };
    else if (path === '/api/v1/reviews/55') body = review;
    else if (path === '/api/v1/reviews/55/comments') {
      if (request.method === 'POST') {
        request.setEncoding('utf8');
        for await (const chunk of request) submittedBody += chunk;
        published = true; response.statusCode = 201; body = created;
      } else body = published ? [root, reply, created] : [root, reply];
    }
    else if (path === '/api/v1/favorites/review/55') body = { favorite: null };
    else if (path === '/api/v1/notifications') body = [{ ...wireNotification, type: 'review-comment', commentId: 82 }];
    else { response.statusCode = 404; body = { code: 'not_found', message: 'Caminho não configurado no teste.' }; }
    response.end(JSON.stringify(body));
  });
  server.listen(5091, '127.0.0.1'); await once(server, 'listening');
});
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

test('P-PR-04: lista, publica e abre notificação com comentários numéricos', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill('test@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('test-only');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('link', { name: 'Ler review', exact: true }).click();
  await expect(page).toHaveURL(/\/reviews\/55$/);
  const comments = page.getByRole('region', { name: 'Comentários', exact: true });
  await expect(comments.getByText(root.text, { exact: true })).toBeVisible();
  await expect(comments.getByText(reply.text, { exact: true })).toBeVisible();
  await page.getByLabel('Seu comentário', { exact: true }).fill(created.text);
  await page.getByRole('button', { name: 'Publicar comentário', exact: true }).click();
  await expect(page.getByText('Comentário publicado.', { exact: true })).toBeVisible();
  await expect(comments.getByText(created.text, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Seu comentário', { exact: true })).toHaveValue('');
  expect(JSON.parse(submittedBody)).toEqual({ text: created.text });
  await page.getByRole('button', { name: 'Notificações', exact: true }).click();
  const link = page.getByRole('dialog').getByRole('link', { name: /comentou na sua review/ });
  await expect(link).toHaveAttribute('href', '/reviews/55');
  await link.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(comments.getByText(created.text, { exact: true })).toBeVisible();
  await page.getByRole('heading', { name: 'Review', exact: true }).click();
  await mkdir('docs/evidence', { recursive: true });
  await page.screenshot({ path: 'docs/evidence/numeric-comments.png', fullPage: true });
});
