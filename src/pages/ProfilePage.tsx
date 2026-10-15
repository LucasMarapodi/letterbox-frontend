import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { useServices } from '../services/ServiceProvider';
import type { PublicProfile } from '../services/communityContracts';
import { useLocalRouteId } from '../routing/useLocalRouteId';
import { encodeRouteId } from '../routing/encodeRouteId';
import { useSession } from '../session/SessionProvider';
import { FavoritesSections } from '../components/FavoritesSections';
import { FollowButton } from '../components/FollowButton';
import { ConnectionsSections } from '../components/ConnectionsSections';
import { ProfileEditor } from './ProfileEditor';
import { CatalogNotice } from '../components/CatalogNotice';

type ProfileState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; profile: PublicProfile | null };
function ProfileContent({ id }: { id: number }): ReactElement {
  const { community, privateFeatures } = useServices();
  const { user, version } = useSession();
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionsVersion, setConnectionsVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setRefreshing(true);
    void community.getProfile(id, user).then((profile) => { if (active) { setState({ status: 'ready', profile }); setRefreshing(false); } }, () => { if (active) { setState({ status: 'error' }); setRefreshing(false); } });
    return () => { active = false; };
  }, [id, user, attempt]);
  if (state.status === 'loading') return <LoadingState region="Informações do perfil" message="Carregando perfil…" />;
  if (state.status === 'error') return <ErrorState region="Informações do perfil" message="Não foi possível carregar o perfil." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />;
  const profile = state.profile;
  if (!profile) return <EmptyState region="Informações do perfil" message="Perfil não encontrado." />;
  return <>
    <CatalogNotice paths={[[ 'users', String(id), 'reviews' ]]} onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />
    <section className="profile-overview" aria-label="Informações do perfil" aria-busy={refreshing}>
      {refreshing ? <LoadingState message="Carregando perfil…" /> : <>
      <Avatar name={profile.user.displayName} src={profile.user.avatarUrl} />
      <div><h2>{profile.user.displayName}</h2><p className="profile-username">@{profile.user.username}</p><p>{profile.user.bio.trim() || 'Biografia não informada.'}</p></div>
      <FollowButton targetId={id} name={profile.user.displayName} onChanged={() => setConnectionsVersion((value) => value + 1)} />
      </>}
    </section>
    <ProfileEditor profile={profile.user} onSaved={(updated) => setState({ status: 'ready', profile: { ...profile, user: updated } })} />
    <section aria-label="Reviews do usuário" aria-busy={refreshing}><h2>Reviews</h2>
      {refreshing ? <LoadingState message="Carregando reviews do perfil…" /> : profile.reviews.length ? profile.reviews.map((review) => <article className="review-card" key={review.id}>
        <h3><Link to={`/jogos/${encodeRouteId(review.gameId)}`}>{review.game.title}</Link></h3>
        <p className="review-text">{review.text}</p>
        <Link to={`/reviews/${encodeRouteId(review.id)}`}>Ler review de {review.game.title}</Link>
      </article>) : <EmptyState message="Nenhuma review publicada por este usuário." />}
    </section>
    {user?.id === id && privateFeatures?.favorites !== false && <FavoritesSections key={`${version}-${user.id}`} />}
    <ConnectionsSections key={`${id}-${connectionsVersion}`} profileId={id} />
  </>;
}
export function ProfilePage(): ReactElement {
  const id = useLocalRouteId('userId');
  return <main><h1>Perfil público</h1><p className="game-id">ID do usuário: {id}</p>{id ? <ProfileContent key={id} id={id} /> : <EmptyState region="Informações do perfil" message="Perfil não encontrado." />}</main>;
}
