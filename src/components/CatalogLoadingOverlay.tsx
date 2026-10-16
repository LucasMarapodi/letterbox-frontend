import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LoadingState } from './Feedback';

/** Bloqueio exclusivo das atualizações de busca/tamanho do catálogo. */
export function CatalogLoadingOverlay({ restoreFocus }: { restoreFocus: HTMLElement | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const overlay = ref.current;
    const previousFocus = restoreFocus;
    const { scrollX, scrollY } = window;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    const siblings = Array.from(document.body.children).filter(element => element !== overlay);
    const previousInert = siblings.map(element => element.hasAttribute('inert'));
    siblings.forEach(element => element.setAttribute('inert', ''));
    root.style.overflow = 'hidden';
    overlay?.focus({ preventScroll: true });
    return () => {
      siblings.forEach((element, index) => { if (!previousInert[index]) element.removeAttribute('inert'); });
      root.style.overflow = overflow;
      // O botão de retry pode sair do DOM neste commit; restaurar foco depois dele.
      queueMicrotask(() => {
        if (document.querySelector('.catalog-loading-overlay')) return;
        const target = previousFocus?.isConnected && !previousFocus.matches(':disabled') && !previousFocus.closest('[inert]')
          ? previousFocus : document.querySelector<HTMLElement>('.catalog-search input');
        target?.focus({ preventScroll: true });
        if (window.scrollX !== scrollX || window.scrollY !== scrollY) window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
      });
    };
  }, [restoreFocus]);
  return createPortal(<div ref={ref} className="catalog-loading-overlay" role="dialog" aria-modal="true" aria-label="Carregando jogos" tabIndex={-1}
    onKeyDown={event => { if (event.key === 'Tab') event.preventDefault(); }}>
    <LoadingState message="Carregando jogos…" />
  </div>, document.body);
}
