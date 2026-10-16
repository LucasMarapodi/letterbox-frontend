import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { User } from '../models';
import type { GamePage } from '../services/contracts';
import type { ProfileCompletionResponse } from '../services/http/dtos';
import { HttpFailure } from '../services/http/client';
import { useServices } from '../services/ServiceProvider';
import { useSession } from '../session/SessionProvider';
import { useFavorites } from '../components/FavoritesProvider';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { Avatar } from '../components/Avatar';
import { ErrorState, LoadingState } from '../components/Feedback';

function validAvatar(value: string): boolean {
  try { return value.length <= 2048 && ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}
function CompletionEditor({ initial, onSaved, onCancel }: { initial: ProfileCompletionResponse; onSaved(data: ProfileCompletionResponse): void; onCancel(): void }) {
  const { games, http } = useServices();
  const favorites = useFavorites();
  const bioId = useId();
  const [country, setCountry] = useState(initial.country ?? '');
  const [state, setState] = useState(initial.state ?? '');
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? '');
  const [selected, setSelected] = useState(initial.favoriteGameIds);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<{ status: 'idle' | 'loading' | 'error' } | { status: 'ready'; data: GamePage }>({ status: 'idle' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const sending = useRef(false);
  const alive = useRef(true);
  const searchVersion = useRef(0);
  const titles = useRef(new Map<number, string>());
  const lastSearch = useRef({ term: '', page: 1 });
  useEffect(() => { alive.current = true; return () => { alive.current = false; searchVersion.current++; }; }, []);
  async function findGames(page = 1, query = term.trim()): Promise<void> {
    const version = ++searchVersion.current;
    lastSearch.current = { term: query, page };
    setResults({ status: 'loading' });
    try {
      const data = await games.list({ term: query, sort: 'name-asc', page, pageSize: 20 });
      if (!alive.current || version !== searchVersion.current) return;
      for (const game of data.items) titles.current.set(game.id, game.title);
      setResults({ status: 'ready', data });
    } catch { if (alive.current && version === searchVersion.current) setResults({ status: 'error' }); }
  }
  function title(id: number): string { return titles.current.get(id) ?? favorites?.state.lists?.games.find(game => game.id === id)?.title ?? `Jogo ${id}`; }
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (sending.current || !http) return;
    setError('');
    const next: Record<string, string> = {};
    if (!country.trim() || country.trim().length > 100) next.country = 'Informe o país (até 100 caracteres).';
    if (!state.trim() || state.trim().length > 100) next.state = 'Informe o estado, província ou região (até 100 caracteres).';
    if (!bio.trim() || bio.trim().length > 2000) next.bio = 'Informe uma descrição (até 2000 caracteres).';
    if (selected.length < 3) next.games = 'Selecione pelo menos três jogos distintos.';
    if (avatarUrl.trim() && !validAvatar(avatarUrl.trim())) next.avatar = 'URL do avatar deve usar HTTP ou HTTPS e ter até 2048 caracteres.';
    setErrors(next); if (Object.keys(next).length) return;
    sending.current = true; setPending(true);
    try {
      const saved = await http().profiles.complete({ country: country.trim(), state: state.trim(), bio: bio.trim(), avatarUrl: avatarUrl.trim() || null, favoriteGameIds: selected });
      if (alive.current) onSaved(saved);
    } catch (failure: unknown) {
      if (alive.current) setError(failure instanceof HttpFailure && failure.code === 'storage_unavailable' ? 'O armazenamento está temporariamente indisponível. Tente novamente.' : failure instanceof HttpFailure && failure.status === 404 ? 'Um jogo selecionado não está mais disponível. Revise a seleção.' : 'Não foi possível concluir o perfil. Verifique os dados e tente novamente.');
    } finally { sending.current = false; if (alive.current) setPending(false); }
  }
  return <form aria-label="Completar perfil" className="auth-form profile-completion-form" noValidate onSubmit={submit}>
    <fieldset disabled={pending}>
      <legend>Dados do perfil</legend>
      <TextField label="País" value={country} maxLength={100} aria-invalid={Boolean(errors.country)} onChange={event => setCountry(event.target.value)} />
      {errors.country && <p role="alert">{errors.country}</p>}
      <TextField label="Estado / província / região" value={state} maxLength={100} aria-invalid={Boolean(errors.state)} onChange={event => setState(event.target.value)} />
      {errors.state && <p role="alert">{errors.state}</p>}
      <label htmlFor={bioId}>Descrição</label><textarea id={bioId} value={bio} maxLength={2000} aria-invalid={Boolean(errors.bio)} onChange={event => setBio(event.target.value)} />
      {errors.bio && <p role="alert">{errors.bio}</p>}
      <TextField label="URL do avatar (opcional)" value={avatarUrl} maxLength={2048} aria-invalid={Boolean(errors.avatar)} onChange={event => setAvatarUrl(event.target.value)} />
      <p>Use uma URL HTTP ou HTTPS. Deixe vazio para remover a imagem. Avatar não é obrigatório.</p>
      <Avatar name="Prévia do avatar" src={validAvatar(avatarUrl.trim()) ? avatarUrl.trim() : null} />
      {errors.avatar && <p role="alert">{errors.avatar}</p>}
      <h3>Jogos favoritos</h3><p aria-live="polite">{selected.length} de 3 jogos necessários</p>
      {selected.length > 0 && <ul className="completion-selection" aria-label="Jogos selecionados">{selected.map(id => <li key={id}><span>{title(id)}</span><Button aria-label={`Remover ${title(id)}`} onClick={() => setSelected(previous => previous.filter(value => value !== id))}>Remover</Button></li>)}</ul>}
      {errors.games && <p role="alert">{errors.games}</p>}
      <TextField label="Buscar jogos favoritos" value={term} maxLength={200} onChange={event => setTerm(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void findGames(); } }} />
      <Button onClick={() => { void findGames(); }}>Buscar jogos</Button>
      <div role="region" aria-label="Busca de jogos favoritos" aria-busy={results.status === 'loading'}>
        {results.status === 'loading' && <LoadingState message="Buscando jogos…" />}
        {results.status === 'error' && <ErrorState message="Não foi possível buscar os jogos." onRetry={() => { void findGames(lastSearch.current.page, lastSearch.current.term); }} />}
        {results.status === 'ready' && <>
          {!results.data.items.length && <p>Nenhum jogo encontrado.</p>}
          <ul className="completion-selection">{results.data.items.map(game => <li key={game.id}><span>{game.title}</span><Button disabled={selected.includes(game.id)} aria-label={`Adicionar ${game.title}`} onClick={() => setSelected(previous => previous.includes(game.id) ? previous : [...previous, game.id])}>{selected.includes(game.id) ? 'Selecionado' : 'Adicionar'}</Button></li>)}</ul>
          <div className="completion-actions"><Button disabled={results.data.page <= 1} onClick={() => { void findGames(results.data.page - 1, lastSearch.current.term); }}>Jogos anteriores</Button><span>Página {results.data.page}</span><Button disabled={!results.data.hasNextPage} onClick={() => { void findGames(results.data.page + 1, lastSearch.current.term); }}>Próximos jogos</Button></div>
        </>}
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="completion-actions"><Button type="submit">{pending ? 'Salvando conclusão…' : 'Salvar conclusão'}</Button><Button onClick={onCancel}>Cancelar</Button></div>
    </fieldset>
  </form>;
}

