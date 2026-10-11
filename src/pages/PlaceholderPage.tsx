import type { ReactElement } from 'react';
import { useParams } from 'react-router-dom';

interface PlaceholderPageProps {
  title: string;
  parameter?: 'gameId' | 'reviewId' | 'userId';
  parameterLabel?: string;
}

export function PlaceholderPage({ title, parameter, parameterLabel }: PlaceholderPageProps): ReactElement {
  const params = useParams<'gameId' | 'reviewId' | 'userId'>();
  return <main>
    <h1>{title}</h1>
    {parameter && <p>{parameterLabel}: {params[parameter]}</p>}
    <p>Esta página é provisória. Funcionalidade prevista para as próximas US.</p>
  </main>;
}
