import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { AppRoutes } from '../src/App';

test.each(['/', '/login', '/perfil/1', '/reviews/1', '/jogos/1'])('teclado pode pular navegação para conteúdo em %s', async (path) => {
  const interaction = userEvent.setup();
  render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);
  await interaction.tab();
  const skip = screen.getByRole('link', { name: 'Ir para o conteúdo principal' });
  expect(skip).toHaveFocus();
  await interaction.keyboard('{Enter}');
  expect(screen.getByRole('region', { name: 'Conteúdo principal' })).toHaveFocus();
  expect(screen.getByRole('main')).toBeInTheDocument();
});
