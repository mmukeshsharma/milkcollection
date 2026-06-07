/**
 * products-local.ts
 * Client-side local database service — data stored in IndexedDB on the device.
 * MongoDB is NOT used for products or stock.
 */

import {
  STORES, dbGetAll, dbGet, dbPut, dbDelete, generateId
} from '@/lib/local-db'

export type ProductRecord = {
  id: string
  product_name: string
  description?: string
  price: number
  stock_quantity: number
  created_at: string
  updated_at: string
}

export async function getProductsLocal(): Promise<{ products: ProductRecord[]; error?: string }> {
  try {
    const all = await dbGetAll<ProductRecord>(STORES.products)
    const sorted = all.sort((a, b) => {
      const timeA = new Date(a.updated_at || a.created_at || 0).getTime()
      const timeB = new Date(b.updated_at || b.created_at || 0).getTime()
      return timeB - timeA
    })
    return { products: sorted }
  } catch (e: any) {
    return { products: [], error: e.message }
  }
}

export async function getProductById(id: string): Promise<ProductRecord | undefined> {
  return dbGet<ProductRecord>(STORES.products, id)
}

export async function addProductLocal(data: Omit<ProductRecord, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; product?: ProductRecord; error?: string }> {
  try {
    const all = await dbGetAll<ProductRecord>(STORES.products)
    if (all.find(p => p.product_name.trim().toLowerCase() === data.product_name.trim().toLowerCase())) {
      return { success: false, error: `Product with name "${data.product_name}" already exists.` }
    }

    const now = new Date().toISOString()
    const record: ProductRecord = {
      ...data,
      id: generateId(),
      created_at: now,
      updated_at: now,
    }
    await dbPut(STORES.products, record)
    return { success: true, product: record }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateProductLocal(id: string, updates: Partial<ProductRecord>): Promise<{ success: boolean; product?: ProductRecord; error?: string }> {
  try {
    const existing = await dbGet<ProductRecord>(STORES.products, id)
    if (!existing) return { success: false, error: 'Product not found' }

    const updated: ProductRecord = { ...existing, ...updates, id, updated_at: new Date().toISOString() }
    await dbPut(STORES.products, updated)
    return { success: true, product: updated }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteProductLocal(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await dbDelete(STORES.products, id)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteMultipleProductsLocal(ids: string[]): Promise<{ success: boolean; error?: string }> {
  for (const id of ids) {
    const res = await deleteProductLocal(id)
    if (!res.success) return res
  }
  return { success: true }
}

export async function deductProductStockLocal(id: string, quantity: number): Promise<{ success: boolean; error?: string }> {
  try {
    const product = await dbGet<ProductRecord>(STORES.products, id)
    if (!product) {
      return { success: false, error: 'Product not found' }
    }
    if (product.stock_quantity < quantity) {
      return { success: false, error: `Insufficient stock. Only ${product.stock_quantity} units available.` }
    }
    product.stock_quantity -= quantity
    product.updated_at = new Date().toISOString()
    
    if (product.stock_quantity <= 0) {
      await dbDelete(STORES.products, id)
    } else {
      await dbPut(STORES.products, product)
    }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function refundProductStockLocal(id: string, quantity: number): Promise<{ success: boolean; error?: string }> {
  try {
    const product = await dbGet<ProductRecord>(STORES.products, id)
    if (!product) {
      return { success: true } // If product was deleted, treat as success/no-op
    }
    product.stock_quantity += quantity
    product.updated_at = new Date().toISOString()
    await dbPut(STORES.products, product)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function adjustProductStockLocal(id: string, qtyDiff: number): Promise<{ success: boolean; error?: string }> {
  try {
    const product = await dbGet<ProductRecord>(STORES.products, id)
    if (!product) {
      return { success: false, error: 'Product not found' }
    }
    if (product.stock_quantity < qtyDiff) {
      return { success: false, error: `Insufficient stock. Only ${product.stock_quantity} units available.` }
    }
    product.stock_quantity -= qtyDiff
    product.updated_at = new Date().toISOString()
    await dbPut(STORES.products, product)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
