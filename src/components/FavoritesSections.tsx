import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../services/ServiceProvider';
import type { FavoriteLists } from '../services/communityContracts';
import { useSession } from '../session/SessionProvider';
import { encodeRouteId } from '../routing/encodeRouteId';
import { GameCard } from './GameCard';
import { EmptyState, ErrorState, LoadingState } from './Feedback';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; lists: FavoriteLists };
export function FavoritesSections(): ReactElement | null {
  const { community } = useServices();
  const { user } = useSession();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (user) void community.getFavorites(user).then((lists) => { if (active) setState({ status: 'ready', lists }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [user, attempt]);
  if (!user) return null;
  if (state.status === 'loading') return <LoadingState message="Carregando favoritos…" />;
  if (state.status === 'error') return <ErrorState message="Não foi possível carregar os favoritos." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />;
  return <div className="favorites-sections">
    <section aria-label="Jogos favoritos"><h2>Jogos favoritos</h2>
      {state.lists.games.length ? <div className="game-grid">{state.lists.games.map((game) => <GameCard key={game.id} game={game} />)}</div> : <EmptyState message="Nenhum jogo favorito." />}
    </section>
    <section aria-label="Reviews favoritas"><h2>Reviews favoritas</h2>
      {state.lists.reviews.length ? state.lists.reviews.map((review) => <article className="review-card" key={review.id}><Link to={`/reviews/${encodeRouteId(review.id)}`}>Review de {review.author.displayName}: {review.game.title}</Link><p className="review-text">{review.text}</p></article>) : <EmptyState message="Nenhuma review favorita." />}
    </section>
  </div>;
}

