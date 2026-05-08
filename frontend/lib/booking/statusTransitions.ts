export type BookingLifecycleStatus =
  | 'draft'
  | 'pending_payment'
  | 'paid'
  | 'pending_provider'
  | 'confirmed'
  | 'cancelled'
  | 'failed';

const ALLOWED_TRANSITIONS: Record<BookingLifecycleStatus, BookingLifecycleStatus[]> = {
  draft: ['pending_payment', 'cancelled'],
  pending_payment: ['paid', 'cancelled', 'failed'],
  paid: ['pending_provider', 'confirmed', 'cancelled'],
  pending_provider: ['confirmed', 'cancelled', 'failed'],
  confirmed: [],
  cancelled: [],
  failed: [],
};

export function canTransitionBookingStatus(
  current: string | null | undefined,
  next: BookingLifecycleStatus
): boolean {
  if (!current) return false;
  const normalized = current.toLowerCase() as BookingLifecycleStatus;
  const allowed = ALLOWED_TRANSITIONS[normalized];
  if (!allowed) return false;
  return allowed.includes(next);
}

