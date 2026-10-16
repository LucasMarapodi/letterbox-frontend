import { defineConfig } from '@playwright/test';
import catalogConfig from './playwright.catalog.config';

export default defineConfig({ ...catalogConfig, testMatch: 'mutations.spec.ts' });
