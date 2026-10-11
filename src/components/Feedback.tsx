import type { ReactElement } from 'react';
import { Button } from './Button';
export interface FeedbackProps { message?: string; }
export interface ErrorStateProps extends FeedbackProps { onRetry?: () => void; }
export function LoadingState({ message = 'Carregando…' }: FeedbackProps): ReactElement {
  return <p role="status">{message}</p>;
}
export function EmptyState({ message = 'Nenhum resultado disponível.' }: FeedbackProps): ReactElement {
  return <p>{message}</p>;
}
export function ErrorState({ message = 'Não foi possível carregar os dados.', onRetry }: ErrorStateProps): ReactElement {
  return <div>
    <p role="alert">{message}</p>
    {onRetry && <Button onClick={onRetry}>Tentar novamente</Button>}
  </div>;
}
