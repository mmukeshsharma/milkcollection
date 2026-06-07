/**
 * passbook-local.ts
 * Client-side service — passbook / ledger stored in IndexedDB.
 */

import { STORES, dbGetAll, dbGet, dbPut, dbDelete, dbDeleteByIndex, dbGetByIndex, generateId } from '@/lib/local-db'

export type PassbookRecord = {
  id: string
  customer_id: string
  transaction_date: string
  transaction_type: 'purchase' | 'sale' | 'payment' | 'advance' | 'adjustment'
  reference_id?: string
  particulars: string
  credit_amount: number
  debit_amount: number
  running_balance: number
  created_at: string
}

export const passbookLocal = {
  async addEntry(data: Omit<PassbookRecord, 'id' | 'running_balance' | 'created_at'>): Promise<PassbookRecord> {
    const record: PassbookRecord = {
      ...data,
      id: generateId(),
      running_balance: 0, // Calculated on read
      created_at: new Date().toISOString(),
    }
    await dbPut(STORES.passbook, record)
    return record
  },

  async getPassbook(customerId: string): Promise<{ passbook: PassbookRecord[]; error?: string }> {
    try {
      const entries = await dbGetByIndex<PassbookRecord>(STORES.passbook, 'customer_id', customerId)

      // Sort by date ascending, then created_at
      const sorted = entries.sort((a, b) => {
        const d = a.transaction_date.localeCompare(b.transaction_date)
        return d !== 0 ? d : a.created_at.localeCompare(b.created_at)
      })

      // Calculate running balance
      let balance = 0
      const passbook = sorted.map(entry => {
        const credit = Number(entry.credit_amount || 0)
        const debit  = Number(entry.debit_amount  || 0)
        balance = balance + credit - debit
        return { ...entry, running_balance: Number(balance.toFixed(2)) }
      })

      return { passbook }
    } catch (e: any) {
      return { passbook: [], error: e.message }
    }
  },

  async getAllPassbook(): Promise<PassbookRecord[]> {
    return dbGetAll<PassbookRecord>(STORES.passbook)
  },

  async deleteByReference(referenceId: string): Promise<void> {
    await dbDeleteByIndex(STORES.passbook, 'reference_id', referenceId)
  },
}
