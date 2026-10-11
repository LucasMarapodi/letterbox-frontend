import type { ReactElement, ReactNode } from 'react';

export function RequireSession({ children }: { children: ReactNode }): ReactElement {
  return <>{children}</>;
}
