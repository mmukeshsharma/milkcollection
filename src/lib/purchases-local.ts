/**
 * purchases-local.ts
 * Client-side service — data stored in IndexedDB on the device.
 * Formula: Rate = (FAT × fat_step_rate) + bonus_amount
 */

import {
  STORES, dbGetAll, dbGet, dbPut, dbDelete, dbDeleteByIndex, generateId,
  getLocalRateForPurchase
} from '@/lib/local-db'
import { passbookLocal } from '@/lib/passbook-local'

export type PurchaseRecord = {
  id: string
  customer_id: string
  purchase_date: string
  shift: 'morning' | 'evening'
  milk_type: 'cow' | 'buffalo' | 'mixed'
  quantity_liters: number
  fat_percentage: number
  snf_percentage: number
  rate_per_liter: number
  total_amount: number
  rate_chart_id?: string
  bonus_amount?: number
  penalty_amount?: number
  created_at: string
  // Joined
  customers?: { name: string; customer_code: string }
}

export async function addPurchaseEntry(data: Omit<PurchaseRecord, 'id' | 'created_at' | 'rate_per_liter' | 'total_amount'> & { customer_display?: string }): Promise<{ success: boolean; purchase?: PurchaseRecord; error?: string; rate?: number }> {
  try {
    // Resolve customer
    const { resolveCustomer } = await import('@/lib/customers-local')
    const custInput = String(data.customer_id || data.customer_display || '').trim()
    const customer = await resolveCustomer(custInput)
    if (!customer) return { success: false, error: 'Please select a valid customer' }

    // Calculate rate using IndexedDB rate chart
    const rateLookup = await getLocalRateForPurchase(data.milk_type, data.fat_percentage, data.snf_percentage)
    if (rateLookup.error) return { success: false, error: rateLookup.error }

    const calculatedRate   = rateLookup.rate
    const calculatedAmount = Number((data.quantity_liters * calculatedRate).toFixed(2))
    const now              = new Date().toISOString()

    const record: PurchaseRecord = {
      ...data,
      id:            generateId(),
      customer_id:   customer.id,
      rate_per_liter: calculatedRate,
      total_amount:  calculatedAmount,
      rate_chart_id: rateLookup.chartId,
      bonus_amount:  rateLookup.bonus,
      penalty_amount: rateLookup.penalty,
      created_at:    now,
    }

    await dbPut(STORES.purchases, record)

    // Passbook entry — credit to customer ledger (dairy owes the farmer)
    const milkTypeLabel = data.milk_type === 'cow' ? 'Cow' : data.milk_type === 'buffalo' ? 'Buf' : 'Mix'
    const shiftLabel = data.shift === 'morning' ? 'Morning' : 'Evening'
    const particularsText = `${milkTypeLabel} Milk ${shiftLabel} Purchase ${data.quantity_liters}L @Rs ${calculatedRate}/L`

    await passbookLocal.addEntry({
      customer_id:       customer.id,
      transaction_date:  data.purchase_date,
      transaction_type:  'purchase',
      reference_id:      record.id,
      particulars:       particularsText,
      credit_amount:     calculatedAmount,
      debit_amount:      0,
    })

    return { success: true, purchase: record, rate: calculatedRate }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getRecentPurchases(limit = 10): Promise<{ purchases: PurchaseRecord[]; error?: string }> {
  try {
    const { getCustomers } = await import('@/lib/customers-local')
    const [allPurchases, { customers }] = await Promise.all([
      dbGetAll<PurchaseRecord>(STORES.purchases),
      getCustomers(),
    ])

    const custMap = new Map(customers.map(c => [c.id, c]))

    const sorted = allPurchases
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
      .map(p => ({
        ...p,
        customers: custMap.get(p.customer_id)
          ? { name: custMap.get(p.customer_id)!.name, customer_code: custMap.get(p.customer_id)!.customer_code }
          : undefined,
      }))

    return { purchases: sorted }
  } catch (e: any) {
    return { purchases: [], error: e.message }
  }
}

export async function getAllPurchases(): Promise<{ purchases: PurchaseRecord[]; error?: string }> {
  try {
    const { getCustomers } = await import('@/lib/customers-local')
    const [all, { customers }] = await Promise.all([
      dbGetAll<PurchaseRecord>(STORES.purchases),
      getCustomers(),
    ])
    const custMap = new Map(customers.map(c => [c.id, c]))
    const mapped = all
      .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())
      .map(p => ({
        ...p,
        customers: custMap.get(p.customer_id)
          ? { name: custMap.get(p.customer_id)!.name, customer_code: custMap.get(p.customer_id)!.customer_code }
          : undefined,
      }))
    return { purchases: mapped }
  } catch (e: any) {
    return { purchases: [], error: e.message }
  }
}

export async function deletePurchaseEntry(id: string, role?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (role && role !== 'admin') return { success: false, error: 'Unauthorized: Only administrators can delete milk purchase entries.' }
    await dbDelete(STORES.purchases, id)
    await dbDeleteByIndex(STORES.passbook, 'reference_id', id)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteMultiplePurchases(ids: string[], role?: string): Promise<{ success: boolean; error?: string }> {
  for (const id of ids) {
    const res = await deletePurchaseEntry(id, role)
    if (!res.success) return res
  }
  return { success: true }
}
