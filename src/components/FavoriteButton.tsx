import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { Favorite } from '../models';
import { useServices } from '../services/ServiceProvider';
import type { FavoriteKind } from '../services/communityContracts';
import { useSession } from '../session/SessionProvider';
import { Button } from './Button';
import { ErrorState, LoadingState } from './Feedback';

export interface FavoriteButtonProps { kind: FavoriteKind; targetId: number; }
type FavoriteState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; favorite: Favorite | null };
function FavoriteControl({ kind, targetId }: FavoriteButtonProps): ReactElement {
  const { community } = useServices();
  const label = kind === 'game' ? 'jogo' : 'review';
  const { user } = useSession();
  const [state, setState] = useState<FavoriteState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const sending = useRef(false);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void community.getFavorite(kind, targetId, user).then((favorite) => { if (active) setState({ status: 'ready', favorite }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [kind, targetId, user, attempt]);
  async function toggle(): Promise<void> {
    if (!user || state.status !== 'ready' || sending.current) return;
    sending.current = true; setPending(true); setError('');
    try { const favorite = await community.setFavorite(kind, targetId, !state.favorite, user); setState({ status: 'ready', favorite }); }
    catch { setError('Não foi possível atualizar o favorito. Tente novamente.'); }
    finally { sending.current = false; setPending(false); }
  }
  if (state.status === 'loading') return <LoadingState region="Favorito pessoal" message="Carregando favorito…" />;
  if (state.status === 'error') return <ErrorState region="Favorito pessoal" message="Não foi possível carregar o favorito." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />;
  return <div className="favorite-control" role="region" aria-label="Favorito pessoal" aria-busy={false}>
    <Button disabled={pending} aria-pressed={Boolean(state.favorite)} onClick={() => { void toggle(); }}>{pending ? 'Atualizando favorito…' : state.favorite ? `Remover ${label} dos favoritos` : `Favoritar ${label}`}</Button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
export function FavoriteButton(props: FavoriteButtonProps): ReactElement {
  const { user, version } = useSession();
  const { privateFeatures } = useServices();
  if (privateFeatures?.favorites === false) return <></>;
  return user ? <FavoriteControl key={`${version}-${user.id}-${props.kind}-${props.targetId}`} {...props} /> : <Link className="favorite-login" to="/login">Entrar para favoritar</Link>;
}
