import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useServices } from '../services/ServiceProvider';
import { validSearchTerm, type SearchGroup, type SearchPerson, type SearchGame, type SearchScope } from '../services/searchContracts';
import { Avatar } from './Avatar';
import { GameCover } from './GameCover';
import { encodeRouteId } from '../routing/encodeRouteId';

type Group<T> = SearchGroup<T> | { status: 'loading' };
type Groups = { people: Group<SearchPerson>; games: Group<SearchGame> };
const loading: Groups = { people: { status: 'loading' }, games: { status: 'loading' } };
const failure = { status: 'unavailable' as const, items: [], page: null, pageSize: null, hasNextPage: null, error: { code: 'unavailable', message: 'Busca indisponível.' }, metadata: null };

export function MenuSearch({ onSearch }: { onSearch?: (term: string) => void }) {
  const { search } = useServices();
  const navigate = useNavigate();
  const location = useLocation();
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<Groups>(loading);
  const [selected, setSelected] = useState(-1);
  const [chooseSuggestion, setChooseSuggestion] = useState(false);
  const query = term.trim();
  const valid = validSearchTerm(query);
  const cancel = useCallback(() => {
    revision.current++;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    controller.current?.abort();
  }, []);
  const close = useCallback(() => { cancel(); setOpen(false); setSelected(-1); }, [cancel]);
  useLayoutEffect(close, [location.key, close]);
  const run = useCallback(async (scope: SearchScope) => {
    if (!search || !validSearchTerm(query)) return;
    cancel();
    const current = revision.current;
    const request = new AbortController(); controller.current = request;
    setSelected(-1);
    setGroups(previous => scope === 'all' ? loading : { ...previous, [scope]: { status: 'loading' } });
    try {
      const result = await search.search({ q: query, mode: 'suggestions', scope, page: 1 }, request.signal);
      if (current !== revision.current || request.signal.aborted) return;
      setGroups(previous => ({ people: result.people.status === 'notRequested' ? previous.people : result.people, games: result.games.status === 'notRequested' ? previous.games : result.games }));
    } catch {
      if (current === revision.current && !request.signal.aborted) setGroups(previous => scope === 'all' ? { people: failure, games: failure } : { ...previous, [scope]: failure });
    }
  }, [search, query, cancel]);
  useEffect(() => {
    if (open && valid && search) timer.current = setTimeout(() => { void run('all'); }, 300);
    return cancel;
  }, [open, valid, run, search, cancel]);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (event.target instanceof Node && !ref.current?.contains(event.target)) close(); }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, close]);
  if (!search) return null;
  const people = groups.people.status === 'ready' ? groups.people.items.map(person => ({ key: `person-${person.id}`, to: `/perfil/${encodeRouteId(person.id)}`, content: <><Avatar name={person.displayName} src={person.avatarUrl} /><span>{person.displayName} <small>@{person.username}</small></span></> })) : [];
  const games = groups.games.status === 'ready' ? groups.games.items.map(game => ({ key: `game-${game.id}`, to: `/jogos/${encodeRouteId(game.id)}`, content: <><GameCover title={game.title} src={game.coverUrl} className="menu-search-cover" decorative /><span>{game.title}</span></> })) : [];
  const options = [...people, ...games];
  const active = options[selected];
  return <div className="menu-search" ref={ref} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}>
    <label className="visually-hidden" htmlFor={id}>Buscar pessoas e jogos</label>
    <input ref={inputRef} id={id} type="search" role="combobox" autoComplete="off" maxLength={200} placeholder="Pessoas e jogos…" value={term}
      aria-autocomplete="list" aria-expanded={open && valid} aria-controls={open && valid ? `${id}-list` : undefined}
      aria-activedescendant={open && active ? `${id}-${active.key}` : undefined} aria-describedby={open && !valid ? `${id}-hint` : undefined}
      onFocus={() => { if (!open) { setGroups(loading); setOpen(true); } }}
      onClick={() => { if (!open) { setGroups(loading); setOpen(true); } }}
      onChange={event => {
        const next = event.target.value;
        if (next.trim() !== query) { cancel(); setGroups(loading); setSelected(-1); }
        setTerm(next); setOpen(true); setChooseSuggestion(false);
      }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); if (valid) setOpen(true);
          if (options.length) setSelected(previous => event.key === 'ArrowDown' ? (previous + 1) % options.length : (previous <= 0 ? options.length : previous) - 1);
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (!valid) { setOpen(true); return; }
          close();
          if (open && active) navigate(active.to);
          else if (onSearch) onSearch(query);
          else setChooseSuggestion(true);
        }
      }} />
    {open && !valid && <p className="menu-search-hint" id={`${id}-hint`} role="status">Digite pelo menos 3 caracteres.</p>}
    {chooseSuggestion && <p className="menu-search-hint" role="status">Selecione uma sugestão para continuar.</p>}
    {open && valid && <div className="menu-search-panel">
      <div id={`${id}-list`} role="listbox" aria-label="Sugestões de pessoas e jogos">
        {(['people', 'games'] as const).map(kind => {
          const label = kind === 'people' ? 'Pessoas' : 'Jogos';
          const group = groups[kind]; const entries = kind === 'people' ? people : games;
          return <div key={kind} role="group" aria-label={label}>
            <h3 aria-hidden="true">{label}</h3>
            {group.status === 'loading' && <p role="status">Carregando {label}…</p>}
            {group.status === 'ready' && !entries.length && <p role="status">{kind === 'people' ? 'Nenhuma pessoa encontrada.' : 'Nenhum jogo encontrado.'}</p>}
            {group.status === 'unavailable' && <p role="alert">{label} indisponíveis.</p>}
            {group.status === 'ready' && group.metadata?.isStale && <p>Dados de Jogos desatualizados.</p>}
            {entries.map(option => <Link key={option.key} id={`${id}-${option.key}`} role="option" aria-selected={active?.key === option.key} tabIndex={-1} to={option.to}
              onMouseDown={event => event.preventDefault()} onClick={close}>{option.content}</Link>)}
          </div>;
        })}
      </div>
      {(['people', 'games'] as const).map(kind => groups[kind].status === 'unavailable' && <button key={kind} type="button" onClick={() => { inputRef.current?.focus({ preventScroll: true }); void run(kind); }}>Tentar novamente {kind === 'people' ? 'Pessoas' : 'Jogos'}</button>)}
    </div>}
  </div>;
}
