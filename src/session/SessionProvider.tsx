import { createContext, useContext, useRef, useState, type ReactElement, type ReactNode } from 'react';
import type { User } from '../models';
import type { AuthService, LoginCredentials } from '../services/authContracts';

interface SessionContextValue {
  user: User | null;
  signIn(credentials: LoginCredentials): Promise<User>;
  signOut(): void;
  authService: AuthService;
}
interface SessionProviderProps { children: ReactNode; service: AuthService; }
const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children, service }: SessionProviderProps): ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const requestVersion = useRef(0);
  async function signIn(credentials: LoginCredentials): Promise<User> {
    const version = ++requestVersion.current;
    const result: User = await service.login(credentials);
    if (version !== requestVersion.current) throw new Error('Solicitação de login invalidada.');
    setUser(result);
    return result;
  }
  function signOut(): void { requestVersion.current++; service.logout?.(); setUser(null); }
  const value: SessionContextValue = { user, signIn, signOut, authService: service };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (!session) throw new Error('A sessão deve ser usada dentro de SessionProvider.');
  return session;
}
