import { createContext, useContext, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import type { User } from '../models';
import type { AuthService, LoginCredentials } from '../services/authContracts';

interface SessionContextValue {
  user: User | null;
  signIn(credentials: LoginCredentials): Promise<User>;
  signOut(): Promise<void>;
  notice: string | null;
  version: number;
  authService: AuthService;
}
interface SessionProviderProps { children: ReactNode; service: AuthService; }
const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children, service }: SessionProviderProps): ReactElement {
  const [user, setUser] = useState<User | null>(() => service.sessionUser?.() ?? null);
  const userRef = useRef(user);
  const [notice, setNotice] = useState<string | null>(null);
  const requestVersion = useRef(0);
  function applyUser(next: User | null): void { userRef.current = next; setUser(next); }
  useEffect(() => service.subscribe?.(() => {
    const next = service.sessionUser?.() ?? null;
    if (userRef.current && !next) setNotice('Sua sessão expirou. Entre novamente.');
    applyUser(next);
  }), [service]);
  async function signIn(credentials: LoginCredentials): Promise<User> {
    const version = ++requestVersion.current;
    setNotice(null); applyUser(null);
    const result: User = await service.login(credentials);
    if (version !== requestVersion.current) throw new Error('Solicitação de login invalidada.');
    applyUser(result);
    return result;
  }
  async function signOut(): Promise<void> {
    const version = ++requestVersion.current; applyUser(null); setNotice(null);
    try { await service.logout?.(); }
    catch { if (version === requestVersion.current) setNotice('Você saiu deste dispositivo, mas não foi possível confirmar a revogação na API.'); }
  }
  const value: SessionContextValue = { user, notice, version: 0, signIn, signOut, authService: service };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (!session) throw new Error('A sessão deve ser usada dentro de SessionProvider.');
  return session;
}
