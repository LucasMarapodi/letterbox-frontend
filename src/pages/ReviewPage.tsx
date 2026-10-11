import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useOpaqueRouteId } from '../routing/useOpaqueRouteId';
import { encodeRouteId } from '../routing/encodeRouteId';
import { community } from '../services/community';
import type { ReviewDetails } from '../services/communityContracts';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; review: ReviewDetails | null };
function ReviewContent({ id }: { id: string }): ReactElement {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void community.getReview(id).then((review) => { if (active) setState({ status: 'ready', review }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [id, attempt]);
  if (state.status === 'loading') return <LoadingState message="Carregando review…" />;
  if (state.status === 'error') return <ErrorState message="Não foi possível carregar a review." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />;
  const review = state.review;
  if (!review) return <EmptyState message="Review não encontrada." />;
  return <article className="review-card">
    <h2>Review de <Link to={`/perfil/${encodeRouteId(review.author.id)}`}>{review.author.displayName}</Link></h2>
    <Link to={`/jogos/${encodeRouteId(review.game.id)}`}>{review.game.title}</Link>
    <p><time dateTime={review.createdAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(review.createdAt))}</time></p>
    <p className="review-text">{review.text}</p>
  </article>;
}
export function ReviewPage(): ReactElement {
  const id = useOpaqueRouteId('reviewId');
  return <main><h1>Review</h1><p>ID da review: {id}</p>{id ? <ReviewContent key={id} id={id} /> : <EmptyState message="Review não encontrada." />}</main>;
}
