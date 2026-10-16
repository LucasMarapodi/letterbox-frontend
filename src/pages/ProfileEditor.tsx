import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '../models';
import { profileLocations } from '../models/profileLocations';
import type { ProfileCompletionResponse, ProfilePatchRequest, ProfileUpdateResponse } from '../services/http/dtos';
import type { SearchGame } from '../services/searchContracts';
import { validSearchTerm } from '../services/searchContracts';
import { HttpFailure } from '../services/http/client';
import { useServices } from '../services/ServiceProvider';
import { useSession } from '../session/SessionProvider';
import { useFavorites } from '../components/FavoritesProvider';
import { Avatar } from '../components/Avatar';
import { GameCover } from '../components/GameCover';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { ErrorState, LoadingState } from '../components/Feedback';

function validAvatar(value: string): boolean {
  try { return value.length <= 2048 && ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}
function ProfileForm({ profile, initial, onSaved, onCancel, sending }: { profile: User; initial: ProfileCompletionResponse; onSaved(data: ProfileUpdateResponse): void; onCancel(): void; sending: React.RefObject<boolean> }) {
  const { http, search } = useServices();
  const favorites = useFavorites();
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.displayName);
  const [country, setCountry] = useState(initial.country ?? '');
  const [state, setState] = useState(initial.state ?? '');
  const [bio, setBio] = useState(initial.bio);
  const [avatar, setAvatar] = useState(initial.avatarUrl ?? '');
  const [selected, setSelected] = useState(initial.favoriteGameIds);
  const [term, setTerm] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ status: 'idle' | 'loading' | 'error' | 'ready'; items: SearchGame[] }>({ status: 'idle', items: [] });
  const [active, setActive] = useState(-1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  const gameCache = useRef(new Map<number, Pick<SearchGame, 'id' | 'title' | 'coverUrl'>>(favorites?.state.lists?.games.map(game => [game.id, game])));
  const query = term.trim();
  useEffect(() => { alive.current = true; nameRef.current?.focus(); return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (!search || !validSearchTerm(query)) { setResult({ status: 'idle', items: [] }); return; }
    setResult({ status: 'loading', items: [] }); setActive(-1);
    const timer = setTimeout(() => {
      void search.search({ q: query, mode: 'suggestions', scope: 'games', page: 1 }, controller.signal).then(data => {
        if (controller.signal.aborted) return;
        if (data.games.status !== 'ready') { setResult({ status: 'error', items: [] }); return; }
        const items = data.games.items.slice(0, 5);
        items.forEach(game => gameCache.current.set(game.id, game)); setResult({ status: 'ready', items });
      }, () => { if (!controller.signal.aborted) setResult({ status: 'error', items: [] }); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, query, attempt]);
  const changes: ProfilePatchRequest = {
    ...(name !== profile.displayName ? { displayName: name.trim() } : {}),
    ...(bio !== initial.bio ? { bio: bio.trim() } : {}),
    ...(avatar !== (initial.avatarUrl ?? '') ? { avatarUrl: avatar.trim() || null } : {}),
    ...(country !== (initial.country ?? '') || state !== (initial.state ?? '') ? { country: country || null, state: state || null } : {}),
    ...(selected.length !== initial.favoriteGameIds.length || selected.some(value => !initial.favoriteGameIds.includes(value)) ? { favoriteGameIds: selected } : {}),
  };
  const legacy = Boolean((country && !profileLocations[country]) || (state && !profileLocations[country]?.includes(state)));
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (sending.current || !http) return;
    setError('');
    if (!name.trim() || name.trim().length > 100) { setError('Nome de exibição deve ter de 1 a 100 caracteres.'); return; }
    if (bio.trim().length > 2000) { setError('Descrição deve ter até 2000 caracteres.'); return; }
    if (avatar.trim() && !validAvatar(avatar.trim())) { setError('URL do avatar deve usar HTTP ou HTTPS e ter até 2048 caracteres.'); return; }
    if (!Object.keys(changes).length) return;
    sending.current = true; setPending(true);
    try { const saved = await http().profiles.update(changes); if (alive.current) onSaved(saved); }
    catch (failure: unknown) {
      if (alive.current) setError(failure instanceof HttpFailure && failure.code === 'storage_unavailable' ? 'O armazenamento está temporariamente indisponível. Tente novamente.' : failure instanceof HttpFailure && failure.status === 404 ? 'Um jogo selecionado não está mais disponível. Revise a seleção.' : failure instanceof HttpFailure && failure.status === 400 ? 'Verifique os dados do perfil.' : 'Não foi possível atualizar o perfil. Tente novamente.');
    } finally { sending.current = false; if (alive.current) setPending(false); }
  }
  function add(game: SearchGame) { setSelected(previous => previous.includes(game.id) ? previous : [...previous, game.id]); }
  const missing = [!country && 'país', !state && 'estado', !bio.trim() && 'descrição', selected.length < 3 && 'três jogos favoritos'].filter(Boolean);
  return <form aria-label="Editar perfil" className="profile-edit-form" noValidate onSubmit={event => { void save(event); }} aria-busy={pending}>
    <fieldset disabled={pending}>
      <label htmlFor={`${id}-name`}>Nome de exibição</label><input ref={nameRef} id={`${id}-name`} value={name} maxLength={100} onChange={event => setName(event.target.value)} />
      <div className="profile-location-fields"><div><label htmlFor={`${id}-country`}>País</label><select id={`${id}-country`} value={country} onChange={event => { setCountry(event.target.value); setState(''); }}>
        <option value="">Selecione um país</option>{country && !profileLocations[country] && <option value={country} disabled>{country} (legado)</option>}{Object.keys(profileLocations).map(value => <option key={value}>{value}</option>)}
      </select></div><div><label htmlFor={`${id}-state`}>Estado</label><select id={`${id}-state`} value={state} disabled={!profileLocations[country]} onChange={event => setState(event.target.value)}>
        <option value="">Selecione um estado</option>{state && !profileLocations[country]?.includes(state) && <option value={state} disabled>{state} (legado)</option>}{profileLocations[country]?.map(value => <option key={value}>{value}</option>)}
      </select></div></div>
      {legacy && <p>Localização legada: {initial.country} / {initial.state}. Será preservada enquanto você não alterar a localização.</p>}
      <label htmlFor={`${id}-bio`}>Descrição</label><textarea id={`${id}-bio`} value={bio} maxLength={2000} onChange={event => setBio(event.target.value)} />
      <TextField label="URL do avatar (opcional)" value={avatar} maxLength={2048} onChange={event => setAvatar(event.target.value)} />
      <Avatar name="Prévia do avatar" src={validAvatar(avatar.trim()) ? avatar.trim() : null} /><p>Avatar opcional. Deixe vazio para remover a imagem.</p>
      <h3>Jogos favoritos</h3><p aria-live="polite">{selected.length}/3 jogos para completar o perfil. {missing.length ? `Faltam: ${missing.join(', ')}.` : 'Perfil completo.'} Você pode salvar um perfil incompleto.</p>
      <ul className="profile-game-selection" aria-label="Jogos selecionados">{selected.map(gameId => { const game = gameCache.current.get(gameId); return <li key={gameId}><GameCover title={game?.title ?? `Jogo ${gameId}`} src={game?.coverUrl ?? null} className="profile-suggestion-cover" decorative /><span>{game?.title ?? `Jogo ${gameId}`}</span><Button aria-label={`Remover ${game?.title ?? `Jogo ${gameId}`}`} onClick={() => setSelected(previous => previous.filter(value => value !== gameId))}>Remover</Button></li>; })}</ul>
      <label htmlFor={`${id}-search`}>Buscar jogos favoritos</label><input id={`${id}-search`} role="combobox" aria-autocomplete="list" aria-expanded={result.status === 'ready' && result.items.length > 0} aria-controls={`${id}-suggestions`} aria-activedescendant={active >= 0 ? `${id}-game-${result.items[active]?.id}` : undefined} value={term} maxLength={200} autoComplete="off" onChange={event => { setTerm(event.target.value); setActive(-1); }} onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter') { event.preventDefault(); if (active >= 0 && result.items[active]) add(result.items[active]); }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && result.items.length) { event.preventDefault(); setActive(value => event.key === 'ArrowDown' ? (value + 1) % result.items.length : (value <= 0 ? result.items.length : value) - 1); }
      }} />
      {result.status === 'loading' && <LoadingState message="Buscando jogos…" />}
      {result.status === 'error' && <ErrorState message="Não foi possível buscar os jogos." onRetry={() => setAttempt(value => value + 1)} />}
      <ul id={`${id}-suggestions`} role="listbox" aria-label="Sugestões de jogos favoritos" className="profile-game-selection">{result.items.map(game => <li key={game.id} role="none"><button id={`${id}-game-${game.id}`} type="button" role="option" aria-selected={selected.includes(game.id)} className={result.items[active]?.id === game.id ? 'active-suggestion' : ''} onClick={() => add(game)}><GameCover title={game.title} src={game.coverUrl} className="profile-suggestion-cover" decorative /><span>{game.title}</span>{selected.includes(game.id) && <small>Selecionado</small>}</button></li>)}</ul>
      {result.status === 'ready' && !result.items.length && <p>Nenhum jogo encontrado.</p>}
      {error && <p role="alert">{error}</p>}
      <div className="completion-actions"><Button type="submit" disabled={!Object.keys(changes).length}>{pending ? 'Salvando alterações…' : 'Salvar alterações'}</Button><Button onClick={onCancel}>Cancelar</Button></div>
    </fieldset>
  </form>;
}
function ProfileModal({ profile, onClose, onSaved, trigger }: { profile: User; onClose(): void; onSaved(data: ProfileUpdateResponse): void; trigger: HTMLButtonElement | null }) {
  const { http } = useServices();
  const favorites = useFavorites();
  const loadFavorites = favorites?.load;
  const [data, setData] = useState<ProfileCompletionResponse | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const sending = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const title = useId();
  useEffect(() => {
    const controller = new AbortController(); setError(false); setData(null);
    void http?.().profiles.completion(controller.signal).then(value => { if (!controller.signal.aborted) setData(value); }, () => { if (!controller.signal.aborted) setError(true); });
    if (loadFavorites) void loadFavorites();
    return () => controller.abort();
  }, [http, attempt, loadFavorites]);
  useLayoutEffect(() => {
    const backdrop = ref.current;
    const siblings = Array.from(document.body.children).filter(element => element !== backdrop);
    const inert = siblings.map(element => element.hasAttribute('inert'));
    siblings.forEach(element => element.setAttribute('inert', ''));
    const overflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    backdrop?.querySelector<HTMLButtonElement>('button')?.focus();
    function keys(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!sending.current) onClose(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(backdrop?.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]') ?? []).filter(element => !element.matches(':disabled'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    function contain(event: FocusEvent) { if (event.target instanceof Node && !backdrop?.contains(event.target)) backdrop?.querySelector<HTMLButtonElement>('button')?.focus(); }
    document.addEventListener('keydown', keys); document.addEventListener('focusin', contain);
    return () => { document.removeEventListener('keydown', keys); document.removeEventListener('focusin', contain); siblings.forEach((element, index) => { if (!inert[index]) element.removeAttribute('inert'); }); document.documentElement.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, [onClose, trigger]);
  const failed = error || favorites?.state.status === 'error';
  return createPortal(<div className="modal-backdrop" ref={ref}><section className="profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby={title}>
    <div className="modal-heading"><h2 id={title}>Editar perfil</h2><Button aria-label="Fechar edição do perfil" onClick={() => { if (!sending.current) onClose(); }}>×</Button></div>
    {failed ? <ErrorState message="Não foi possível carregar os dados do perfil." onRetry={() => { setAttempt(value => value + 1); void loadFavorites?.(true); }} /> : data && favorites?.state.lists ? <ProfileForm profile={profile} initial={data} sending={sending} onCancel={onClose} onSaved={onSaved} /> : <LoadingState message="Carregando dados do perfil…" />}
  </section></div>, document.body);
}
export function ProfileEditor({ profile, onSaved }: { profile: User; onSaved(user: User): void }) {
  const { user } = useSession(); const { http } = useServices(); const favorites = useFavorites();
  const [open, setOpen] = useState(false); const [success, setSuccess] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null); const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(false), 4000);
    return () => clearTimeout(timer);
  }, [success]);
  if (user?.id !== profile.id || !http) return null;
  return <><button ref={trigger} type="button" className="button" aria-haspopup="dialog" onClick={() => { setSuccess(false); setOpen(true); }}>Editar perfil</button>
    {success && createPortal(<div className="profile-success-toast" role="status">Perfil atualizado.</div>, document.body)}
    {open && <ProfileModal profile={profile} trigger={trigger.current} onClose={close} onSaved={saved => {
      const updated: User = { id: saved.id, username: saved.username, displayName: saved.displayName, bio: saved.bio, avatarUrl: saved.avatarUrl };
      http().session.updateUser(updated); onSaved(updated); void favorites?.load(true); setOpen(false); setSuccess(true);
    }} />}
  </>;
}
