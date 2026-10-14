import type { ReactElement } from 'react';
export function LastCommentTime({ value }: { value: string }): ReactElement {
  return <p>Último comentário: <time aria-label="Último comentário" dateTime={value}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))}</time> (UTC)</p>;
}
