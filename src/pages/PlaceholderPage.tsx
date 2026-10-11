import type { ReactElement } from 'react';
import { useOpaqueRouteId, type RouteIdParameter } from '../routing/useOpaqueRouteId';

interface PlaceholderPageProps {
  title: string;
  parameter?: RouteIdParameter;
  parameterLabel?: string;
}

export function PlaceholderPage({ title, parameter, parameterLabel }: PlaceholderPageProps): ReactElement {
  const id = useOpaqueRouteId(parameter);
  return <main>
    <h1>{title}</h1>
    {parameter && <p>{parameterLabel}: {id}</p>}
    <p>Esta página é provisória. Funcionalidade prevista para as próximas US.</p>
  </main>;
}
