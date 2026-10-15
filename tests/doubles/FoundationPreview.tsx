import type { ReactElement } from 'react';
import type { GameService } from '../../src/services/contracts';
import { useEffect, useState } from 'react';
import type { Game } from '../../src/models';
import { services } from '../../src/services';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { GameCard } from '../../src/components/GameCard';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/Feedback';

export interface FoundationPreviewProps { gameService?: Pick<GameService, 'getById'>; }
type PreviewState =
  | { status: 'loading' }
  | { status: 'ready'; game: Game | null }
  | { status: 'error' };

export function FoundationPreview({ gameService = services.games }: FoundationPreviewProps): ReactElement {
  const [state, setState] = useState<PreviewState>({ status: 'loading' });
  const [attempt, setAttempt] = useState<number>(0);
  const [text, setText] = useState<string>('');

  useEffect(() => {
    let active: boolean = true;
    gameService.getById(1).then(
      (game) => { if (active) setState({ status: 'ready', game }); },
      () => { if (active) setState({ status: 'error' }); },
    );
    return () => { active = false; };
  }, [gameService, attempt]);

  function retry(): void {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }

  return <section aria-labelledby="preview-title" className="preview">
    <h2 id="preview-title">Prévia dos componentes</h2>
    <p>Exemplos locais da fundação. O texto abaixo não é publicado nem salvo.</p>
    <div className="preview-content">
      <div>
        <div className="visitor"><Avatar name="Visitante" /><span>Visitante</span></div>
        <TextField label="Texto de exemplo" value={text} onChange={(event) => setText(event.target.value)} />
        <Button onClick={() => setText('')}>Limpar texto</Button>
      </div>
      <div>
        {state.status === 'loading' && <LoadingState message="Carregando exemplo…" />}
        {state.status === 'error' && <ErrorState message="Não foi possível carregar o exemplo." onRetry={retry} />}
        {state.status === 'ready' && (state.game
          ? <GameCard game={state.game} />
          : <EmptyState message="Nenhum jogo de exemplo disponível." />)}
      </div>
    </div>
  </section>;
}
