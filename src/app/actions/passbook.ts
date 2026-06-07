/**
 * passbook.ts — SERVER ACTION STUBS
 *
 * ⚠️  Passbook data is now stored in IndexedDB (local device storage).
 *     MongoDB is ONLY used for Users (authentication).
 *
 * UI components should import directly from '@/lib/passbook-local'.
 */
'use server'

export async function getCustomerPassbook() {
  return { passbook: [], error: 'Passbook data is stored locally on device. Use @/lib/passbook-local in client components.' }
}
