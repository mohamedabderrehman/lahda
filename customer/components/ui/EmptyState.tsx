import type React from 'react';
import { EmptyMoment } from '../food-ui';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  kind?: 'cart' | 'orders' | 'search' | 'favorites' | 'stores';
};

/** Keeps legacy call-sites functional while removing the old boxed empty-state layout. */
export function EmptyState({ title, subtitle, message, actionLabel, onAction, kind = 'search' }: EmptyStateProps) {
  return <EmptyMoment kind={kind} title={title} message={subtitle ?? message} actionLabel={actionLabel} onAction={onAction} />;
}
