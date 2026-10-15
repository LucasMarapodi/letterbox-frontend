import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../services/ServiceProvider';
import { useSession } from '../session/SessionProvider';
import { Button } from './Button';
import { ErrorState, LoadingState } from './Feedback';

interface FollowProps { targetId: number; name: string; onChanged?: () => void; }
type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; following: boolean };
function FollowControl({ targetId, name, onChanged }: FollowProps): ReactElement {
  const { community } = useServices();
  const { user } = useSession();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const sending = useRef(false);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void community.isFollowing(targetId, user).then((following) => { if (active) setState({ status: 'ready', following }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [targetId, user, attempt]);
  async function toggle(): Promise<void> {
    if (!user || state.status !== 'ready' || sending.current) return;
    sending.current = true; setPending(true); setError('');
    try { const following = await community.setFollowing(targetId, !state.following, user); setState({ status: 'ready', following: typeof following === 'boolean' ? following : !state.following }); onChanged?.(); }
    catch { setError('Não foi possível atualizar a relação. Tente novamente.'); }
    finally { sending.current = false; setPending(false); }
  }
  if (state.status === 'loading') return <LoadingState region="Relação pessoal" message="Consultando relação…" />;
  if (state.status === 'error') return <ErrorState region="Relação pessoal" message="Não foi possível consultar a relação." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />;
  return <div className="follow-control" role="region" aria-label="Relação pessoal" aria-busy={false}><Button disabled={pending} aria-pressed={state.following} onClick={() => { void toggle(); }}>{pending ? 'Atualizando relação…' : `${state.following ? 'Deixar de seguir' : 'Seguir'} ${name}`}</Button>{error && <p role="alert">{error}</p>}</div>;
}
export function FollowButton(props: FollowProps): ReactElement | null {
  const { user, version } = useSession();
  const { privateFeatures } = useServices();
  if (privateFeatures?.follows === false) return null;
  if (!user) return <Link to="/login">Entrar para seguir</Link>;
  if (user.id === props.targetId) return null;
  return <FollowControl key={`${version}-${user.id}-${props.targetId}`} {...props} />;
}
