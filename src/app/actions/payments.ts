/**
 * payments.ts — SERVER ACTION STUBS
 *
 * ⚠️  Payment data is now stored in IndexedDB (local device storage).
 *     MongoDB is ONLY used for Users (authentication).
 *
 * UI components should import directly from '@/lib/payments-local'.
 */
'use server'

export type { PaymentRecord as Payment } from '@/lib/payments-local'

export async function addPaymentEntry() {
  return { error: 'Payment data is stored locally on device. Use @/lib/payments-local in client components.' }
}

export async function getRecentPayments() {
  return { payments: [], error: 'Use @/lib/payments-local in client components.' }
}

export async function deletePaymentEntry() {
  return { error: 'Use @/lib/payments-local in client components.' }
}

export async function deleteMultiplePayments() {
  return { error: 'Use @/lib/payments-local in client components.' }
}
