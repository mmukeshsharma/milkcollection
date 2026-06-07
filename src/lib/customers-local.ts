/**
 * customers-local.ts
 * Client-side service — data stored in IndexedDB on the device.
 * MongoDB is NOT used for customers.
 */

import {
  STORES, dbGetAll, dbGet, dbPut, dbDelete, dbDeleteByIndex, dbCount, generateId
} from '@/lib/local-db'

export type CustomerRecord = {
  id: string
  customer_code: string
  name: string
  mobile: string
  address: string
  village: string
  aadhaar_number?: string
  joining_date?: string
  milk_type_preference: 'cow' | 'buffalo' | 'mixed'
  active_status: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export async function getCustomers(): Promise<{ customers: CustomerRecord[]; error?: string }> {
  try {
    const all = await dbGetAll<CustomerRecord>(STORES.customers)
    const sorted = all.sort((a, b) => {
      const timeA = new Date(a.updated_at || a.created_at || 0).getTime()
      const timeB = new Date(b.updated_at || b.created_at || 0).getTime()
      return timeB - timeA
    })
    return { customers: sorted }
  } catch (e: any) {
    return { customers: [], error: e.message }
  }
}

export async function getCustomerById(id: string): Promise<CustomerRecord | undefined> {
  return dbGet<CustomerRecord>(STORES.customers, id)
}

export async function addCustomer(data: Omit<CustomerRecord, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; customer?: CustomerRecord; error?: string }> {
  try {
    const all = await dbGetAll<CustomerRecord>(STORES.customers)
    if (all.find(c => c.customer_code.trim() === data.customer_code.trim())) {
      return { success: false, error: `Customer with code ${data.customer_code} already exists.` }
    }

    const now = new Date().toISOString()
    const record: CustomerRecord = {
      ...data,
      id: generateId(),
      created_at: now,
      updated_at: now,
    }
    await dbPut(STORES.customers, record)
    return { success: true, customer: record }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateCustomer(id: string, updates: Partial<CustomerRecord>): Promise<{ success: boolean; customer?: CustomerRecord; error?: string }> {
  try {
    const existing = await dbGet<CustomerRecord>(STORES.customers, id)
    if (!existing) return { success: false, error: 'Customer not found' }

    const updated: CustomerRecord = { ...existing, ...updates, id, updated_at: new Date().toISOString() }
    await dbPut(STORES.customers, updated)
    return { success: true, customer: updated }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await dbDelete(STORES.customers, id)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteMultipleCustomers(ids: string[]): Promise<{ success: boolean; error?: string }> {
  for (const id of ids) {
    const res = await deleteCustomer(id)
    if (!res.success) return res
  }
  return { success: true }
}

export async function getCustomerCount(): Promise<number> {
  return dbCount(STORES.customers)
}

/** Resolve a customer from either an id or "CODE - Name" display string */
export async function resolveCustomer(input: string): Promise<CustomerRecord | undefined> {
  const trimmed = input.trim()
  if (!trimmed) return undefined

  // Try direct id lookup
  const byId = await dbGet<CustomerRecord>(STORES.customers, trimmed)
  if (byId) return byId

  // Try customer_code prefix ("CODE - Name")
  const code = trimmed.split(' - ')[0]?.trim()
  const all = await dbGetAll<CustomerRecord>(STORES.customers)
  return all.find(c => c.customer_code === code)
}
