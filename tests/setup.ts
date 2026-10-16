import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { vi } from 'vitest';

// Apenas a suíte seleciona doubles; produção possui exclusivamente HTTP.
vi.mock('../src/services/runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/runtime')>();
  const { createTestApplicationServices } = await import('./doubles/applicationServices');
  return { ...actual, defaultApplicationServices: createTestApplicationServices() };
});
vi.mock('../src/pages/HomePage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/pages/HomePage')>();
  const { testHome } = await import('./doubles/TestHome');
  return { ...actual, HomePage: testHome(actual.HomePage) };
});

afterEach(cleanup);
