import type { ReactElement } from 'react';
export interface FeedbackProps { message?: string; }
export interface ErrorStateProps extends FeedbackProps { onRetry?: () => void; }
export function LoadingState(_props: FeedbackProps): ReactElement | null { return null; }
export function EmptyState(_props: FeedbackProps): ReactElement | null { return null; }
export function ErrorState(_props: ErrorStateProps): ReactElement | null { return null; }
