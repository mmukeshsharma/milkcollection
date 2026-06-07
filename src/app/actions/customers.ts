/**
 * customers.ts — SERVER ACTION STUBS
 *
 * ⚠️  Customer data is now stored in IndexedDB (local device storage).
 *     MongoDB is ONLY used for Users (authentication).
 *
 * UI components should import directly from '@/lib/customers-local' instead.
 * These stubs are kept for any legacy server-side calls.
 */
'use server'

// Re-export types so existing imports don't break
export type { CustomerRecord as Customer } from '@/lib/customers-local'

export async function getCustomers() {
  return { customers: [], error: 'Customer data is stored locally on device. Use @/lib/customers-local in client components.' }
}

export async function addCustomer() {
  return { error: 'Customer data is stored locally on device. Use @/lib/customers-local in client components.' }
}

export async function updateCustomer() {
  return { error: 'Customer data is stored locally on device. Use @/lib/customers-local in client components.' }
}

export async function deleteCustomer() {
  return { error: 'Customer data is stored locally on device. Use @/lib/customers-local in client components.' }
}

export async function deleteMultipleCustomers() {
  return { error: 'Customer data is stored locally on device. Use @/lib/customers-local in client components.' }
}

export async function getCustomerHistory() {
  return { purchases: [], sales: [], payments: [], error: 'Use local services in client components.' }
}
