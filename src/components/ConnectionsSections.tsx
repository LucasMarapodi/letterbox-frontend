import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { community } from '../services/community';
import type { Connections } from '../services/communityContracts';
import { encodeRouteId } from '../routing/encodeRouteId';
import { Avatar } from './Avatar';
import { EmptyState, ErrorState, LoadingState } from './Feedback';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; connections: Connections };
export function ConnectionsSections({ profileId }: { profileId: string }): ReactElement {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void community.getConnections(profileId).then((connections) => { if (active) setState({ status: 'ready', connections }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [profileId, attempt]);
  if (state.status === 'loading') return <LoadingState message="Carregando conexões…" />;
  if (state.status === 'error') return <ErrorState message="Não foi possível carregar as conexões." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />;
  return <div className="connections-sections">{([
    { name: 'Seguidores', users: state.connections.followers, empty: 'Nenhum seguidor.' },
    { name: 'Seguindo', users: state.connections.following, empty: 'Nenhuma pessoa seguida.' },
  ]).map((list) => <section aria-label={list.name} key={list.name}><h2>{list.name}</h2>
    {list.users.length ? <ul className="connections-list">{list.users.map((user) => <li key={user.id}><Avatar name={user.displayName} src={user.avatarUrl} /><Link to={`/perfil/${encodeRouteId(user.id)}`}>{user.displayName}</Link></li>)}</ul> : <EmptyState message={list.empty} />}
  </section>)}</div>;
}
