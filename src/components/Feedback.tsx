import type { ReactElement, ReactNode } from 'react';
import { Button } from './Button';
export interface FeedbackProps { message?: string; region?: string; }
export function QueryRegion({ label, busy, children }: { label: string; busy: boolean; children: ReactNode }): ReactElement {
  return <div role="region" aria-label={label} aria-busy={busy}>{children}</div>;
}
export interface ErrorStateProps extends FeedbackProps { onRetry?: () => void; }
export function LoadingState({ message = 'Carregando…', region }: FeedbackProps): ReactElement {
  const status = <p role="status">{message}</p>;
  return region ? <QueryRegion label={region} busy>{status}</QueryRegion> : status;
}
export function EmptyState({ message = 'Nenhum resultado disponível.', region }: FeedbackProps): ReactElement {
  const content = <p>{message}</p>;
  return region ? <QueryRegion label={region} busy={false}>{content}</QueryRegion> : content;
}
export function ErrorState({ message = 'Não foi possível carregar os dados.', onRetry, region }: ErrorStateProps): ReactElement {
  const content = <div>
    <p role="alert">{message}</p>
    {onRetry && <Button onClick={onRetry}>Tentar novamente</Button>}
  </div>;
  return region ? <QueryRegion label={region} busy={false}>{content}</QueryRegion> : content;
}
