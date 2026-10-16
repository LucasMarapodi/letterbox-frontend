import type { MockAccount } from './authService';

/** Credenciais exclusivamente fictícias para uso local; sem autenticação real. */
export const accountFixtures: MockAccount[] = [
  { email: 'ana@example.com', password: 'teste123', user: { id: 1, username: 'ana', displayName: 'Ana', avatarUrl: null, bio: 'Explorando novos mundos.' } },
];
