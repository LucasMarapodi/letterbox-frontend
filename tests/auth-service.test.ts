import { expect, test } from 'vitest';
import { createMockAuthService } from '../src/mocks/authService';
import type { MockAccount } from '../src/mocks/authService';
import type { User } from '../src/models';

const user: User = { id: 'user-1', displayName: 'Ana', username: 'ana', avatarUrl: null, bio: '' };
const account: MockAccount = { email: 'ana@example.com', password: 'teste123', user };

test('credenciais válidas retornam usuário público, sem senha', async () => {
  const service = createMockAuthService({ accounts: [account] });
  await expect(service.login({ email: ' ANA@EXAMPLE.COM ', password: 'teste123' })).resolves.toEqual(user);
});
test('credenciais inválidas rejeitam com erro tipado', async () => {
  const service = createMockAuthService({ accounts: [account] });
  await expect(service.login({ email: account.email, password: 'incorreta' })).rejects.toMatchObject({ code: 'invalid-credentials' });
  await expect(service.login({ email: 'ausente@example.com', password: account.password })).rejects.toMatchObject({ code: 'invalid-credentials' });
});
test('login não altera as fixtures nem compartilha usuário retornado', async () => {
  const seed: MockAccount = { ...account, user: { ...user } };
  const service = createMockAuthService({ accounts: [seed] });
  seed.user.displayName = 'Alteração externa';
  const returned = await service.login({ email: account.email, password: account.password });
  returned.displayName = 'Alteração no retorno';
  await expect(service.login({ email: account.email, password: account.password })).resolves.toEqual(user);
});
test('permite simular indisponibilidade sem transformar falha em credencial inválida', async () => {
  const error: Error = new Error('Serviço indisponível');
  await expect(createMockAuthService({ error }).login({ email: account.email, password: account.password })).rejects.toBe(error);
});
