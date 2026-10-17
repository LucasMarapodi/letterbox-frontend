import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const api = 'http://127.0.0.1:5081';
const origin = 'http://127.0.0.1:5174';
let host: ChildProcess | undefined;
type Call = { method: string; path: string; status: number; source: 'browser' | 'infrastructure' | 'permissions' };
const calls: Call[] = [];
let inventory: string[] = [];
let corsMismatch = false;
const routes = [
  '/auth/register', '/auth/login', '/auth/logout', '/auth/me',
  '/users/{userId}', '/users/me/profile', '/users/{userId}/reviews', '/users/{userId}/followers', '/users/{userId}/following',
  '/games', '/games/{gameId}', '/games/{gameId}/opinions', '/games/{gameId}/rating/me', '/games/{gameId}/reviews', '/games/{gameId}/reviews/me',
  '/reviews/{reviewId}', '/reviews/{reviewId}/comments', '/users/{userId}/follow', '/users/{userId}/follow/me',
  '/favorites', '/favorites/{kind}/{targetId}', '/dashboard', '/feed/following',
  '/community/reviews/recent', '/community/reviews/most-commented', '/community/games/in-discussion', '/notifications',
];
function template(path: string): string {
  const route = routes.find((item) => new RegExp(`^/api/v1${item.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(path));
  return route ? `/api/v1${route}` : path;
}
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Estrutura de contrato inválida.');
  return Object.fromEntries(Object.entries(value));
}
function string(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('Campo de contrato inválido.');
  return value;
}
function observe(page: Page): void {
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === api) {
      calls.push({ method: response.request().method(), path: template(url.pathname), status: response.status(), source: 'browser' });
      if (response.headers()['access-control-allow-origin'] !== origin) corsMismatch = true;
    }
  });
}
async function start(request: APIRequestContext): Promise<void> {
  host = spawn('dotnet', [resolve('../Back/src/Tcc.Api/bin/Release/net10.0/Tcc.Api.dll')], {
    cwd: resolve('../Back/src/Tcc.Api'), stdio: 'ignore', windowsHide: true,
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development', ASPNETCORE_URLS: api, Cors__AllowedOrigins__0: origin, Cors__AllowedOrigins__1: 'http://localhost:5174' },
  });
  await expect.poll(async () => {
    if (host?.exitCode !== null) throw new Error('A API de teste não iniciou; compile Back Release antes do E2E.');
    try { return (await request.get(`${api}/health`, { timeout: 1000 })).status(); } catch { return 0; }
  }, { timeout: 20_000 }).toBe(200);
}
async function stop(): Promise<void> {
  if (host && host.exitCode === null) { const exited = once(host, 'exit'); host.kill(); await exited; }
  host = undefined;
}
test.beforeAll(async ({ request }) => { await start(request); });
test.afterAll(async () => { await stop(); });
async function home(page: Page): Promise<void> { await page.getByRole('link', { name: 'Game Reviews', exact: true }).click(); }
async function game(page: Page, id: number): Promise<void> { await home(page); await page.locator(`a[href="/jogos/${id}"]`).first().click(); }
async function register(page: Page, name: string, email: string, password: string): Promise<void> {
  await page.goto('/cadastro');
  await page.getByLabel('Nome', { exact: true }).fill(name);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByText('Conta criada. Entre para continuar.', { exact: true })).toBeVisible();
}
async function login(page: Page, email: string, password: string): Promise<{ token: string; userId: number }> {
  await page.locator('.site-header').getByRole('link', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Login', exact: true })).toBeVisible();
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  const response = page.waitForResponse((r) => r.url() === `${api}/api/v1/auth/login` && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  const body: unknown = await (await response).json();
  const data = record(body);
  await expect(page.getByRole('link', { name: 'Meu perfil', exact: true })).toBeVisible();
  return { token: string(data.token), userId: localId(record(data.user).id) };
}
function localId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0 || value > 2_147_483_647) throw new Error('ID local inválido.');
  return value;
}
async function publish(page: Page, id: number, text: string): Promise<number> {
  await game(page, id);
  await page.getByLabel('Sua review', { exact: true }).fill(text);
  const response = page.waitForResponse((r) => r.url() === `${api}/api/v1/games/${id}/reviews` && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Publicar review', exact: true }).click();
  const body: unknown = await (await response).json();
  await expect(page.getByText('Review publicada.', { exact: true })).toBeVisible();
  return localId(record(body).id);
}

test('34 endpoints em ações de duas contas, CORS, isolamento e indisponibilidade reais', async ({ browser, request }) => {
  const a = await browser.newPage({ baseURL: origin });
  const b = await browser.newPage({ baseURL: origin });
  observe(a); observe(b);
  await mkdir('docs/evidence', { recursive: true });
  const suffix = randomUUID();
  const password = randomUUID();
  const emailA = `e2e.a.${suffix}@example.test`;
  const emailB = `e2e.b.${suffix}@example.test`;
  for (const path of ['/health', '/openapi/v1.json']) {
    const response = await request.get(`${api}${path}`);
    expect(response.status()).toBe(200);
    calls.push({ method: 'GET', path, status: response.status(), source: 'infrastructure' });
    if (path.includes('openapi')) {
      const body: unknown = await response.json();
      const paths = record(record(body).paths);
      const operations = Object.entries(paths).flatMap(([route, methods]) => Object.keys(record(methods)).filter((m) => ['get','post','patch','put','delete'].includes(m)).map((m) => `${m.toUpperCase()} ${route}`));
      expect(operations.filter((item) => item.includes('/api/v1/'))).toHaveLength(34);
      inventory = operations.filter((item) => item.includes('/api/v1/'));
    }
  }
  await register(a, 'E2E Autora', emailA, password);
  // Cadastro duplicado é resposta real 409, apresentada pela UI.
  await a.goto('/cadastro');
  await a.getByLabel('Nome', { exact: true }).fill('E2E Autora');
  await a.getByLabel('E-mail', { exact: true }).fill(emailA);
  await a.getByLabel('Senha', { exact: true }).fill(password);
  await a.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(a.getByText('Este e-mail já está cadastrado.', { exact: true })).toBeVisible();
  const sessionA = await login(a, emailA, password);
  await a.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await a.getByLabel('Biografia', { exact: true }).fill('Perfil E2E atualizado pela API.');
  await a.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(a.getByText('Perfil atualizado.', { exact: true })).toBeVisible();
  const first = await publish(a, 1, 'Review E2E da autora.');
  await a.getByRole('radio', { name: '5 estrelas', exact: true }).check();
  await a.getByRole('button', { name: 'Salvar nota', exact: true }).click();
  await expect(a.getByText('Nota 5 salva.', { exact: true })).toBeVisible();
  await game(a, 1);
  await expect(a.getByRole('radio', { name: '5 estrelas', exact: true })).toBeChecked();
  await a.getByRole('link', { name: 'Editar minha review', exact: true }).click();
  await a.getByLabel('Sua review', { exact: true }).fill('Review E2E editada pela autora.');
  await a.getByRole('button', { name: 'Salvar review', exact: true }).click();
  await expect(a.getByText('Review atualizada.', { exact: true })).toBeVisible();
  await register(b, 'E2E Leitora', emailB, password);
  const sessionB = await login(b, emailB, password);
  await expect(b.getByText('Nenhuma review de pessoas seguidas.', { exact: true })).toBeVisible();
  await b.getByRole('link', { name: 'Comunidade', exact: true }).click();
  await b.locator(`a[href="/reviews/${first}"]`).first().click();
  await expect(b.getByText('Review E2E editada pela autora.', { exact: true })).toBeVisible();
  await expect(b.getByRole('button', { name: 'Salvar review', exact: true })).toHaveCount(0);
  await b.getByLabel('Seu comentário', { exact: true }).fill('Comentário E2E da leitora.');
  await b.getByRole('button', { name: 'Publicar comentário', exact: true }).click();
  await expect(b.getByText('Comentário E2E da leitora.', { exact: true })).toBeVisible();
  await b.getByRole('button', { name: 'Favoritar review', exact: true }).click();
  await expect(b.getByRole('button', { name: 'Remover review dos favoritos', exact: true })).toBeVisible();
  await b.locator(`a[href="/perfil/${sessionA.userId}"]`).first().click();
  await expect(b.getByText('Perfil E2E atualizado pela API.', { exact: true })).toBeVisible();
  await b.getByRole('button', { name: 'Seguir', exact: true }).click();
  await expect(b.getByRole('button', { name: 'Deixar de seguir', exact: true })).toBeVisible();
  await publish(a, 2, 'Nova review E2E para o feed.');
  await home(b);
  await b.getByRole('link', { name: 'Comunidade', exact: true }).click();
  await b.getByRole('button', { name: 'Feed de reviews', exact: true }).click();
  await b.getByRole('button', { name: 'Atualizar feed', exact: true }).click();
  await expect(b.getByText('Nova review E2E para o feed.', { exact: true })).toBeVisible();
  await b.getByRole('button', { name: 'Notificações', exact: true }).click();
  await expect(b.getByText('E2E Autora publicou uma nova review', { exact: true })).toBeVisible();
  await b.screenshot({ path: 'docs/evidence/I-PR-07-notifications.png' });
  await b.keyboard.press('Escape');
  await expect(b.getByRole('button', { name: 'Notificações', exact: true })).toBeFocused();
  await game(b, 3);
  await b.getByRole('button', { name: 'Favoritar jogo', exact: true }).click();
  await expect(b.getByRole('button', { name: 'Remover jogo dos favoritos', exact: true })).toBeVisible();
  await b.getByRole('button', { name: 'Remover jogo dos favoritos', exact: true }).click();
  await expect(b.getByRole('button', { name: 'Favoritar jogo', exact: true })).toBeVisible();
  await b.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await b.locator(`a[href="/reviews/${first}"]`).first().click();
  await b.getByRole('button', { name: 'Remover review dos favoritos', exact: true }).click();
  await expect(b.getByRole('button', { name: 'Favoritar review', exact: true })).toBeVisible();
  await b.locator(`a[href="/perfil/${sessionA.userId}"]`).first().click();
  await b.getByRole('button', { name: 'Deixar de seguir', exact: true }).click();
  await expect(b.getByRole('button', { name: 'Seguir', exact: true })).toBeVisible();
  await b.getByRole('link', { name: 'Comunidade', exact: true }).click();
  await b.getByRole('button', { name: 'Mais comentadas', exact: true }).click();
  for (const period of ['24h', '7d', '30d']) await b.getByLabel('Período dos rankings').selectOption(period);
  await b.getByRole('button', { name: 'Jogos em discussão', exact: true }).click();
  await expect(b.getByRole('heading', { name: 'Jogos em discussão', exact: true })).toBeVisible();
  // Permission checks target the real API; hidden controls are not fabricated in the UI.
  for (const [method, path, expected, data, token] of [
    ['PATCH', `/reviews/${first}`, 403, { text: 'Tentativa de outra conta.' }, sessionB.token],
    ['POST', '/games/1/reviews', 409, { text: 'Duplicada.' }, sessionA.token],
    ['GET', '/dashboard', 401, undefined, ''],
  ] satisfies [string, string, number, { text: string } | undefined, string][]) {
    const response = await request.fetch(`${api}/api/v1${path}`, { method, data, headers: { Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    expect(response.status()).toBe(expected);
    expect(response.headers()['access-control-allow-origin']).toBe(origin);
    calls.push({ method, path: template(`/api/v1${path}`), status: response.status(), source: 'permissions' });
  }
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
    const response = await request.fetch(`${api}/api/v1/users/me/profile`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': 'authorization,content-type' } });
    expect(response.status()).toBe(204);
    expect(response.headers()['access-control-allow-origin']).toBe(origin);
    expect(response.headers()['access-control-allow-methods']).toContain(method);
    const allowedHeaders = response.headers()['access-control-allow-headers'].toLowerCase().split(',').map((header) => header.trim());
    expect(allowedHeaders).toContain('authorization');
    expect(allowedHeaders).toContain('content-type');
  }
  const forbiddenOrigin = await request.get(`${api}/health`, { headers: { Origin: 'http://untrusted.invalid' } });
  expect(forbiddenOrigin.headers()['access-control-allow-origin']).toBeUndefined();
  // Revoke the actual UI token, then a real UI private call must clear that session.
  await request.post(`${api}/api/v1/auth/logout`, { headers: { Authorization: `Bearer ${sessionB.token}` } });
  await home(b);
  await expect(b.getByRole('link', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(b.getByRole('link', { name: 'Meu perfil', exact: true })).toHaveCount(0);
  const cdp = await a.context().newCDPSession(a);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 2500, downloadThroughput: -1, uploadThroughput: -1 });
  const notificationRequest = a.waitForRequest(`${api}/api/v1/notifications`);
  const cancelledNotification = a.waitForEvent('requestfailed', { predicate: (r) => r.url() === `${api}/api/v1/notifications` });
  await a.getByRole('button', { name: 'Notificações', exact: true }).click();
  await notificationRequest;
  await a.keyboard.press('Escape');
  await a.getByRole('button', { name: /^Sair/ }).click();
  await cancelledNotification;
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await cdp.detach();
  await expect(a.getByRole('link', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(a.getByRole('dialog')).toHaveCount(0);
  // A new confirmed session must also be invalidated by a real host restart.
  await login(a, emailA, password);
  await expect(a.getByRole('button', { name: 'Atualizar feed', exact: true })).toBeVisible();
  // Stop only the host owned by this suite; the developer's :5080 API is untouched.
  await stop();
  await home(b);
  await b.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  await expect(b.getByText('Não foi possível carregar os jogos.', { exact: true })).toBeVisible();
  await expect(b.locator('.game-grid')).toHaveCount(0);
  await start(request);
  await b.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(b.locator('.game-grid')).toBeVisible();
  await a.getByRole('button', { name: 'Atualizar feed', exact: true }).click();
  await expect(a.getByRole('link', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(a.getByRole('link', { name: 'Meu perfil', exact: true })).toHaveCount(0);
  const browserCalls = new Set(calls.filter((c) => c.source === 'browser' && c.status >= 200 && c.status < 300).map((c) => `${c.method} ${c.path}`));
  // Required methods include shared resource paths with multiple verbs.
  expect([...browserCalls].sort()).toEqual(inventory.sort());
  expect(corsMismatch).toBe(false);
  await writeFile('docs/evidence/I-PR-07-calls.json', JSON.stringify({ date: new Date().toISOString().slice(0, 10), front: origin, api, calls }, null, 2));
  await b.getByRole('heading', { name: 'Game Reviews', exact: true }).click();
  await b.screenshot({ path: 'docs/evidence/I-PR-07-public.png', fullPage: true });
  await a.close(); await b.close();
});
