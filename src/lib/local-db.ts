/**
 * local-db.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * IndexedDB-backed local storage for Sharma Dairy ERP.
 *
 * Collections stored on-device (MongoDB is ONLY for Users/auth):
 *   customers | purchases | sales | payments | passbook |
 *   rate_charts | products | inventory_transactions
 *
 * All records use a client-generated UUID as `id` so there is no server
 * round-trip needed for new records.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DB_NAME = 'sharma_dairy_local'
const DB_VERSION = 1

// ── Store names ──────────────────────────────────────────────────────────────
export const STORES = {
  customers: 'customers',
  purchases: 'purchases',
  sales: 'sales',
  payments: 'payments',
  passbook: 'passbook',
  rate_charts: 'rate_charts',
  products: 'products',
  inventory: 'inventory',
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

// ── Open / initialise the database ──────────────────────────────────────────

let _db: IDBDatabase | null = null

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'))
      return
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result

      const createStore = (name: string, indexes: string[] = []) => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' })
          indexes.forEach((idx) => store.createIndex(idx, idx, { unique: false }))
        }
      }

      createStore(STORES.customers,  ['customer_code', 'active_status'])
      createStore(STORES.purchases,  ['customer_id', 'purchase_date', 'shift'])
      createStore(STORES.sales,      ['customer_id', 'sale_date'])
      createStore(STORES.payments,   ['customer_id', 'payment_date'])
      createStore(STORES.passbook,   ['customer_id', 'transaction_date', 'reference_id'])
      createStore(STORES.rate_charts,['milk_type', 'status', 'is_default'])
      createStore(STORES.products,   ['product_name'])
      createStore(STORES.inventory,  ['product_id'])
    }

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result
      resolve(_db)
    }

    req.onerror = (e) => {
      reject((e.target as IDBOpenDBRequest).error)
    }
  })
}

// ── UUID generator ───────────────────────────────────────────────────────────

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// ── Generic CRUD helpers ─────────────────────────────────────────────────────

export async function dbGetAll<T = any>(store: StoreName): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror  = () => reject(req.error)
  })
}

export async function dbGet<T = any>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(id)
    req.onsuccess = () => resolve(req.result as T)
    req.onerror  = () => reject(req.error)
  })
}

export async function dbGetByIndex<T = any>(
  store: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly')
    const idx = tx.objectStore(store).index(indexName)
    const req = idx.getAll(value)
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror  = () => reject(req.error)
  })
}

export async function dbPut<T extends { id: string }>(store: StoreName, record: T): Promise<T> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).put(record)
    req.onsuccess = () => resolve(record)
    req.onerror  = () => reject(req.error)
  })
}

export async function dbDelete(store: StoreName, id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).delete(id)
    req.onsuccess = () => resolve()
    req.onerror  = () => reject(req.error)
  })
}

/** Delete all records in a store matching a specific index value */
export async function dbDeleteByIndex(
  store: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<void> {
  const records = await dbGetByIndex(store, indexName, value)
  for (const r of records as any[]) {
    await dbDelete(store, r.id)
  }
}

/** Count all records in a store */
export async function dbCount(store: StoreName): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror  = () => reject(req.error)
  })
}

// ── Rate Chart — formula helper ──────────────────────────────────────────────
// Correct formula: Rate = (FAT × fat_step_rate) + bonus_amount

export function calculateRateFromChart(
  chart: any,
  fat: number,
  snf: number
): { rate: number; bonus: number; penalty: number; chartId: string; chartName: string; error?: string } {
  const card = chart.cards?.[0]
  if (!card) {
    return { rate: 0, bonus: 0, penalty: 0, chartId: chart.id, chartName: chart.chart_name, error: 'No card configured' }
  }

  const calcType  = chart.calculation_type
  const bonusAmt  = Number(chart.bonus_amount || 0)

  let fatBaseRate = 0
  let snfBaseRate = 0

  if (calcType === 'fat_based' || calcType === 'fat_snf' || calcType === 'fat_snf_base_rate') {
    const match = card.fat_steps?.find((s: any) => fat >= s.min_val && fat <= s.max_val)
    if (match) fatBaseRate = match.rate
  }
  if (calcType === 'snf_based' || calcType === 'fat_snf') {
    const match = card.snf_steps?.find((s: any) => snf >= s.min_val && snf <= s.max_val)
    if (match) snfBaseRate = match.rate
  }

  let rate = 0
  if (calcType === 'fat_based') {
    rate = fatBaseRate
  } else if (calcType === 'snf_based') {
    rate = snfBaseRate
  } else if (calcType === 'fat_snf_base_rate') {
    // ✅ Correct formula: Rate = (FAT × fat_rate) + bonus
    rate = fat * fatBaseRate
  } else {
    // fat_snf
    rate = fatBaseRate + snfBaseRate
  }

  rate = rate + bonusAmt
  rate = Math.max(0, Number(rate.toFixed(2)))

  return {
    rate,
    bonus: bonusAmt,
    penalty: 0,
    chartId: chart.id,
    chartName: chart.chart_name,
  }
}

/** Find active default rate chart for a milk type from local IndexedDB */
export async function getLocalRateForPurchase(
  milkType: 'cow' | 'buffalo' | 'mixed',
  fat: number,
  snf: number
): Promise<{ rate: number; bonus: number; penalty: number; chartId: string; chartName: string; error?: string }> {
  const allCharts = await dbGetAll(STORES.rate_charts)

  // Find default active chart for this milk type
  let chart = allCharts.find(
    (c: any) => c.milk_type === milkType && c.status === 'active' && c.is_default
  )
  // Fallback: any active chart for this milk type
  if (!chart) {
    chart = allCharts.find((c: any) => c.milk_type === milkType && c.status === 'active')
  }
  // Fallback: mixed → cow
  if (!chart && milkType === 'mixed') {
    chart = allCharts.find((c: any) => c.milk_type === 'cow' && c.status === 'active' && c.is_default)
    if (!chart) chart = allCharts.find((c: any) => c.milk_type === 'cow' && c.status === 'active')
  }

  if (!chart) {
    return { rate: 0, bonus: 0, penalty: 0, chartId: '', chartName: '', error: `No active rate chart for ${milkType}` }
  }

  return calculateRateFromChart(chart, fat, snf)
}
