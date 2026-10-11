import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createMockCommunityService } from '../src/mocks/communityService';
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
  await interaction.click(screen.getByRole('link', { name: 'Jogo de exemplo' }));
  await interaction.selectOptions(await screen.findByLabelText('Sua nota'), '0');
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
  await interaction.selectOptions(await screen.findByLabelText('Sua nota'), '5');
  await interaction.click(screen.getByRole('button', { name: 'Salvar nota' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar a nota. Tente novamente.');
  expect(screen.getByLabelText('Sua nota')).toHaveValue('5');
});
