import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { wireUser, wireGame, wireReview, wirePage } from '../http-fixtures';

const account = { ...wireUser, id: 2, displayName: 'Leo', username: 'leo' };
const reviews = [{ ...wireReview, userId: 2, author: { ...wireReview.author, id: 2, displayName: 'Leo' } }, { ...wireReview, id: 56, userId: 3, author: { ...wireReview.author, id: 3, displayName: 'Bia' }, text: '' }];
const selected = new Set([55]);
const paths: string[] = [];
const writes: string[] = [];
let favoriteReads = 0;
let server: Server;
const lists = () => ({ games: [wireGame], reviews: reviews.filter(review => selected.has(review.id)) });
test.beforeAll(async () => {
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'OPTIONS') { response.statusCode = 204; response.end(); return; }
    const path = new URL(request.url ?? '/', 'http://127.0.0.1:5091').pathname;
    paths.push(path);
    let body: unknown;
    if (path.endsWith('/auth/login')) body = { token: 'test-only', expiresAt: '2080-01-01T00:00:00Z', user: account };
    else if (path.endsWith('/auth/me') || path === '/api/v1/users/2') body = account;
    else if (path === '/api/v1/games') body = wirePage();
    else if (path.endsWith('/dashboard')) body = { favorites: lists(), feed: [] };
    else if (path.endsWith('/like/me')) body = {likedByMe:false};
    else if (path === '/api/v1/community/reviews/recent') body = reviews;
    else if (path === '/api/v1/users/2/reviews') body = [reviews[0]];
    else if (path.endsWith('/followers') || path.endsWith('/following')) body = [];
    else if (path === '/api/v1/favorites') { favoriteReads++; body = lists(); }
    else if (path.startsWith('/api/v1/favorites/review/')) {
      const id = Number(path.split('/').at(-1));
      if (request.method === 'GET') { response.statusCode = 500; body = { code: 'http_error', message: 'GET por review não é permitido neste cenário.' }; }
      else {
        writes.push(`${request.method} ${id}`);
        if (request.method === 'DELETE') { selected.delete(id); response.statusCode = 204; response.end(); return; }
        selected.add(id); body = { id: 91, userId: 2, targetType: 'review', targetId: id };
      }
    } else { response.statusCode = 404; body = { code: 'not_found', message: 'Caminho de teste ausente.' }; }
    response.end(JSON.stringify(body));
  });
  server.listen(5091, '127.0.0.1'); await once(server, 'listening');
});
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

test('estrelas compartilham leitura, respondem ao teclado e removem a última favorita sem navegação', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill('test@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('test-only');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByLabel('Usuário conectado')).toHaveText('Leo');
  await page.getByRole('link', { name: 'Comunidade', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remover review de Leo dos favoritos', exact: true })).toHaveText('★');
  const star = page.getByRole('button', { name: 'Favoritar review de Bia', exact: true });
  await expect(star).toHaveAttribute('aria-pressed', 'false');
  const card = star.locator('xpath=ancestor::article');
  const favorite = star.locator('..');
  await page.mouse.move(0, 0);
  await expect(favorite).toHaveCSS('opacity', '0');
  await card.hover();
  await expect(favorite).toHaveCSS('opacity', '1');
  const cardBox = await card.boundingBox(); const starBox = await star.boundingBox();
  expect(cardBox).not.toBeNull(); expect(starBox).not.toBeNull();
  expect(starBox!.x).toBeGreaterThan(cardBox!.x + cardBox!.width - 85);
  expect(starBox!.y).toBeLessThan(cardBox!.y + 45);
  await page.mouse.move(0, 0);
  const chosen = page.getByRole('button', { name: 'Remover review de Leo dos favoritos', exact: true });
  await expect(chosen.locator('..')).toHaveCSS('opacity', '1');
  await star.focus();
  await expect(favorite).toHaveCSS('opacity', '1');
  await expect(page.getByRole('link', {name: 'Ler review'}).first()).toHaveText('');

  expect(favoriteReads).toBe(1);
  expect(paths.some(path => path.startsWith('/api/v1/favorites/review/'))).toBe(false);
  await star.focus(); await page.keyboard.press('Space');
  const remove = page.getByRole('button', { name: 'Remover review de Bia dos favoritos', exact: true });
  await expect(remove).toHaveAttribute('aria-pressed', 'true');
  await remove.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Favoritar review de Bia', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page).toHaveURL(/\/comunidade$/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await mkdir('docs/evidence', { recursive: true });
  await page.screenshot({ path: 'docs/evidence/S-PR-11-community-stars.png', fullPage: true });
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  const copies = page.getByRole('button', { name: 'Remover review de Leo dos favoritos', exact: true });
  await expect(copies).toHaveCount(2);
  const favoritesSection = page.getByRole('region', {name: 'Reviews favoritas', exact: true});
  for (const width of [1280, 390]) {
    await page.setViewportSize({width, height: 900});
    const sectionBox = await favoritesSection.boundingBox();
    const containerBox = await page.getByRole('region', {name: 'Favoritos', exact: true}).boundingBox();
    expect(sectionBox!.width).toBeGreaterThan(containerBox!.width - 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({width: 1280, height: 900});
  await favoritesSection.screenshot({path: 'docs/evidence/S-PR-11-favorites-full-width.png'});

  await page.getByRole('region', { name: 'Reviews favoritas', exact: true }).getByRole('button', { name: 'Remover review de Leo dos favoritos', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Reviews favoritas', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Favoritar review de Leo', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('region', { name: 'Jogos favoritos', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/perfil\/2$/);
  expect(writes).toEqual(['PUT 56', 'DELETE 56', 'DELETE 55']);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'docs/evidence/S-PR-11-profile-last-removed.png', fullPage: true });
});
