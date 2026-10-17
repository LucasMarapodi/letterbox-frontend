import { useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

/** Mesmo foco, fundo inerte e retorno ao gatilho para perfil e review. */
export function Modal({ title, closeLabel, trigger, sending, onClose, children }: {
  title: string; closeLabel: string; trigger: HTMLButtonElement | null; sending: RefObject<boolean>; onClose(): void; children: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const backdrop = ref.current;
    const siblings = Array.from(document.body.children).filter(element => element !== backdrop);
    const inert = siblings.map(element => element.hasAttribute('inert'));
    siblings.forEach(element => element.setAttribute('inert', ''));
    const overflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    backdrop?.querySelector<HTMLButtonElement>('button')?.focus();
    function keys(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!sending.current) onClose(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(backdrop?.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]') ?? []).filter(element => !element.matches(':disabled'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    function contain(event: FocusEvent) { if (event.target instanceof Node && !backdrop?.contains(event.target)) backdrop?.querySelector<HTMLButtonElement>('button')?.focus(); }
    document.addEventListener('keydown', keys); document.addEventListener('focusin', contain);
    return () => {
      document.removeEventListener('keydown', keys); document.removeEventListener('focusin', contain);
      siblings.forEach((element, index) => { if (!inert[index]) element.removeAttribute('inert'); });
      document.documentElement.style.overflow = overflow; if (trigger?.isConnected) trigger.focus();
    };
  }, [onClose, sending, trigger]);
  return createPortal(<div className="modal-backdrop" ref={ref}><section className="profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby={id}>
    <div className="modal-heading"><h2 id={id}>{title}</h2><Button aria-label={closeLabel} onClick={() => { if (!sending.current) onClose(); }}>×</Button></div>
    {children}
  </section></div>, document.body);
}
