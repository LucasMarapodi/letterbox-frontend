import { ReviewBody } from '../components/ReviewBody';
import { ReviewGameContext } from '../components/ReviewGameContext';
import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useLocalRouteId } from '../routing/useLocalRouteId';
import { encodeRouteId } from '../routing/encodeRouteId';
import { useServices } from '../services/ServiceProvider';
import type { ReviewDetails } from '../services/communityContracts';
import { EmptyState, ErrorState, LoadingState, QueryRegion } from '../components/Feedback';
import { EditReview } from './EditReview';
import { CommentsSection } from './CommentsSection';
import { CommentForm } from './CommentForm';
import { FavoriteButton } from '../components/FavoriteButton';
import { CatalogNotice } from '../components/CatalogNotice';
import { ReviewLikeButton } from '../components/ReviewLikeButton';
import { Avatar } from '../components/Avatar';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; review: ReviewDetails | null };
function ReviewContent({ id }: { id: number }): ReactElement {
  const { community } = useServices();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [commentsVersion, setCommentsVersion] = useState(0);
  useEffect(() => {
    let active = true;
    void community.getReview(id).then((review) => { if (active) setState({ status: 'ready', review }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [id, attempt]);
  if (state.status === 'loading') return <LoadingState region="Conteúdo da review" message="Carregando review…" />;
  if (state.status === 'error') return <ErrorState region="Conteúdo da review" message="Não foi possível carregar a review." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />;
  const review = state.review;
  if (!review) return <EmptyState region="Conteúdo da review" message="Review não encontrada." />;
  return <QueryRegion label="Conteúdo da review" busy={false}><article className="review-card review-details">
    <ReviewGameContext review={review} />
    <h2 className="review-author-heading" aria-label={`Review de ${review.author.displayName}`}><Avatar name={review.author.displayName} src={review.author.avatarUrl} /><Link to={`/perfil/${encodeRouteId(review.author.id)}`}>{review.author.displayName}</Link></h2>
    <p><time dateTime={review.createdAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(review.createdAt))}</time></p>
    <ReviewBody review={review} showLike={false} showRating={false} />
    <CatalogNotice paths={[[ 'reviews', String(id) ], ['games', String(review.gameId) ]]} onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />
    <div className="review-actions" role="group" aria-label="Ações da review">
      <ReviewLikeButton reviewId={review.id} likeCount={review.likeCount} author={review.author.displayName} />
      <FavoriteButton kind="review" targetId={review.id} />
      <EditReview review={review} onSaved={(updated) => setState({ status: 'ready', review: updated })} />
    </div>
    <CommentsSection key={`${review.id}-${commentsVersion}`} reviewId={review.id} />
    <CommentForm reviewId={review.id} authorId={review.userId} onSaved={() => setCommentsVersion((value) => value + 1)} />
  </article></QueryRegion>;
}
export function ReviewPage(): ReactElement {
  const id = useLocalRouteId('reviewId');
  return <main><h1>Review</h1>{id ? <ReviewContent key={id} id={id} /> : <EmptyState region="Conteúdo da review" message="Review não encontrada." />}</main>;
}
