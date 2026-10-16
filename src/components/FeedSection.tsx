import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../services/ServiceProvider';
import type { ReviewDetails } from '../services/communityContracts';
import { useSession } from '../session/SessionProvider';
import { encodeRouteId } from '../routing/encodeRouteId';
import { Avatar } from './Avatar';
import { EmptyState, ErrorState, LoadingState } from './Feedback';
import { Button } from './Button';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; reviews: ReviewDetails[] };
export function FeedSection({ initialReviews }: { initialReviews?: ReviewDetails[] } = {}): ReactElement | null {
  const { community } = useServices();
  const { user } = useSession();
  const [state, setState] = useState<State>(() => initialReviews ? { status: 'ready', reviews: initialReviews } : { status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (user && (initialReviews === undefined || attempt > 0)) void community.getFeed(user).then((reviews) => { if (active) setState({ status: 'ready', reviews }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [user, attempt, initialReviews]);
  if (!user) return null;
  return <section className="feed-section" aria-label="Feed de reviews"><h2>Feed de reviews</h2><p className="feed-description">As últimas reviews de quem você segue.</p>
    <Button disabled={state.status === 'loading'} onClick={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }}>Atualizar feed</Button>
    {state.status === 'loading' && <LoadingState message="Carregando feed…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar o feed." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />}
    {state.status === 'ready' && (state.reviews.length ? state.reviews.map((review) => <article className="review-card" key={review.id}>
      <div className="feed-author"><Avatar name={review.author.displayName} src={review.author.avatarUrl} /><Link to={`/perfil/${encodeRouteId(review.author.id)}`}>{review.author.displayName}</Link><time dateTime={review.createdAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(review.createdAt))}</time></div>
      <h3><Link to={`/jogos/${encodeRouteId(review.game.id)}`}>{review.game.title}</Link></h3>
      <p className="review-text">{review.text}</p><Link to={`/reviews/${encodeRouteId(review.id)}`}>Ler review</Link>
    </article>) : <EmptyState message="Nenhuma review de pessoas seguidas." />)}
  </section>;
}

