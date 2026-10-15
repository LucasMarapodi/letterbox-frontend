import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { wireGame, wirePage, wireUser } from '../http-fixtures';

const games = [
  { ...wireGame, title: `Ecos do Horizonte — ${'Jornada'.repeat(18)}`, summary: `${'Uma aventura com escolhas e novos caminhos. '.repeat(6)}\n${'Exploração'.repeat(22)}`, coverUrl: 'http://127.0.0.1:5091/capa.svg' },
  { ...wireGame, id: 13, title: 'Capa com falha', summary: 'Uma experiência em outro mundo.', coverUrl: 'http://127.0.0.1:5091/ausente.png' },
  { ...wireGame, id: 14, title: 'Jogo sem capa nem resumo', summary: '  ', coverUrl: null },
];
const paths: string[] = [];
let server: Server;
test.beforeAll(async () => {
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'OPTIONS') { response.statusCode = 204; response.end(); return; }
    const path = new URL(request.url ?? '/', 'http://127.0.0.1:5091').pathname;
    paths.push(path);
    if (path === '/capa.svg') { response.setHeader('Content-Type', 'image/svg+xml'); response.end('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><rect width="120" height="160" fill="#275b50"/><circle cx="60" cy="70" r="32" fill="#67daa3"/></svg>'); return; }
    let body: unknown;
    if (path.endsWith('/auth/login')) body = { token: 'test-only', expiresAt: '2080-01-01T00:00:00Z', user: wireUser };
    else if (path.endsWith('/auth/me') || path === '/api/v1/users/1') body = wireUser;
    else if (path === '/api/v1/games') body = wirePage();
    else if (path.endsWith('/dashboard')) body = { favorites: { games, reviews: [] }, feed: [] };
    else if (path === '/api/v1/favorites') body = { games, reviews: [] };
    else if (path === '/api/v1/games/12') body = games[0];
    else if (path.endsWith('/opinions')) body = { averageRating: null, reviews: [] };
    else if (path.endsWith('/rating/me')) body = { rating: null };
    else if (path.endsWith('/reviews/me')) body = { review: null };
    else if (path.includes('/favorites/')) body = { favorite: null };
    else if (path.endsWith('/reviews') || path.endsWith('/followers') || path.endsWith('/following')) body = [];
    else { response.statusCode = 404; body = { code: 'not_found', message: 'Caminho de teste ausente.' }; }
    response.end(JSON.stringify(body));
  });
  server.listen(5091, '127.0.0.1'); await once(server, 'listening');
});
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 800 }]) {
  test(`lista de favoritos ocupa linhas completas sem overflow em ${viewport.width}px`, async ({ page }) => {
    paths.length = 0;
    await page.setViewportSize(viewport);
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill('test@example.test');
    await page.getByLabel('Senha', { exact: true }).fill('test-only');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Feed de reviews', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Jogos favoritos', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
    const section = page.getByRole('region', { name: 'Jogos favoritos', exact: true });
    const list = section.getByRole('list', { name: 'Jogos favoritos', exact: true });
    const rows = list.getByRole('listitem');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).getByText(games[0].summary, { exact: true })).toBeVisible();
    await expect(rows.nth(1).getByRole('img')).toHaveText('Sem capa');
    await expect(rows.nth(2).getByText('Resumo não informado.', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Reviews favoritas', exact: true })).toHaveCount(0);
    // O StrictMode do Vite pode repetir efeitos; nenhum item deve consultar seus detalhes.
    expect(paths.some(path => path.startsWith('/api/v1/games/'))).toBe(false);
    const geometry = await list.evaluate(element => {
      const listBox = element.getBoundingClientRect();
      return { width: listBox.width, rows: Array.from(element.children).map(row => {
        const box = row.getBoundingClientRect();
        const image = row.querySelector('[role="img"], img')?.getBoundingClientRect();
        const text = row.querySelector('h3')?.getBoundingClientRect();
        return { x: box.x, top: box.top, bottom: box.bottom, width: box.width, imageRight: image?.right ?? 0, textLeft: text?.left ?? 0, overflow: row.scrollWidth > row.clientWidth + 1 };
      }) };
    });
    for (const [index, row] of geometry.rows.entries()) {
      expect(Math.abs(row.width - geometry.width)).toBeLessThan(2);
      expect(row.overflow).toBe(false);
      expect(row.imageRight).toBeLessThan(row.textLeft);
      if (index > 0) expect(row.top).toBeGreaterThan(geometry.rows[index - 1].bottom);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await mkdir('docs/evidence', { recursive: true });
    await page.screenshot({ path: `docs/evidence/S-PR-20-favorites-${viewport.width}.png`, fullPage: true });
    const link = rows.nth(0).getByRole('link', { name: games[0].title, exact: true });
    await link.focus(); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/jogos\/12$/);
    await expect(page.getByRole('heading', { name: games[0].title, exact: true })).toBeVisible();
  });
}
