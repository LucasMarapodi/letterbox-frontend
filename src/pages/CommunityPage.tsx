import { useState, type ReactElement } from 'react';
import { CommunityRecent } from './CommunityRecent';

type CommunityView = 'recent' | 'reviews' | 'games';
export function CommunityPage(): ReactElement {
  const [view, setView] = useState<CommunityView>('recent');
  return <main className="community-page"><span className="eyebrow">DESCUBRA NOVAS CONVERSAS</span><h1>Comunidade</h1>
    <nav className="community-navigation" aria-label="Seções da comunidade">
      <button type="button" aria-pressed={view === 'recent'} onClick={() => setView('recent')}>Recentes</button>
      <button type="button" aria-pressed={view === 'reviews'} onClick={() => setView('reviews')}>Mais comentadas</button>
      <button type="button" aria-pressed={view === 'games'} onClick={() => setView('games')}>Jogos em discussão</button>
    </nav>
    {view === 'recent' && <CommunityRecent />}
  </main>;
}
