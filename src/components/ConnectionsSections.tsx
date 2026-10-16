import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../services/ServiceProvider';
import type { Connections } from '../services/communityContracts';
import { encodeRouteId } from '../routing/encodeRouteId';
import { Avatar } from './Avatar';
import { EmptyState, ErrorState, LoadingState } from './Feedback';
import { ProfilePagination, useProfilePage } from './ProfilePagination';

export function ConnectionsSections({ profileId, revision = 0 }: { profileId: number; revision?: number }): ReactElement {
  const { community } = useServices();
  const [connections, setConnections] = useState<Connections | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const followers = useProfilePage(connections?.followers ?? [], 6);
  const following = useProfilePage(connections?.following ?? [], 6);
  useEffect(() => {
    let active = true;
    setStatus('loading');
    void community.getConnections(profileId).then(data => { if (active) { setConnections(data); setStatus('ready'); } }, () => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [community, profileId, revision, attempt]);
  if (status === 'loading') return <LoadingState region="Conexões" message="Carregando conexões…" />;
  if (status === 'error') return <ErrorState region="Conexões" message="Não foi possível carregar as conexões." onRetry={() => setAttempt(value => value + 1)} />;
  return <div className="connections-sections" role="region" aria-label="Conexões" aria-busy={false}>{[
    { name: 'Seguidores', users: followers, empty: 'Nenhum seguidor.' },
    { name: 'Seguindo', users: following, empty: 'Nenhuma pessoa seguida.' },
  ].map(list => <section aria-label={list.name} key={list.name}><h2>{list.name}</h2>
    {list.users.items.length ? <ul className="connections-list">{list.users.items.map(user => <li key={user.id}><Avatar name={user.displayName} src={user.avatarUrl} /><Link to={`/perfil/${encodeRouteId(user.id)}`}>{user.displayName}</Link></li>)}</ul> : <EmptyState message={list.empty} />}
    <ProfilePagination label={list.name.toLowerCase()} {...list.users} />
  </section>)}</div>;
}
