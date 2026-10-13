import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { vi } from 'vitest';

// Os cenários legados usam doubles explicitamente; o runtime produtivo será HTTP.
vi.mock('../src/services/runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/runtime')>();
  return { ...actual, defaultApplicationServices: actual.createApplicationServices({ apiBaseUrl: '', implementation: 'mock' }) };
});

afterEach(cleanup);
