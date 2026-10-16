import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import { defaultApplicationServices, type ApplicationServices } from './runtime';
import { services } from './index';
import { authService } from './auth';
import { community } from './community';
import { notifications } from './notifications';

const defaults: ApplicationServices = { ...defaultApplicationServices, games: services.games, auth: authService, community, notifications };
const ServiceContext = createContext<ApplicationServices>(defaults);
export function ServiceProvider({ value = defaults, children }: { value?: ApplicationServices; children: ReactNode }): ReactElement {
  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
}
export function useServices(): ApplicationServices { return useContext(ServiceContext); }
