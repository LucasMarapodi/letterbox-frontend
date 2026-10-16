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
  enabled: boolean;
  authenticated: boolean;
  load(force?: boolean): Promise<void>;
  seed(lists: FavoriteLists): void;
  toggleReview(id: number): Promise<void>;
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
  const data = useRef<FavoriteLists | null>(null);
  const confirmed = useRef(new Set<number>());
  const busy = useRef(new Set<number>());
  const alive = useRef(true);
  const revision = useRef(0);
  const request = useRef<{ revision: number; promise: Promise<void> } | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const seed = useCallback((lists: FavoriteLists) => {
    if (!alive.current || busy.current.size) return;
    revision.current++;
    data.current = lists;
    confirmed.current = new Set(lists.reviews.map(review => review.id));
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

  async function toggleReview(id: number): Promise<void> {
    if (!user || !enabled || !data.current || busy.current.has(id)) return;
    revision.current++; busy.current.add(id); setPending(new Set(busy.current));
    setErrors(previous => ({ ...previous, [id]: '' }));
    try {
      const result = await community.setFavorite('review', id, !confirmed.current.has(id), user);
      if (!alive.current) return;
      const next = new Set(confirmed.current);
      if (result) next.add(id); else next.delete(id);
      confirmed.current = next; setSelected(next);
    } catch {
      if (alive.current) setErrors(previous => ({ ...previous, [id]: 'Não foi possível atualizar o favorito. Tente novamente.' }));
    } finally {
      busy.current.delete(id);
      if (alive.current) { setPending(new Set(busy.current)); if (!busy.current.size) void load(true); }
    }
  }
  return <Context.Provider value={{ state, selected, pending, errors, enabled, authenticated: Boolean(user), load, seed, toggleReview }}>{children}</Context.Provider>;
}
