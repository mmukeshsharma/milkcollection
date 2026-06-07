/**
 * sales-local.ts
 * Client-side service — milk sales stored in IndexedDB.
 */

import { STORES, dbGetAll, dbGet, dbPut, dbDelete, dbDeleteByIndex, generateId } from '@/lib/local-db'
import { passbookLocal } from '@/lib/passbook-local'

export type SaleRecord = {
  id: string
  customer_id?: string
  buyer_name: string
  sale_date: string
  milk_type: 'cow' | 'buffalo' | 'mixed'
  quantity_liters: number
  rate_per_liter: number
  total_amount: number
  created_at: string
  // Joined
  customers?: { name: string; customer_code: string }
}

export async function addSaleEntry(data: Omit<SaleRecord, 'id' | 'created_at' | 'total_amount' | 'customers'>): Promise<{ success: boolean; sale?: SaleRecord; error?: string }> {
  try {
    let resolvedCustomerId: string | undefined

    if (data.customer_id) {
      const { resolveCustomer } = await import('@/lib/customers-local')
      const customer = await resolveCustomer(data.customer_id)
      resolvedCustomerId = customer?.id
    }

    const total_amount = Number((data.quantity_liters * data.rate_per_liter).toFixed(2))
    const now = new Date().toISOString()

    const record: SaleRecord = {
      ...data,
      id:          generateId(),
      customer_id: resolvedCustomerId,
      total_amount,
      created_at:  now,
    }

    await dbPut(STORES.sales, record)

    // If linked to a customer, create passbook debit entry
    if (resolvedCustomerId) {
      const milkTypeLabel = data.milk_type === 'cow' ? 'Cow' : data.milk_type === 'buffalo' ? 'Buf' : data.milk_type === 'mixed' ? 'Mix' : 'NA'
      const particularsText = `${milkTypeLabel} Milk Sale - ${data.buyer_name} ${data.quantity_liters}L @Rs ${data.rate_per_liter}/L`

      await passbookLocal.addEntry({
        customer_id:      resolvedCustomerId,
        transaction_date: data.sale_date,
        transaction_type: 'sale',
        reference_id:     record.id,
        particulars:      particularsText,
        credit_amount:    0,
        debit_amount:     total_amount,
      })
    }

    return { success: true, sale: record }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getRecentSales(limit = 10): Promise<{ sales: SaleRecord[]; error?: string }> {
  try {
    const { getCustomers } = await import('@/lib/customers-local')
    const [all, { customers }] = await Promise.all([
      dbGetAll<SaleRecord>(STORES.sales),
      getCustomers(),
    ])

    const custMap = new Map(customers.map(c => [c.id, c]))

    const sorted = all
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
      .map(s => ({
        ...s,
        customers: s.customer_id && custMap.get(s.customer_id)
          ? { name: custMap.get(s.customer_id)!.name, customer_code: custMap.get(s.customer_id)!.customer_code }
          : undefined,
      }))

    return { sales: sorted }
  } catch (e: any) {
    return { sales: [], error: e.message }
  }
}

export async function deleteSaleEntry(id: string, role?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (role && role !== 'admin') return { success: false, error: 'Unauthorized: Only administrators can delete milk sale entries.' }
    await dbDelete(STORES.sales, id)
    await dbDeleteByIndex(STORES.passbook, 'reference_id', id)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteMultipleSales(ids: string[], role?: string): Promise<{ success: boolean; error?: string }> {
  for (const id of ids) {
    const res = await deleteSaleEntry(id, role)
    if (!res.success) return res
  }
  return { success: true }
}
