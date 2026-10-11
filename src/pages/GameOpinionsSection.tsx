import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Id } from '../models';
import type { GameOpinions } from '../services/contracts';
import { useServices } from '../services/ServiceProvider';
import { Avatar } from '../components/Avatar';
import { encodeRouteId } from '../routing/encodeRouteId';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';

interface GameOpinionsSectionProps { gameId: Id; }
type OpinionsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; opinions: GameOpinions };

export function GameOpinionsSection({ gameId }: GameOpinionsSectionProps): ReactElement {
  const { games } = useServices();
  const [state, setState] = useState<OpinionsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState<number>(0);
  useEffect(() => {
    let active: boolean = true;
    games.getOpinions(gameId).then(
      (opinions) => { if (active) setState({ status: 'ready', opinions }); },
      () => { if (active) setState({ status: 'error' }); },
    );
    return () => { active = false; };
  }, [gameId, attempt]);

  function retry(): void {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }

  return <section aria-labelledby="opinions-title" className="opinions">
    <h2 id="opinions-title">Avaliações e reviews</h2>
    {state.status === 'loading' && <LoadingState message="Carregando avaliações…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar as avaliações." onRetry={retry} />}
    {state.status === 'ready' && <>
      <p className="average-rating">{state.opinions.averageRating === null
        ? 'Ainda sem avaliações.'
        : `Nota média: ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(state.opinions.averageRating)} de 5`}</p>
      {state.opinions.reviews.length ? state.opinions.reviews.map((review) => <article key={review.id} className="review-card">
        <h3><Link to={`/reviews/${encodeRouteId(review.id)}`}>Review de {review.author.displayName}</Link></h3>
        <div className="visitor">
          <Avatar name={review.author.displayName} src={review.author.avatarUrl} />
          <Link to={`/perfil/${encodeRouteId(review.author.id)}`}>{review.author.displayName}</Link>
        </div>
        <p>{review.text}</p>
      </article>) : <EmptyState message="Nenhuma review publicada para este jogo." />}
    </>}
  </section>;
}

