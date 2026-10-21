import { FeedSection } from '../components/FeedSection';
import { useServices } from '../services/ServiceProvider';
import { useSession } from '../session/SessionProvider';
import { useState, type ReactElement } from 'react';
import { CommunityRecent } from './CommunityRecent';
import { CommunityRankedReviews } from './CommunityRankedReviews';
import { CommunityRankedGames } from './CommunityRankedGames';
import { CommunityLikedReviews } from './CommunityLikedReviews';
import { CommunityRankedComments } from './CommunityRankedComments';
import type { CommentPageSize } from '../services/communityContracts';
import { isRankingPeriod, type RankingPeriod } from '../services/communityContracts';

type CommunityView = 'recent' | 'reviews' | 'games' | 'feed' | 'comments' | 'liked';
export function CommunityPage(): ReactElement {
  const { user, version } = useSession();
  const { privateFeatures } = useServices();
  const feedEnabled = Boolean(user) && privateFeatures?.feed !== false;
  const [requestedView, setView] = useState<CommunityView>('recent');
  const view = requestedView === 'feed' && !feedEnabled ? 'recent' : requestedView;
  const [period, setPeriod] = useState<RankingPeriod>('7d');
  const [commentPageSize, setCommentPageSize] = useState<CommentPageSize>(20);
  return <main className="community-page"><span className="eyebrow">DESCUBRA NOVAS CONVERSAS</span><h1>Comunidade</h1>
    <nav className="community-navigation" aria-label="Seções da comunidade">
      <button type="button" aria-pressed={view === 'recent'} onClick={() => setView('recent')}>Recentes</button>
      <button type="button" aria-pressed={view === 'reviews'} onClick={() => setView('reviews')}>Mais comentadas</button>
      <button type="button" aria-pressed={view === 'games'} onClick={() => setView('games')}>Jogos em discussão</button>
      <button type="button" aria-pressed={view === 'comments'} onClick={() => setView('comments')}>Comentários curtidos</button>
      <button type="button" aria-pressed={view === 'liked'} onClick={() => setView('liked')}>Mais curtidas</button>
      {feedEnabled && <button type="button" aria-pressed={view === 'feed'} onClick={() => setView('feed')}>Feed de reviews</button>}
    </nav>
    {(view === 'reviews' || view === 'games' || view === 'comments' || view === 'liked') && <div className="community-period"><label htmlFor="community-period">Período dos rankings</label><select id="community-period" value={period} onChange={(event) => { if (isRankingPeriod(event.target.value)) setPeriod(event.target.value); }}><option value="24h">24 horas</option><option value="7d">7 dias</option><option value="30d">30 dias</option></select></div>}
    {view === 'feed' && feedEnabled && user && <FeedSection key={`${version}-${user.id}`} />}
    {view === 'recent' && <CommunityRecent />}
    {view === 'reviews' && <CommunityRankedReviews key={period} period={period} />}
    {view === 'games' && <CommunityRankedGames key={period} period={period} />}
    {view === 'liked' && <CommunityLikedReviews key={period} period={period} pageSize={commentPageSize} onPageSizeChange={setCommentPageSize} />}
    {view === 'comments' && <CommunityRankedComments key={period} period={period} pageSize={commentPageSize} onPageSizeChange={setCommentPageSize} />}
  </main>;
}
