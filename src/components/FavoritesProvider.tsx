import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { FavoriteLists } from '../services/communityContracts';
import { useServices } from '../services/ServiceProvider';
import { useSession } from '../session/SessionProvider';

interface FavoritesState { status: 'loading' | 'ready' | 'error'; lists: FavoriteLists | null; }
interface FavoritesContextValue {
  state: FavoritesState;
  selected: Set<number>;
  pending: Set<number>;
  errors: Record<number, string>;
  selectedGames: Set<number>;
  pendingGames: Set<number>;
  gameErrors: Record<number, string>;
  enabled: boolean;
  authenticated: boolean;
  load(force?: boolean): Promise<void>;
  seed(lists: FavoriteLists): void;
  toggleReview(id: number): Promise<void>;
  toggleGame(id: number): Promise<void>;
}
const Context = createContext<FavoritesContextValue | null>(null);
export function useFavorites(): FavoritesContextValue | null { return useContext(Context); }

/** Uma leitura compartilhada pelas ações/listas da página, isolada pela sessão em App. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { community, privateFeatures } = useServices();
  const { user } = useSession();
  const enabled = privateFeatures?.favorites !== false;
  const [state, setState] = useState<FavoritesState>({ status: 'loading', lists: null });
  const [selected, setSelected] = useState(new Set<number>());
  const [pending, setPending] = useState(new Set<number>());
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [selectedGames, setSelectedGames] = useState(new Set<number>());
  const [pendingGames, setPendingGames] = useState(new Set<number>());
  const [gameErrors, setGameErrors] = useState<Record<number, string>>({});
  const data = useRef<FavoriteLists | null>(null);
  const confirmed = useRef(new Set<number>());
  const confirmedGames = useRef(new Set<number>());
  const busy = useRef(new Set<string>());
  const alive = useRef(true);
  const revision = useRef(0);
  const request = useRef<{ revision: number; promise: Promise<void> } | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const seed = useCallback((lists: FavoriteLists) => {
    if (!alive.current || busy.current.size) return;
    revision.current++;
    data.current = lists;
    confirmed.current = new Set(lists.reviews.map(review => review.id));
    confirmedGames.current = new Set(lists.games.map(game => game.id));
    setSelectedGames(confirmedGames.current);
    setSelected(confirmed.current); setState({ status: 'ready', lists });
  }, []);

  const load = useCallback((force = false): Promise<void> => {
    if (!user || !enabled || !alive.current || (!force && data.current)) return Promise.resolve();
    if (!force && request.current?.revision === revision.current) return request.current.promise;
    const current = ++revision.current;
    if (!data.current) setState({ status: 'loading', lists: null });
    const promise = Promise.resolve().then(() => { if (!alive.current) throw new Error('Consulta invalidada.'); return community.getFavorites(user); }).then(lists => {
      if (alive.current && current === revision.current) seed(lists);
    }, () => {
      if (alive.current && current === revision.current) setState({ status: 'error', lists: data.current });
    }).finally(() => { if (request.current?.promise === promise) request.current = null; });
    request.current = { revision: current, promise };
    return promise;
  }, [community, user, enabled, seed]);

  async function toggle(kind: 'game' | 'review', id: number): Promise<void> {
    const key = `${kind}:${id}`;
    if (!user || !enabled || !data.current || busy.current.has(key)) return;
    const selection = kind === 'game' ? confirmedGames : confirmed;
    const updateSelection = kind === 'game' ? setSelectedGames : setSelected;
    const updatePending = kind === 'game' ? setPendingGames : setPending;
    const updateErrors = kind === 'game' ? setGameErrors : setErrors;
    const pendingIds = () => new Set([...busy.current].filter(value => value.startsWith(`${kind}:`)).map(value => Number(value.split(':')[1])));
    revision.current++; busy.current.add(key); updatePending(pendingIds());
    updateErrors(previous => ({ ...previous, [id]: '' }));
    try {
      const result = await community.setFavorite(kind, id, !selection.current.has(id), user);
      if (!alive.current) return;
      const next = new Set(selection.current);
      if (result) next.add(id); else next.delete(id);
      selection.current = next; updateSelection(next);
    } catch {
      if (alive.current) updateErrors(previous => ({ ...previous, [id]: 'Não foi possível atualizar o favorito. Tente novamente.' }));
    } finally {
      busy.current.delete(key);
      if (alive.current) { updatePending(pendingIds()); if (!busy.current.size) void load(true); }
    }
  }
  return <Context.Provider value={{ state, selected, pending, errors, selectedGames, pendingGames, gameErrors, enabled, authenticated: Boolean(user), load, seed, toggleReview: id => toggle('review', id), toggleGame: id => toggle('game', id) }}>{children}</Context.Provider>;
}
