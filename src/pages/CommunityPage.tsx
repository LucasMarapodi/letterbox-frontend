import { useState, type ReactElement } from 'react';
import { CommunityRecent } from './CommunityRecent';
import { CommunityRankedReviews } from './CommunityRankedReviews';
import { CommunityRankedGames } from './CommunityRankedGames';
import { isRankingPeriod, type RankingPeriod } from '../services/communityContracts';

type CommunityView = 'recent' | 'reviews' | 'games';
export function CommunityPage(): ReactElement {
  const [view, setView] = useState<CommunityView>('recent');
  const [period, setPeriod] = useState<RankingPeriod>('7d');
  return <main className="community-page"><span className="eyebrow">DESCUBRA NOVAS CONVERSAS</span><h1>Comunidade</h1>
    <nav className="community-navigation" aria-label="Seções da comunidade">
      <button type="button" aria-pressed={view === 'recent'} onClick={() => setView('recent')}>Recentes</button>
      <button type="button" aria-pressed={view === 'reviews'} onClick={() => setView('reviews')}>Mais comentadas</button>
      <button type="button" aria-pressed={view === 'games'} onClick={() => setView('games')}>Jogos em discussão</button>
    </nav>
    {view !== 'recent' && <div className="community-period"><label htmlFor="community-period">Período dos rankings</label><select id="community-period" value={period} onChange={(event) => { if (isRankingPeriod(event.target.value)) setPeriod(event.target.value); }}><option value="24h">24 horas</option><option value="7d">7 dias</option><option value="30d">30 dias</option></select></div>}
    {view === 'recent' && <CommunityRecent />}
    {view === 'reviews' && <CommunityRankedReviews key={period} period={period} />}
    {view === 'games' && <CommunityRankedGames key={period} period={period} />}
  </main>;
}
