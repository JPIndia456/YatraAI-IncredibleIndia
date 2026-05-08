import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionBookingStatus } from '@/lib/booking/statusTransitions';

test('allows pending_payment -> paid', () => {
  assert.equal(canTransitionBookingStatus('pending_payment', 'paid'), true);
});

test('blocks pending_payment -> confirmed', () => {
  assert.equal(canTransitionBookingStatus('pending_payment', 'confirmed'), false);
});

test('allows paid -> confirmed', () => {
  assert.equal(canTransitionBookingStatus('paid', 'confirmed'), true);
});

test('allows pending_provider -> confirmed', () => {
  assert.equal(canTransitionBookingStatus('pending_provider', 'confirmed'), true);
});

test('blocks confirmed -> paid', () => {
  assert.equal(canTransitionBookingStatus('confirmed', 'paid'), false);
});

