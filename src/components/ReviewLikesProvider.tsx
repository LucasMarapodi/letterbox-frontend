import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useServices } from '../services/ServiceProvider';
import { useSession } from '../session/SessionProvider';
import { HttpFailure } from '../services/http/client';

interface LikeState {
  likeCount: number; likedByMe: boolean | null; status: 'loading' | 'ready' | 'error'; pending: boolean; message?: string;
}
interface ReviewLikesContext {
  entries: Map<number, LikeState>; authenticated: boolean; enabled: boolean;
  load(id: number, likeCount: number, force?: boolean): Promise<void>;
  toggle(id: number): Promise<void>;
}
const Context = createContext<ReviewLikesContext | null>(null);
export function useReviewLikes(): ReviewLikesContext | null { return useContext(Context); }

/** Estado compartilhado por review; o pai em App remonta a região por rota/sessão. */
export function ReviewLikesProvider({ children }: { children: ReactNode }) {
  const { http } = useServices();
  const { user } = useSession();
  const authenticated = Boolean(user);
  const data = useRef(new Map<number, LikeState>());
  const [entries, setEntries] = useState(data.current);
  const busy = useRef(new Set<number>());
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  function update(id: number, state: LikeState): void {
    if (!alive.current) return;
    data.current.set(id, state); setEntries(new Map(data.current));
  }
  const read = useCallback(async (id: number, count: number, refreshCount: boolean): Promise<LikeState> => {
    if (!http) throw new HttpFailure('configuration');
    const api = http();
    const [status, review] = await Promise.all([api.reviews.likeStatus(id), refreshCount ? api.reviews.get(id) : Promise.resolve(null)]);
    return { likedByMe: status.likedByMe, likeCount: review?.likeCount ?? count, status: 'ready', pending: false };
  }, [http]);
  const load = useCallback(async (id: number, likeCount: number, force = false): Promise<void> => {
    if (!http || !authenticated || !alive.current || busy.current.has(id) || (!force && data.current.has(id))) return;
    busy.current.add(id);
    const previous = data.current.get(id) ?? { likeCount, likedByMe: null };
    update(id, { ...previous, status: 'loading', pending: false, message: undefined });
    try { update(id, await read(id, previous.likeCount, force)); }
    catch { update(id, { ...previous, status: 'error', pending: false, message: 'Não foi possível consultar sua curtida. Tente novamente.' }); }
    finally { busy.current.delete(id); }
  }, [http, authenticated, read]);
  async function toggle(id: number): Promise<void> {
    const previous = data.current.get(id);
    if (!http || !authenticated || !alive.current || busy.current.has(id) || previous?.status !== 'ready' || previous.likedByMe === null) return;
    busy.current.add(id); update(id, { ...previous, pending: true, message: undefined });
    try {
      await http().reviews.setLiked(id, !previous.likedByMe);
      update(id, await read(id, previous.likeCount, true));
    } catch { update(id, { ...previous, status: 'error', pending: false, message: 'Não foi possível confirmar a curtida. Consulte novamente antes de tentar.' }); }
    finally { busy.current.delete(id); }
  }
  return <Context.Provider value={{ entries, load, toggle, authenticated, enabled: Boolean(http) }}>{children}</Context.Provider>;
}
