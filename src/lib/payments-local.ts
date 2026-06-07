/**
 * payments-local.ts
 * Client-side service — payments stored in IndexedDB.
 */

import { STORES, dbGetAll, dbGet, dbPut, dbDelete, dbDeleteByIndex, generateId } from '@/lib/local-db'
import { passbookLocal } from '@/lib/passbook-local'

export type PaymentRecord = {
  id: string
  customer_id: string
  payment_date: string
  payment_type: 'advance' | 'settlement'
  amount: number
  payment_method: 'cash' | 'upi' | 'bank' | 'gpay' | 'phonepe' | 'paytm'
  reference_no?: string
  notes?: string
  created_at: string
  // Joined
  customers?: { name: string; customer_code: string }
}

export async function addPaymentEntry(data: Omit<PaymentRecord, 'id' | 'created_at' | 'customers'> & { customer_display?: string }): Promise<{ success: boolean; payment?: PaymentRecord; error?: string }> {
  try {
    const { resolveCustomer } = await import('@/lib/customers-local')
    const custInput = String(data.customer_id || data.customer_display || '').trim()
    const customer = await resolveCustomer(custInput)
    if (!customer) return { success: false, error: 'Please select a valid customer' }

    const now = new Date().toISOString()
    const record: PaymentRecord = {
      ...data,
      id:          generateId(),
      customer_id: customer.id,
      created_at:  now,
    }

    await dbPut(STORES.payments, record)

    // Passbook debit entry
    const getMethodLabel = (method: string) => {
      switch (method) {
        case 'cash': return 'Cash'
        case 'upi': return 'UPI'
        case 'bank': return 'Bank'
        case 'gpay': return 'Gpay'
        case 'phonepe': return 'PhonePe'
        case 'paytm': return 'Paytm'
        default: return method.toUpperCase()
      }
    }
    const particularsText = `${getMethodLabel(data.payment_method)} - Payment`

    await passbookLocal.addEntry({
      customer_id:      customer.id,
      transaction_date: data.payment_date,
      transaction_type: data.payment_type === 'advance' ? 'advance' : 'payment',
      reference_id:     record.id,
      particulars:      particularsText,
      credit_amount:    0,
      debit_amount:     data.amount,
    })

    return { success: true, payment: record }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getRecentPayments(limit = 10): Promise<{ payments: PaymentRecord[]; error?: string }> {
  try {
    const { getCustomers } = await import('@/lib/customers-local')
    const [allPayments, { customers }] = await Promise.all([
      dbGetAll<PaymentRecord>(STORES.payments),
      getCustomers(),
    ])

    const custMap = new Map(customers.map(c => [c.id, c]))

    const sorted = allPayments
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
      .map(p => ({
        ...p,
        customers: custMap.get(p.customer_id)
          ? { name: custMap.get(p.customer_id)!.name, customer_code: custMap.get(p.customer_id)!.customer_code }
          : undefined,
      }))

    return { payments: sorted }
  } catch (e: any) {
    return { payments: [], error: e.message }
  }
}

export async function getAllPayments(): Promise<{ payments: PaymentRecord[]; error?: string }> {
  try {
    const { getCustomers } = await import('@/lib/customers-local')
    const [all, { customers }] = await Promise.all([
      dbGetAll<PaymentRecord>(STORES.payments),
      getCustomers(),
    ])
    const custMap = new Map(customers.map(c => [c.id, c]))
    const mapped = all
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .map(p => ({
        ...p,
        customers: custMap.get(p.customer_id)
          ? { name: custMap.get(p.customer_id)!.name, customer_code: custMap.get(p.customer_id)!.customer_code }
          : undefined,
      }))
    return { payments: mapped }
  } catch (e: any) {
    return { payments: [], error: e.message }
  }
}

export async function deletePaymentEntry(id: string, role?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (role && role !== 'admin') return { success: false, error: 'Unauthorized: Only administrators can delete payment entries.' }
    await dbDelete(STORES.payments, id)
    await dbDeleteByIndex(STORES.passbook, 'reference_id', id)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteMultiplePayments(ids: string[], role?: string): Promise<{ success: boolean; error?: string }> {
  for (const id of ids) {
    const res = await deletePaymentEntry(id, role)
    if (!res.success) return res
  }
  return { success: true }
}
