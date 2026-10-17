import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', testMatch: 'comment-preview.spec.ts', workers: 1, retries: 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5188', browserName: 'chromium', actionTimeout: 10_000, screenshot: 'off', trace: 'off', video: 'off' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5188 --strictPort', url: 'http://127.0.0.1:5188', reuseExistingServer: false, env: { VITE_API_BASE_URL: 'http://127.0.0.1:5090' } },
});
