import { useState, type ReactElement } from 'react';

interface GameCoverProps {
  title: string;
  src: string | null;
  decorative?: boolean;
  className?: string;
}

export function GameCover({ title, src, decorative = false, className = 'game-cover' }: GameCoverProps): ReactElement {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (src && src !== failedSrc) {
    return <img src={src} alt={decorative ? '' : `Capa de ${title}`} className={className} onError={() => setFailedSrc(src)} />;
  }
  return <div className={`${className} game-cover`} role="img" aria-label={`Capa de ${title} indisponível`}>Sem capa</div>;
}
