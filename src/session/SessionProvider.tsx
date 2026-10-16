import { createContext, useContext, useState, type ReactElement, type ReactNode } from 'react';
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
  async function signIn(credentials: LoginCredentials): Promise<User> {
    const result: User = await service.login(credentials);
    setUser(result);
    return result;
  }
  function signOut(): void { setUser(null); }
  const value: SessionContextValue = { user, signIn, signOut, authService: service };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (!session) throw new Error('A sessão deve ser usada dentro de SessionProvider.');
  return session;
}
