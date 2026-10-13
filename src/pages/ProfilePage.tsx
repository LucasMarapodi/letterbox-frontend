import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { useServices } from '../services/ServiceProvider';
import type { PublicProfile } from '../services/communityContracts';
import { useOpaqueRouteId } from '../routing/useOpaqueRouteId';
import { encodeRouteId } from '../routing/encodeRouteId';
import { useSession } from '../session/SessionProvider';
import { FavoritesSections } from '../components/FavoritesSections';
import { FollowButton } from '../components/FollowButton';
import { ConnectionsSections } from '../components/ConnectionsSections';

type ProfileState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; profile: PublicProfile | null };
function ProfileContent({ id }: { id: string }): ReactElement {
  const { community, privateFeatures } = useServices();
  const { user, version } = useSession();
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [connectionsVersion, setConnectionsVersion] = useState(0);
  useEffect(() => {
    let active = true;
    void community.getProfile(id, user).then((profile) => { if (active) setState({ status: 'ready', profile }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [id, user, attempt]);
  if (state.status === 'loading') return <LoadingState message="Carregando perfil…" />;
  if (state.status === 'error') return <ErrorState message="Não foi possível carregar o perfil." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />;
  const profile = state.profile;
  if (!profile) return <EmptyState message="Perfil não encontrado." />;
  return <>
    <section className="profile-overview" aria-label="Informações do perfil">
      <Avatar name={profile.user.displayName} src={profile.user.avatarUrl} />
      <div><h2>{profile.user.displayName}</h2><p className="profile-username">@{profile.user.username}</p><p>{profile.user.bio.trim() || 'Biografia não informada.'}</p></div>
      <FollowButton targetId={id} name={profile.user.displayName} onChanged={() => setConnectionsVersion((value) => value + 1)} />
    </section>
    <section aria-label="Reviews do usuário"><h2>Reviews</h2>
      {profile.reviews.length ? profile.reviews.map((review) => <article className="review-card" key={review.id}>
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
  const id = useOpaqueRouteId('userId');
  return <main><h1>Perfil público</h1><p className="game-id">ID do usuário: {id}</p>{id ? <ProfileContent key={id} id={id} /> : <EmptyState message="Perfil não encontrado." />}</main>;
}

