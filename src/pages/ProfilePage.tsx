import { ProfilePagination, useProfilePage } from '../components/ProfilePagination';
import { ReviewBody } from '../components/ReviewBody';
import { ReviewCardLink } from '../components/ReviewCardLink';
import { ReviewAuthor } from '../components/ReviewAuthor';
import { ReviewGame } from '../components/ReviewGame';
import { useEffect, useState, type ReactElement } from 'react';
import { Avatar } from '../components/Avatar';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { useServices } from '../services/ServiceProvider';
import type { PublicProfile } from '../services/communityContracts';
import { useLocalRouteId } from '../routing/useLocalRouteId';
import { useSession } from '../session/SessionProvider';
import { FavoritesSections } from '../components/FavoritesSections';
import { FollowButton } from '../components/FollowButton';
import { ConnectionsSections } from '../components/ConnectionsSections';
import { ProfileEditor } from './ProfileEditor';
import { ReviewFavoriteStar } from '../components/ReviewFavoriteStar';

type ProfileState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; profile: PublicProfile | null };
function ProfileContent({ id }: { id: number }): ReactElement {
  const { community, privateFeatures } = useServices();
  const { user, version } = useSession();
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionsVersion, setConnectionsVersion] = useState(0);
  const reviews = useProfilePage(state.status === 'ready' ? state.profile?.reviews ?? [] : [], 2);

  useEffect(() => {
    let active = true;
    setRefreshing(true);
    void community.getProfile(id, user).then((profile) => { if (active) { setState({ status: 'ready', profile }); setRefreshing(false); } }, () => { if (active) { setState({ status: 'error' }); setRefreshing(false); } });
    return () => { active = false; };
  }, [id, user?.id, attempt]);
  if (state.status === 'loading') return <LoadingState region="Informações do perfil" message="Carregando perfil…" />;
  if (state.status === 'error') return <ErrorState region="Informações do perfil" message="Não foi possível carregar o perfil." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />;
  const profile = state.profile;
  if (!profile) return <EmptyState region="Informações do perfil" message="Perfil não encontrado." />;
  return <>
    <section className="profile-overview" aria-label="Informações do perfil" aria-busy={refreshing}>
      {refreshing ? <LoadingState message="Carregando perfil…" /> : <>
      <Avatar name={profile.user.displayName} src={profile.user.avatarUrl} />
      <div className="profile-overview-copy"><div className="profile-name-row"><h2>{profile.user.displayName}</h2><ProfileEditor profile={profile.user} onSaved={updated => setState({ status: 'ready', profile: { ...profile, user: updated } })} /></div><p className="profile-username">@{profile.user.username}</p><p>{profile.user.bio.trim() || 'Biografia não informada.'}</p></div>
      <FollowButton targetId={id} onChanged={() => setConnectionsVersion((value) => value + 1)} />
      </>}
    </section>
    <section aria-label="Reviews do usuário" aria-busy={refreshing}><h2>Reviews</h2>
      {refreshing ? <LoadingState message="Carregando reviews do perfil…" /> : profile.reviews.length ? reviews.items.map((review) => <article className="review-card review-preview" key={review.id}>
        <ReviewAuthor author={review.author} />
        <h3><ReviewGame game={review.game} /></h3>
        <ReviewBody review={review} />
        <ReviewCardLink id={review.id} label={`Ler review de ${review.game.title}`} />
        <ReviewFavoriteStar reviewId={review.id} author={review.author.displayName} />
      </article>) : <EmptyState message="Nenhuma review publicada por este usuário." />}
      <ProfilePagination label="reviews do usuário" {...reviews} />
    </section>
    {user?.id === id && privateFeatures?.favorites !== false && <FavoritesSections key={`${version}-${user.id}`} />}
    <ConnectionsSections key={id} profileId={id} revision={connectionsVersion} />
  </>;
}
export function ProfilePage(): ReactElement {
  const id = useLocalRouteId('userId');
  return <main><h1>Perfil público</h1>{id ? <ProfileContent key={id} id={id} /> : <EmptyState region="Informações do perfil" message="Perfil não encontrado." />}</main>;
}
