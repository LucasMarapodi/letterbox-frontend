import { useRef, type ComponentProps } from 'react';
import { Modal } from './Modal';
import { RatedReviewForm } from './RatedReviewForm';

export function ReviewModal({ trigger, title, ...form }: ComponentProps<typeof RatedReviewForm> & { trigger: HTMLButtonElement | null; title: string }) {
  const sending = useRef(false);
  return <Modal title={title} closeLabel="Fechar review" trigger={trigger} sending={sending} onClose={form.onCancel}>
    <RatedReviewForm {...form} sendingRef={sending} />
  </Modal>;
}