function CompletionSection({ revision, onSaved }: { revision: number; onSaved(data: ProfileCompletionResponse): void }) {
  const { http } = useServices();
  const favorites = useFavorites();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'ready'; data: ProfileCompletionResponse }>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState('');
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' }); setOpen(false); setSuccess('');
    void http?.().profiles.completion().then(data => { if (active) setState({ status: 'ready', data }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [http, revision, attempt]);
  if (state.status === 'loading') return <LoadingState region="Conclusão do perfil" message="Consultando conclusão do perfil…" />;
  if (state.status === 'error') return <ErrorState region="Conclusão do perfil" message="Não foi possível consultar a conclusão do perfil." onRetry={() => setAttempt(previous => previous + 1)} />;
  return <section className="review-card" aria-label="Conclusão do perfil">
    <h2>Conclusão do perfil</h2>
    {success && <p role="status">{success}</p>}
    {!state.data.isComplete && <Button onClick={() => setOpen(true)}>Completar perfil</Button>}
    {open && <CompletionEditor initial={state.data} onCancel={() => setOpen(false)} onSaved={data => {
      setState({ status: 'ready', data }); setOpen(false); setSuccess(data.isComplete ? 'Perfil concluído.' : 'Dados salvos. O perfil ainda está incompleto.');
      const session = http?.().session;
      const current = session?.current();
      if (current) session?.updateUser({ ...current.user, bio: data.bio, avatarUrl: data.avatarUrl });
      void favorites?.load(true);
      onSaved(data);
    }} />}
  </section>;
}
export function ProfileCompletion({ profile, revision, onSaved }: { profile: User; revision: number; onSaved(data: ProfileCompletionResponse): void }) {
  const { user, version } = useSession();
  const { http } = useServices();
  return user?.id === profile.id && http ? <CompletionSection key={`${version}-${user.id}`} revision={revision} onSaved={onSaved} /> : null;
}
