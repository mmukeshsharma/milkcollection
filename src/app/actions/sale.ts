/**
 * sale.ts — SERVER ACTION STUBS
 *
 * ⚠️  Sale data is now stored in IndexedDB (local device storage).
 *     MongoDB is ONLY used for Users (authentication).
 *
 * UI components should import directly from '@/lib/sales-local'.
 */
'use server'

export type { SaleRecord as MilkSale } from '@/lib/sales-local'

export async function addSaleEntry() {
  return { error: 'Sale data is stored locally on device. Use @/lib/sales-local in client components.' }
}

export async function getRecentSales() {
  return { sales: [], error: 'Use @/lib/sales-local in client components.' }
}

export async function updateSaleEntry() {
  return { error: 'Use @/lib/sales-local in client components.' }
}

export async function deleteSaleEntry() {
  return { error: 'Use @/lib/sales-local in client components.' }
}

export async function deleteMultipleSales() {
  return { error: 'Use @/lib/sales-local in client components.' }
}
