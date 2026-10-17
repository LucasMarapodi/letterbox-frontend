import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', testMatch: 'profile-order.spec.ts', workers: 1, retries: 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5187', browserName: 'chromium', actionTimeout: 10_000, screenshot: 'off', trace: 'off', video: 'off' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort', url: 'http://127.0.0.1:5187', reuseExistingServer: false, env: { VITE_API_BASE_URL: 'http://127.0.0.1:5091' } },
});
