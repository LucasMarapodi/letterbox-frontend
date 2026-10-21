import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', testMatch: 'liked-reviews.spec.ts', workers: 1, retries: 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5181', browserName: 'chromium', actionTimeout: 10_000, trace: 'off', video: 'off', screenshot: 'off' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5181 --strictPort', url: 'http://127.0.0.1:5181', reuseExistingServer: false, env: { VITE_API_BASE_URL: 'http://127.0.0.1:5096' } },
});
