import type { ReactElement } from 'react';
import { useState } from 'react';
export interface AvatarProps { name: string; src?: string | null; }
export function Avatar({ name, src }: AvatarProps): ReactElement {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials: string = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || '?';
  if (src && src !== failedSrc) {
    return <img className="avatar" src={src} alt={name} onError={() => setFailedSrc(src)} />;
  }
  return <span className="avatar" role="img" aria-label={name}>{initials}</span>;
}
