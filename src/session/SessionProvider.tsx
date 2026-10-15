import { createContext, useContext, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import type { User } from '../models';
import type { AuthService, LoginCredentials } from '../services/authContracts';

interface SessionContextValue {
  user: User | null;
  signIn(credentials: LoginCredentials): Promise<User>;
  signOut(): Promise<void>;
  notice: string | null;
  signingOut: boolean;
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
  const logoutRequest = useRef<number | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [version, setVersion] = useState(() => service.sessionVersion?.() ?? 0);
  function applyUser(next: User | null): void { userRef.current = next; setUser(next); }
  useEffect(() => service.subscribe?.(() => {
    setVersion(service.sessionVersion?.() ?? requestVersion.current);
    const next = service.sessionUser?.() ?? null;
    if (userRef.current && !next) setNotice('Sua sessão expirou. Entre novamente.');
    applyUser(next);
  }), [service]);
  async function signIn(credentials: LoginCredentials): Promise<User> {
    const request = ++requestVersion.current;
    logoutRequest.current = null; setSigningOut(false);
    setVersion(service.sessionVersion?.() ?? request);
    setNotice(null); applyUser(null);
    const result: User = await service.login(credentials);
    if (request !== requestVersion.current) throw new Error('Solicitação de login invalidada.');
    applyUser(result);
    return result;
  }
  async function signOut(): Promise<void> {
    if (logoutRequest.current !== null) return;
    // A limpeza local não espera a rede; a trava pertence a esta operação.
    const request = ++requestVersion.current;
    logoutRequest.current = request; setSigningOut(true);
    applyUser(null); setNotice(null);
    setVersion(service.sessionVersion?.() ?? request);
    try { await service.logout?.(); }
    catch { if (request === requestVersion.current) setNotice('Você saiu deste dispositivo, mas não foi possível confirmar a revogação na API.'); }
    finally { if (logoutRequest.current === request) { logoutRequest.current = null; setSigningOut(false); } }
  }
  const value: SessionContextValue = { user, notice, signingOut, version, signIn, signOut, authService: service };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (!session) throw new Error('A sessão deve ser usada dentro de SessionProvider.');
  return session;
}
