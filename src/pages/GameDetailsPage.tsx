import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { Game, Id } from '../models';
import { useOpaqueRouteId } from '../routing/useOpaqueRouteId';
import { services } from '../services';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { GameOpinionsSection } from './GameOpinionsSection';

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
  const [state, setState] = useState<GameState>({ status: 'loading' });
  const [attempt, setAttempt] = useState<number>(0);
  useEffect(() => {
    let active: boolean = true;
    services.games.getById(id).then(
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
    <h2 id="game-title">{game.title}</h2>
    {game.coverUrl
      ? <img className="details-cover" src={game.coverUrl} alt={`Capa de ${game.title}`} />
      : <div className="details-cover game-cover" role="img" aria-label={`Capa de ${game.title} indisponível`}>Sem capa</div>}
    <p>{game.summary.trim() || 'Descrição indisponível.'}</p>
    <dl>
      <dt>Gêneros</dt><dd>{game.genres.length ? game.genres.join(', ') : 'Gêneros não informados.'}</dd>
      <dt>Plataformas</dt><dd>{game.platforms.length ? game.platforms.join(', ') : 'Plataformas não informadas.'}</dd>
      <dt>Lançamento</dt><dd>{releaseLabel(game.releaseDate)}</dd>
    </dl>
    <GameOpinionsSection key={id} gameId={id} />
  </section>;
}

export function GameDetailsPage(): ReactElement {
  const id: Id | undefined = useOpaqueRouteId('gameId');
  return <main>
    <h1>Detalhes do jogo</h1>
    <p>ID do jogo: {id}</p>
    {id ? <GameDetailsContent key={id} id={id} /> : <EmptyState message="Jogo não encontrado." />}
  </main>;
}
