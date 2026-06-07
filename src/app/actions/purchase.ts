/**
 * purchase.ts — SERVER ACTION STUBS
 *
 * ⚠️  Purchase data is now stored in IndexedDB (local device storage).
 *     MongoDB is ONLY used for Users (authentication).
 *
 * UI components should import directly from '@/lib/purchases-local'.
 */
'use server'

export type { PurchaseRecord as MilkPurchase } from '@/lib/purchases-local'

export async function addPurchaseEntry() {
  return { error: 'Purchase data is stored locally on device. Use @/lib/purchases-local in client components.' }
}

export async function getRecentPurchases() {
  return { purchases: [], error: 'Use @/lib/purchases-local in client components.' }
}

export async function updatePurchaseEntry() {
  return { error: 'Use @/lib/purchases-local in client components.' }
}

export async function deletePurchaseEntry() {
  return { error: 'Use @/lib/purchases-local in client components.' }
}

export async function deleteMultiplePurchases() {
  return { error: 'Use @/lib/purchases-local in client components.' }
}
