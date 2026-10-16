import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GameId } from '../models';
import type { GameOpinions, PublicReview } from '../services/contracts';
import { useServices } from '../services/ServiceProvider';
import { Avatar } from '../components/Avatar';
import { encodeRouteId } from '../routing/encodeRouteId';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { ReviewFavoriteStar } from '../components/ReviewFavoriteStar';

interface GameOpinionsSectionProps { gameId: GameId; reviewsVersion?: number; }
type OpinionsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; opinions: GameOpinions };

export function GameOpinionsSection({ gameId, reviewsVersion = 0 }: GameOpinionsSectionProps): ReactElement {
  const { games, community } = useServices();
  const [state, setState] = useState<OpinionsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState<number>(0);
  const [updatedReviews, setUpdatedReviews] = useState<PublicReview[] | null>(null);
  const [reviewsState, setReviewsState] = useState<'ready' | 'loading' | 'error'>('ready');
  const [reviewsAttempt, setReviewsAttempt] = useState(0);
  const lastRefresh = useRef({ version: reviewsVersion, attempt: reviewsAttempt });
  useEffect(() => {
    let active: boolean = true;
    setState({ status: 'loading' });
    setUpdatedReviews(null); setReviewsState('ready');
    games.getOpinions(gameId).then(
      (opinions) => { if (active) setState({ status: 'ready', opinions }); },
      () => { if (active) setState({ status: 'error' }); },
    );
    return () => { active = false; };
  }, [gameId, attempt, games]);
  useEffect(() => {
    if (lastRefresh.current.version === reviewsVersion && lastRefresh.current.attempt === reviewsAttempt) return;
    lastRefresh.current = { version: reviewsVersion, attempt: reviewsAttempt };
    let active = true; setReviewsState('loading');
    void community.getGameReviews(gameId).then((reviews) => { if (active) { setUpdatedReviews(reviews); setReviewsState('ready'); } }, () => { if (active) setReviewsState('error'); });
    return () => { active = false; };
  }, [gameId, reviewsVersion, reviewsAttempt, community]);

  function retry(): void {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }

  return <section aria-labelledby="opinions-title" className="opinions" aria-busy={state.status === 'loading'}>
    <h2 id="opinions-title">Avaliações e reviews</h2>
    {state.status === 'loading' && <LoadingState message="Carregando avaliações…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar as avaliações." onRetry={retry} />}
    {state.status === 'ready' && <>
      <p className="average-rating">{state.opinions.averageRating === null
        ? 'Ainda sem avaliações.'
        : `Nota média: ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(state.opinions.averageRating)} de 5`}</p>
      <div role="region" aria-label="Reviews do jogo" aria-busy={reviewsState === 'loading'}>
      {reviewsState === 'loading' && <LoadingState message="Atualizando reviews…" />}
      {reviewsState === 'error' && <ErrorState message="Não foi possível atualizar as reviews." onRetry={() => setReviewsAttempt((value) => value + 1)} />}
      {reviewsState === 'ready' && ((updatedReviews ?? state.opinions.reviews).length ? (updatedReviews ?? state.opinions.reviews).map((review) => <article key={review.id} className="review-card">
        <h3><Link to={`/reviews/${encodeRouteId(review.id)}`}>Review de {review.author.displayName}</Link></h3>
        <div className="visitor">
          <Avatar name={review.author.displayName} src={review.author.avatarUrl} />
          <Link to={`/perfil/${encodeRouteId(review.author.id)}`}>{review.author.displayName}</Link>
        </div>
        <p>{review.text}</p>
        <ReviewFavoriteStar reviewId={review.id} author={review.author.displayName} />
      </article>) : <EmptyState message="Nenhuma review publicada para este jogo." />)}
      </div>
    </>}
  </section>;
}
