import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReviewDetails } from '../services/communityContracts';
import { useServices } from '../services/ServiceProvider';
import { encodeRouteId } from '../routing/encodeRouteId';
import { GameCover } from './GameCover';
import { ReviewRating } from './ReviewRating';
import { ErrorState, LoadingState } from './Feedback';

function GameSummary({ gameId }: { gameId: number }) {
  const { games } = useServices();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'ready'; summary: string }>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const request = useRef<{ gameId: number; attempt: number; service: typeof games; promise: Promise<string> } | null>(null);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    if (request.current?.gameId !== gameId || request.current.attempt !== attempt || request.current.service !== games) {
      request.current = { gameId, attempt, service: games, promise: games.getById(gameId).then(game => game?.summary.trim() || 'Resumo não informado.') };
    }
    void request.current.promise.then(summary => { if (active) setState({ status: 'ready', summary }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [games, gameId, attempt]);
  if (state.status === 'loading') return <LoadingState message="Carregando resumo…" />;
  if (state.status === 'error') return <ErrorState message="Não foi possível carregar o resumo do jogo." onRetry={() => setAttempt(value => value + 1)} />;
  return <p className="review-game-summary">{state.summary}</p>;
}

export function ReviewGameContext({ review }: { review: ReviewDetails }) {
  const path = `/jogos/${encodeRouteId(review.gameId)}`;
  return <section className="review-game-context" aria-label="Contexto do jogo">
    <Link className="review-context-cover-link" to={path} aria-label={`Ver jogo ${review.game.title}`}><GameCover title={review.game.title} src={review.game.coverUrl ?? null} className="review-context-cover" /></Link>
    <div className="review-context-copy">
      <h2><Link to={path}>{review.game.title}</Link></h2>
      <ReviewRating rating={review.rating} label="Nota desta review" />
      <GameSummary key={review.gameId} gameId={review.gameId} />
    </div>
  </section>;
}
