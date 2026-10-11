import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

export function HomePage(): ReactElement {
  return <main>
    <h1>Game Reviews</h1>
    <p>Fundação do aplicativo. As funcionalidades serão desenvolvidas nas próximas US.</p>
    <nav aria-label="Rotas de exemplo">
      <Link to="/jogos/game-1">Jogo de exemplo</Link>{' '}
      <Link to="/reviews/review-1">Review de exemplo</Link>{' '}
      <Link to="/perfil/user-1">Perfil de exemplo</Link>
    </nav>
  </main>;
}
