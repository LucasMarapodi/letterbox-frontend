import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',testMatch:'game-stale-layout.spec.ts',workers:1,retries:0,reporter:'list',
 use:{baseURL:'http://127.0.0.1:5173',browserName:'chromium',actionTimeout:10000,trace:'off',video:'off',screenshot:'off'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',url:'http://127.0.0.1:5173',reuseExistingServer:true,env:{VITE_API_BASE_URL:'http://localhost:5080'}},
});
