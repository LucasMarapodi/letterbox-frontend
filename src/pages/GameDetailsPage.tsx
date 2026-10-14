import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { Game, Id } from '../models';
import { useOpaqueRouteId } from '../routing/useOpaqueRouteId';
import { useServices } from '../services/ServiceProvider';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { GameOpinionsSection } from './GameOpinionsSection';
import { GameCover } from '../components/GameCover';
import { RatingForm } from './RatingForm';
import { PublishReview } from './PublishReview';
import { FavoriteButton } from '../components/FavoriteButton';

type GameState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; game: Game | null };
interface GameDetailsContentProps { id: Id; }

function releaseLabel(value: string | null): string {
  if (!value) return 'Lançamento não informado.';
  const date: Date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Lançamento não informado.'
    : new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date);
}

function GameDetailsContent({ id }: GameDetailsContentProps): ReactElement {
  const { games } = useServices();
  const [state, setState] = useState<GameState>({ status: 'loading' });
  const [attempt, setAttempt] = useState<number>(0);
  const [opinionsVersion, setOpinionsVersion] = useState(0);
  const [reviewsVersion, setReviewsVersion] = useState(0);
  useEffect(() => {
    let active: boolean = true;
    games.getById(id).then(
      (game) => { if (active) setState({ status: 'ready', game }); },
      () => { if (active) setState({ status: 'error' }); },
    );
    return () => { active = false; };
  }, [id, attempt]);

  function retry(): void {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }

  if (state.status === 'loading') return <LoadingState message="Carregando jogo…" />;
  if (state.status === 'error') return <ErrorState message="Não foi possível carregar o jogo." onRetry={retry} />;
  const game: Game | null = state.game;
  if (!game) return <EmptyState message="Jogo não encontrado." />;
  return <section className="game-information" aria-labelledby="game-title">
    <aside className="game-poster" aria-label="Capa do jogo">
      <GameCover title={game.title} src={game.coverUrl} className="details-cover" />
    </aside>
    <div className="game-overview">
    <h2 id="game-title">{game.title}</h2>
    <p>{game.summary.trim() || 'Descrição indisponível.'}</p>
    <dl>
      <dt>Gêneros</dt><dd>{game.genres.length ? game.genres.join(', ') : 'Gêneros não informados.'}</dd>
      <dt>Plataformas</dt><dd>{game.platforms.length ? game.platforms.join(', ') : 'Plataformas não informadas.'}</dd>
      <dt>Lançamento</dt><dd>{releaseLabel(game.releaseDate)}</dd>
    </dl>
    </div>
    <aside className="game-actions" aria-label="Avaliar e publicar">
    <FavoriteButton kind="game" targetId={id} />
    <RatingForm gameId={id} onSaved={() => { setAttempt((value) => value + 1); setOpinionsVersion((version) => version + 1); }} />
    <PublishReview gameId={id} onSaved={() => setReviewsVersion((version) => version + 1)} />
    </aside>
    <div className="game-discussion">
    <GameOpinionsSection key={`${id}-${opinionsVersion}`} gameId={id} reviewsVersion={reviewsVersion} />
    </div>
  </section>;
}

export function GameDetailsPage(): ReactElement {
  const id: Id | undefined = useOpaqueRouteId('gameId');
  return <main className="game-details-page">
    <h1 className="game-page-label">Detalhes do jogo</h1>
    <p className="game-id">ID do jogo: {id}</p>
    {id ? <GameDetailsContent key={id} id={id} /> : <EmptyState message="Jogo não encontrado." />}
  </main>;
}

