import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { wireGame, wirePage, wireReview, wireUser } from '../http-fixtures';

for (const [device, width] of [['desktop', 1280], ['mobile', 390]] as const) {
  test(`${device}: favoritos antes das reviews e seções separadas`, async ({ page }) => {
    const games = [wireGame, { ...wireGame, id: 13, title: 'Outra aventura' }, { ...wireGame, id: 14, title: 'Uma jornada pelas estrelas' }];
    let favoriteReads = 0;
    await page.route('http://127.0.0.1:5091/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = [];
      if (path.endsWith('/auth/login')) body = { user: wireUser, token: 'test-only', expiresAt: '2080-01-01T00:00:00Z' };
      else if (path.endsWith('/auth/me') || path.endsWith('/users/1')) body = wireUser;
      else if (path.endsWith('/games/filters')) body = { genres: [], platforms: [] };
      else if (path.endsWith('/games')) body = wirePage();
      else if (path.endsWith('/favorites')) { favoriteReads++; body = { games, reviews: [wireReview] }; }
      else if (path.endsWith('/users/1/reviews')) body = [wireReview, { ...wireReview, id: 56 }, { ...wireReview, id: 57 }];
      else if (path.endsWith('/like/me')) body = { likedByMe: false };
      await route.fulfill({ json: body });
    });
    await page.setViewportSize({ width, height: 950 }); await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill('profile@example.test'); await page.getByLabel('Senha', { exact: true }).fill('test-only'); await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
    const gamesSection = page.getByRole('region', { name: 'Jogos favoritos', exact: true });
    const reviews = page.getByRole('region', { name: 'Reviews do usuário', exact: true });
    const favorites = page.getByRole('region', { name: 'Reviews favoritas', exact: true });
    await expect(gamesSection).toBeVisible(); await expect(reviews.getByRole('heading', { name: 'Minhas reviews', exact: true })).toBeVisible(); await expect(favorites).toBeAttached();
    await expect(reviews.getByText('3 reviews', { exact: true })).toBeVisible(); expect(favoriteReads).toBe(1);
    const g = (await gamesSection.boundingBox())!, r = (await reviews.boundingBox())!, f = (await favorites.boundingBox())!;
    expect(r.y - g.y - g.height).toBeGreaterThanOrEqual(47); expect(r.y + r.height).toBeLessThan(f.y);
    const cards = await gamesSection.getByRole('listitem').all();
    const first = (await cards[0].boundingBox())!, second = (await cards[1].boundingBox())!;
    if (width > 700) expect(Math.abs(first.y - second.y)).toBeLessThan(2); else expect(first.y + first.height).toBeLessThan(second.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mkdir('docs/evidence', { recursive: true }); await page.screenshot({ path: `docs/evidence/profile-order-${device}.png`, fullPage: true });
    await reviews.getByRole('button', { name: 'Próxima página de reviews do usuário', exact: true }).click(); await expect(reviews.getByText('Página 2 de 2', { exact: true })).toBeVisible(); await expect(gamesSection.getByRole('listitem')).toHaveCount(3);
  });
}
