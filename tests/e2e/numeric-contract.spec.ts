import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { wireUser, wireGame, wireReview } from '../http-fixtures';

const account = { ...wireUser, id: 42 };
const game = { ...wireGame, id: 12, igdbId: 345447 };
const review = { ...wireReview, userId: 42, gameId: 12, author: { ...wireReview.author, id: 42 }, game: { ...wireReview.game, id: 12 } };
let server: Server;
let storageUnavailable = true;
const paths: string[] = [];
test.beforeAll(async () => {
  // Contratos P-PR-01/02 sintéticos; nenhuma credencial/conta real.
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'OPTIONS') { response.statusCode = 204; response.end(); return; }
    const path = new URL(request.url ?? '/', 'http://127.0.0.1:5091').pathname;
    paths.push(path);
    let body: unknown = [];
    if (path.endsWith('/auth/register')) { response.statusCode = 201; body = account; }
    else if (path.endsWith('/auth/login')) {
      if (storageUnavailable) { response.statusCode = 503; body = { code: 'storage_unavailable', message: 'Indisponível.' }; }
      else body = { token: 'test-only', expiresAt: '2080-01-01T00:00:00Z', user: account };
    }
    else if (path.endsWith('/auth/me') || path === '/api/v1/users/42') body = account;
    else if (path === '/api/v1/games') body = { items: [game], page: 1, pageSize: 20, hasNextPage: false };
    else if (path === '/api/v1/games/12') body = game;
    else if (path.endsWith('/opinions')) body = { averageRating: 3, reviews: [review] };
    else if (path.endsWith('/rating/me')) body = { rating: { id: 'rating-test', userId: 42, gameId: 12, value: 3 } };
    else if (path.endsWith('/reviews/me')) body = { review };
    else if (path === '/api/v1/favorites/game/12') body = { favorite: { id: 'favorite-test', userId: 42, targetType: 'game', targetId: '12' } };
    else if (path.includes('/favorites/')) body = { favorite: null };
    else if (path.endsWith('/dashboard')) body = { favorites: { games: [game], reviews: [] }, feed: [review] };
    else if (path.endsWith('/favorites')) body = { games: [game], reviews: [] };
    else if (path === '/api/v1/users/42/reviews') body = [review];
    else if (path === `/api/v1/reviews/${encodeURIComponent(review.id)}`) body = review;
    response.end(JSON.stringify(body));
  });
  server.listen(5091, '127.0.0.1'); await once(server, 'listening');
});
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

test('contrato numérico: cadastro, storage_unavailable, login/me, jogo local e perfil/autoria', async ({ page }) => {
  await page.goto('/cadastro');
  await page.getByLabel('Nome', { exact: true }).fill('Conta de teste');
  await page.getByLabel('E-mail', { exact: true }).fill('test@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('test-only');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('E-mail', { exact: true }).fill('test@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('test-only');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('O armazenamento está temporariamente indisponível. Tente novamente.');
  storageUnavailable = false;
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByLabel('Usuário conectado')).toHaveText('Ana');
  await expect(page.getByRole('link', { name: 'Meu perfil' })).toHaveAttribute('href', '/perfil/42');
  await page.getByRole('region', { name: 'Jogos', exact: true }).getByRole('link', { name: game.title, exact: true }).click();
  await expect(page).toHaveURL(/\/jogos\/12$/);
  await expect(page.getByRole('radio', { name: '3 estrelas', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Remover jogo dos favoritos' })).toBeVisible();
  expect(paths).toContain('/api/v1/games/12');
  expect(paths.some(path => path.includes('345447'))).toBe(false);
  await page.getByRole('link', { name: 'Meu perfil' }).click();
  await expect(page.getByRole('form', { name: 'Editar perfil', exact: true })).toBeVisible();
  await page.getByRole('link', { name: `Ler review de ${game.title}`, exact: true }).click();
  await expect(page.getByRole('form', { name: 'Salvar review', exact: true })).toBeVisible();
  await expect(page.getByLabel('Seu comentário', { exact: true })).toHaveCount(0);
  await mkdir('docs/evidence', { recursive: true });
  await page.screenshot({ path: 'docs/evidence/numeric-contract-owner.png', fullPage: true });
});
