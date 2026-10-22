import { test, expect, type Page } from '@playwright/test';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { once } from 'node:events';

// SQL/HTTP reais: nenhuma interceptação de request ou fixture de serviço no runtime.
const back = resolve('../Back'), base = 'http://127.0.0.1:5094';
let host: ChildProcess | undefined, games: number[];
function sql(query: string): string {
  return execFileSync('docker', ['exec', 'postgres-tcc', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'tcc_pr01_tests', '-Atc', query], { encoding: 'utf8', windowsHide: true }).trim();
}
async function start() {
  const line = readFileSync(resolve(back, '.env.postgres-test'), 'utf8').split(/\r?\n/).find(line => line.startsWith('ConnectionStrings__TccDatabase='));
  if (!line) throw new Error('Conexão de teste ausente');
  const connection = line.slice(line.indexOf('=') + 1);
  if (!/(?:^|;)\s*Database=tcc_pr01_tests(?:;|$)/i.test(connection) || !/(?:^|;)\s*Host=(127\.0\.0\.1|localhost)(?:;|$)/i.test(connection)) throw new Error('Alvo de teste não autorizado');
  expect(sql("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()" )).toBe('TCC exclusive automated tests P-PR-01');
  expect(sql("SELECT to_regclass('topicos_forum') IS NOT NULL AND to_regclass('respostas_forum') IS NOT NULL")).toBe('t');
  host = spawn('dotnet', [resolve(back, 'src/Tcc.Api/bin/ForumFront/Tcc.Api.dll'), '--urls', base], {
    cwd: resolve(back, 'src/Tcc.Api'), windowsHide: true, stdio: 'ignore',
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development', ConnectionStrings__TccDatabase: connection, Cors__AllowedOrigins__0: 'http://127.0.0.1:5188', IGDB__ClientId: '', IGDB__ClientSecret: '', Logging__LogLevel__Default: 'Warning' },
  });
  for (let tries = 0; tries < 80; tries++) {
    try { if ((await fetch(base + '/health')).ok) return; } catch { /* aguardando host */ }
    if (host.exitCode !== null) throw new Error('Host de teste encerrou antes de ficar disponível');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('API de teste indisponível');
}
async function stop() { if (host && host.exitCode === null) { const ended = once(host, 'exit'); host.kill(); await ended; } host = undefined; }
async function request(path: string, body?: unknown, token?: string) {
  const response = await fetch(base + '/api/v1' + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  expect(response.ok, `${path}: HTTP ${response.status}`).toBe(true);
  return await response.json() as { id: number; token: string; replyCount: number; items: { id: number }[] };
}
async function login(page: Page, email: string, password: string) {
  await page.getByRole('link', { name: 'Entrar', exact: true }).click(); await page.getByLabel('E-mail', { exact: true }).fill(email); await page.getByLabel('Senha', { exact: true }).fill(password); await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByLabel('Usuário conectado')).toBeVisible(); await expect(page).toHaveURL('http://127.0.0.1:5188/');
}
test.beforeAll(async () => {
  await start();
  // Fixtures SQL restritas ao banco marcado como exclusivo; sem reset ou dados de gamesdb.
  sql("INSERT INTO jogos (igdb_id,nome,descricao,capa_url,primeira_data_lancamento,dados_obtidos_em,criado_em,atualizado_em) VALUES (9000003001,'Jogo de integração do fórum','Jogo exclusivo do E2E.',NULL,'2024-01-01',NOW(),NOW(),NOW()),(9000003002,'Outro jogo do fórum','Teste de isolamento.',NULL,'2024-01-01',NOW(),NOW(),NOW()) ON CONFLICT (igdb_id) DO UPDATE SET dados_obtidos_em=NOW()");
  games = sql('SELECT id FROM jogos WHERE igdb_id IN (9000003001,9000003002) ORDER BY igdb_id').split('\n').map(Number);
  if (games.length !== 2 || games.some(id => !Number.isInteger(id) || id <= 0)) throw new Error('São necessários dois jogos no banco exclusivo de testes');
  sql(`UPDATE jogos SET dados_obtidos_em=NOW() WHERE id IN (${games.join(',')})`);
});
test.afterAll(stop);

for (const [device, width] of [['desktop', 1280], ['mobile', 390]] as const) {
  test(`${device}: duas contas, tópicos, paginação, visitante, isolamento e reinício SQL`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const suffix = `${device}-${Date.now()}`, password = 'Forum-test-1234!', email = `forum-a-${suffix}@example.test`, otherEmail = `forum-b-${suffix}@example.test`;
    await request('/auth/register', { name: 'Autor fórum', email, password });
    await request('/auth/register', { name: 'Leitor fórum', email: otherEmail, password });
    const owner = await request('/auth/login', { email, password });
    const other = await request('/auth/login', { email: otherEmail, password });
    for (let i = 0; i < 21; i++) await request(`/games/${games[0]}/forum/topics`, { title: `Tópico paginado ${suffix} ${i}`, text: 'Preparação da lista paginada no SQL.' }, owner.token);
    let defaultForumReads = 0;
    page.on('request', req => { if (req.url().includes('/forum/topics')) defaultForumReads++; });
    await page.goto(`/jogos/${games[0]}`);
    await expect(page.getByRole('tab', { name: 'Reviews', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Avaliações e reviews' })).toBeVisible();
    expect(defaultForumReads).toBe(0);
    await page.getByRole('tab', { name: 'Reviews', exact: true }).focus(); await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Fórum', exact: true })).toBeFocused();
    await expect(page.getByRole('link', { name: 'Entrar para criar tópico' })).toBeVisible();
    const topicsPager = page.getByRole('navigation', { name: 'Páginas dos tópicos' });
    await topicsPager.getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`jogos/${games[0]}\\?aba=forum&page=2$`));
    await topicsPager.getByRole('button', { name: 'Anterior', exact: true }).click();
    await login(page, email, password); await page.goBack();
    await expect(page.getByRole('tab', { name: 'Fórum', exact: true })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('button', { name: 'Criar tópico', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Criar tópico', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Criar tópico', exact: true }).click();
    const title = `Dicas para começar · ${device} ${Date.now() % 100000}`;
    await page.getByLabel('Título do tópico').fill(title); await page.getByLabel('Mensagem inicial').fill('Como vocês começaram neste jogo?');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).focus(); await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Fechar criação de tópico' })).toBeFocused();
    mkdirSync('docs/evidence', { recursive: true }); await page.screenshot({ path: `docs/evidence/F-PR-02-modal-${device}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Publicar tópico', exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    const topicUrl = page.url(), topicId = Number(new URL(topicUrl).pathname.split('/').at(-1));
    // Vinte respostas reais forçam a publicação pela UI a atravessar a fronteira da página.
    for (let i = 0; i < 20; i++) await request(`/forum/topics/${topicId}/replies`, { text: `Preparação ${i + 1}` }, other.token);
    await page.getByRole('button', { name: /Sair/ }).click(); await expect(page).toHaveURL('http://127.0.0.1:5188/'); await page.goBack(); await login(page, otherEmail, password); await page.goBack();
    await page.getByRole('link', { name: title, exact: true }).click();
    await expect(page).toHaveURL(topicUrl);
    await expect(page.getByLabel('Usuário conectado')).toHaveText('Leitor fórum');
    await page.getByLabel('Sua resposta').fill('Minha resposta publicada no navegador.'); await page.getByRole('button', { name: 'Publicar resposta', exact: true }).click();
    await expect(page.getByText('Página 2', { exact: true })).toBeVisible();
    await expect(page.getByText('Minha resposta publicada no navegador.', { exact: true })).toBeVisible();
    await expect(page.getByText('21 respostas', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Voltar ao Fórum' }).click(); await page.getByRole('link', { name: title, exact: true }).click(); await page.goBack();
    await expect(page.getByRole('tab', { name: 'Fórum', exact: true })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('button', { name: /Sair/ }).click(); await page.goto(topicUrl + '?page=2');
    await expect(page.getByRole('link', { name: 'Entrar para responder' })).toBeVisible();
    await expect(page.getByText('Minha resposta publicada no navegador.', { exact: true })).toBeVisible();
    expect(await page.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    mkdirSync('docs/evidence', { recursive: true }); await page.screenshot({ path: `docs/evidence/F-PR-02-${device}.png`, fullPage: true });
    await page.goto(`/jogos/${games[1]}/forum/${topicId}`); await expect(page.getByText('Tópico não encontrado neste jogo.', { exact: true })).toBeVisible(); await expect(page.getByText('Como vocês começaram neste jogo?', { exact: true })).toHaveCount(0);
    await stop(); await start(); await page.goto(topicUrl + '?page=2');
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible(); await expect(page.getByText('Minha resposta publicada no navegador.', { exact: true })).toBeVisible();
    expect((await request(`/forum/topics/${topicId}`)).replyCount).toBe(21);
  });
}
