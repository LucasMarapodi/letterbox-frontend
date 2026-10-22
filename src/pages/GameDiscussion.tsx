import { useSearchParams } from 'react-router-dom';
import { GameOpinionsSection } from './GameOpinionsSection';
import { ForumTopics } from './ForumTopics';
import { forumPageNumber } from '../services/forumContracts';

export function GameDiscussion({ gameId, opinionsVersion }: { gameId: number; opinionsVersion: number }) {
  const [query, setQuery] = useSearchParams();
  const forum = query.get('aba') === 'forum';
  const page = forumPageNumber(query.get('page'));
  function select(selected: boolean, next = 1) {
    setQuery(previous => { const params = new URLSearchParams(previous); params.delete('aba'); params.delete('page'); if (selected) { params.set('aba', 'forum'); params.set('page', String(next)); } return params; });
  }
  return <><div role="tablist" aria-label="Discussões do jogo" className="game-discussion-tabs">
    {['Reviews', 'Fórum'].map((label, index) => <button key={label} id={`discussion-tab-${index}`} type="button" role="tab" aria-selected={forum === Boolean(index)} aria-controls="game-discussion-panel" tabIndex={forum === Boolean(index) ? 0 : -1} onClick={() => select(Boolean(index))} onKeyDown={event => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index; select(Boolean(next)); document.getElementById(`discussion-tab-${next}`)?.focus(); }
    }}>{label}</button>)}
  </div><div role="tabpanel" id="game-discussion-panel" aria-labelledby={`discussion-tab-${forum ? 1 : 0}`} tabIndex={0}>
    {forum ? <ForumTopics key={`${gameId}-${page}`} gameId={gameId} page={page} onPage={next => select(true, next)} /> : <GameOpinionsSection key={`${gameId}-${opinionsVersion}`} gameId={gameId} />}
  </div></>;
}
