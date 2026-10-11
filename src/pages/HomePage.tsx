import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Game } from '../models';
import { services } from '../services';
import { GameCard } from '../components/GameCard';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';

type CatalogState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; games: Game[] };

export function HomePage(): ReactElement {
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  const [attempt, setAttempt] = useState<number>(0);
  useEffect(() => {
    let active: boolean = true;
    services.games.list().then(
      (games) => { if (active) setState({ status: 'ready', games }); },
      () => { if (active) setState({ status: 'error' }); },
    );
    return () => { active = false; };
  }, [attempt]);

  function retry(): void {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }
  return <main>
    <h1>Game Reviews</h1>
    <p>Explore jogos e descubra novas experiências.</p>
    <nav aria-label="Rotas de exemplo">
      <Link to="/jogos/game-1">Jogo de exemplo</Link>{' '}
      <Link to="/reviews/review-1">Review de exemplo</Link>{' '}
      <Link to="/perfil/user-1">Perfil de exemplo</Link>
    </nav>
    <section aria-labelledby="catalog-title">
      <h2 id="catalog-title">Jogos</h2>
      {state.status === 'loading' && <LoadingState message="Carregando jogos…" />}
      {state.status === 'error' && <ErrorState message="Não foi possível carregar os jogos." onRetry={retry} />}
      {state.status === 'ready' && (state.games.length
        ? <div className="game-grid">{state.games.map((game) => <GameCard key={game.id} game={game} />)}</div>
        : <EmptyState message="Nenhum jogo disponível." />)}
    </section>
  </main>;
}
