'use server'

/**
 * inventory.ts — SERVER ACTION STUBS
 * ⚠️ Product and stock data is now stored in IndexedDB (local device storage).
 * UI components should import directly from '@/lib/products-local' instead.
 */

export type InventoryItem = {
  id?: string
  product_name: string
  description?: string
  price: number
  stock_quantity: number
}

export type ItemSale = {
  id?: string
  customer_id: string
  product_id: string
  quantity: number
  price_per_item: number
  total_amount: number
  sale_date: string
}

export async function addProduct() {
  return { error: 'Product data is stored locally on device. Use @/lib/products-local in client components.' }
}

export async function getProducts() {
  return { products: [], error: 'Product data is stored locally on device. Use @/lib/products-local in client components.' }
}

export async function restoreProducts() {
  return { error: 'Product data is stored locally on device. Use @/lib/products-local in client components.' }
}

export async function createItemSale() {
  return { error: 'Product sales are stored locally on device. Use @/lib/products-local in client components.' }
}

export async function getItemSales() {
  return { itemSales: [], error: 'Product sales are stored locally on device. Use @/lib/products-local in client components.' }
}

export async function deleteProduct() {
  return { error: 'Product data is stored locally on device. Use @/lib/products-local in client components.' }
}

export async function deleteMultipleProducts() {
  return { error: 'Product data is stored locally on device. Use @/lib/products-local in client components.' }
}

export async function updateProduct() {
  return { error: 'Product data is stored locally on device. Use @/lib/products-local in client components.' }
}

export async function deductProductStock() {
  return { error: 'Product data is stored locally on device. Use @/lib/products-local in client components.' }
}
