import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createMockCommunityService } from './doubles/communityService';
import type { User } from '../src/models';
import { community } from '../src/services/community';
import { RatingForm } from '../src/pages/RatingForm';
import { SessionProvider, useSession } from '../src/session/SessionProvider';

const ana: User = { id: 'user-1', displayName: 'Ana', username: 'ana', bio: '', avatarUrl: null };
afterEach(() => vi.restoreAllMocks());
test.each([0, 5, 2.5])('serviço aceita nota %s independente de texto', async (value) => {
  expect(await createMockCommunityService().rate('game-1', value, ana)).toMatchObject({ gameId: 'game-1', userId: ana.id, value });
});
test.each([-1, 6, NaN, Infinity])('serviço rejeita nota %s', async (value) => {
  await expect(createMockCommunityService().rate('game-1', value, ana)).rejects.toMatchObject({ code: 'invalid-rating' });
});
test('serviço exige sessão', async () => {
  await expect(createMockCommunityService().rate('game-1', 3, null)).rejects.toMatchObject({ code: 'session-required' });
});
test('visitante não salva nota', async () => {
  render(<MemoryRouter initialEntries={['/jogos/game-1']}><AppRoutes /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Ecos do Horizonte' });
  expect(screen.queryByRole('button', { name: 'Salvar nota' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Entrar para continuar' })).toBeVisible();
});
test('usuário salva nota zero e logout remove controle', async () => {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes /></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByLabelText('Usuário conectado');
  await interaction.click(screen.getByRole('link', { name: 'Início' }));
  await interaction.click(await screen.findByRole('link', { name: 'Jogo de exemplo' }));
  await interaction.click(await screen.findByRole('radio', { name: '0 estrelas' }));
  await interaction.click(screen.getByRole('button', { name: 'Salvar nota' }));
  expect(await screen.findByText('Nota 0 salva.')).toBeVisible();
  expect(await screen.findByText('Nota média: 2,5 de 5')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Sair' }));
  expect(screen.queryByRole('button', { name: 'Salvar nota' })).not.toBeInTheDocument();
});
function RatingExample(): React.ReactElement {
  const { signIn } = useSession();
  return <><button onClick={() => { void signIn({ email: 'ana@example.com', password: 'x' }); }}>Iniciar sessão</button><RatingForm gameId="game-1" /></>;
}
test('falha de nota é apresentada e mantém a escolha', async () => {
  vi.spyOn(community, 'rate').mockRejectedValue(new Error('Falha'));
  const interaction = userEvent.setup();
  render(<MemoryRouter><SessionProvider service={{ async login() { return ana; }, async register() { return ana; } }}><RatingExample /></SessionProvider></MemoryRouter>);
  await interaction.click(screen.getByRole('button', { name: 'Iniciar sessão' }));
  await interaction.click(await screen.findByRole('radio', { name: '5 estrelas' }));
  await interaction.click(screen.getByRole('button', { name: 'Salvar nota' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar a nota. Tente novamente.');
  expect(screen.getByRole('radio', { name: '5 estrelas' })).toBeChecked();
});
test('estrelas permitem seleção por teclado e envio da nota escolhida', async () => {
  const save = vi.spyOn(community, 'rate').mockResolvedValue({ id: 'rating-new', gameId: 'game-1', userId: ana.id, value: 3 });
  const interaction = userEvent.setup();
  render(<MemoryRouter><SessionProvider service={{ async login() { return ana; }, async register() { return ana; } }}><RatingExample /></SessionProvider></MemoryRouter>);
  await interaction.click(screen.getByRole('button', { name: 'Iniciar sessão' }));
  await interaction.click(await screen.findByRole('radio', { name: '2 estrelas' }));
  await interaction.keyboard('{ArrowRight}');
  expect(screen.getByRole('radio', { name: '3 estrelas' })).toBeChecked();
  await interaction.click(screen.getByRole('button', { name: 'Salvar nota' }));
  expect(save).toHaveBeenCalledWith('game-1', 3, ana);
});
test('serviço recupera nota por usuário e jogo, incluindo zero, sem expor referência mutável', async () => {
  const service = createMockCommunityService();
  await service.rate('game-1', 5, ana);
  const saved = await service.getRating('game-1', ana);
  expect(saved?.value).toBe(5);
  if (saved) saved.value = 0;
  expect((await service.getRating('game-1', ana))?.value).toBe(5);
  expect((await service.getRating('game-2', ana))?.value).toBe(0);
  expect(await service.getRating('game-1', { ...ana, id: 'novo' })).toBeNull();
  await expect(service.getRating('game-1', null)).rejects.toMatchObject({ code: 'session-required' });
});
test('reabrir jogo recupera cinco estrelas e reenviar mantém a nota', async () => {
  await community.rate('game-1', 5, ana);
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes /></MemoryRouter>);
  await interaction.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@example.com');
  await interaction.type(screen.getByLabelText('Senha'), 'teste123');
  await interaction.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByLabelText('Usuário conectado');
  await interaction.click(await screen.findByRole('link', { name: 'Jogo de exemplo' }));
  expect(await screen.findByRole('radio', { name: '5 estrelas' })).toBeChecked();
  await interaction.click(screen.getByRole('link', { name: 'Início' }));
  await interaction.click(screen.getByRole('link', { name: 'Jogo de exemplo' }));
  expect(await screen.findByRole('radio', { name: '5 estrelas' })).toBeChecked();
  await interaction.click(screen.getByRole('button', { name: 'Salvar nota' }));
  expect(await screen.findByText('Nota 5 salva.')).toBeVisible();
});
test('erro ao consultar nota bloqueia envio e permite recuperar a nota', async () => {
  vi.spyOn(community, 'getRating').mockRejectedValueOnce(new Error('Falha')).mockResolvedValueOnce({ id: 'r1', userId: ana.id, gameId: 'game-1', value: 5 });
  const save = vi.spyOn(community, 'rate');
  const interaction = userEvent.setup();
  render(<MemoryRouter><SessionProvider service={{ async login() { return ana; }, async register() { return ana; } }}><RatingExample /></SessionProvider></MemoryRouter>);
  await interaction.click(screen.getByRole('button', { name: 'Iniciar sessão' }));
  expect(await screen.findByText('Não foi possível carregar sua nota.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Salvar nota' })).not.toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByRole('radio', { name: '5 estrelas' })).toBeChecked();
});
