/**
 * item-sales-local.ts
 * Client-side local storage manager for store sales (Cattle Feed & Supplements).
 * Frees MongoDB from storing item sales records.
 */

export interface LocalItemSale {
  id: string
  customer_id: string
  product_id: string
  product_name: string
  quantity: number
  price_per_item: number
  total_amount: number
  sale_date: string
  created_at: string
}

const STORAGE_KEY = 'sharma_dairy_store_sales'

export const itemSalesLocal = {
  // Get all sales, with auto-delete for entries older than 7 days
  getAll: (): LocalItemSale[] => {
    if (typeof window === 'undefined') return []
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY)
      if (!dataStr) return []
      
      const sales: LocalItemSale[] = JSON.parse(dataStr)
      
      // Auto-delete entries older than 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const filteredSales = sales.filter((s) => {
        const entryDate = new Date(s.created_at || s.sale_date)
        return entryDate >= sevenDaysAgo
      })
      
      if (filteredSales.length !== sales.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSales))
      }
      
      return filteredSales
    } catch (e) {
      console.error('Failed to parse store sales from localStorage:', e)
      return []
    }
  },

  // Save a new sale record
  add: (sale: Omit<LocalItemSale, 'id' | 'created_at'>): LocalItemSale => {
    const sales = itemSalesLocal.getAll()
    const newSale: LocalItemSale = {
      ...sale,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      created_at: new Date().toISOString()
    }
    sales.unshift(newSale) // Add to top
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales))
    return newSale
  },

  // Delete a sale record
  delete: (id: string): void => {
    const sales = itemSalesLocal.getAll()
    const filtered = sales.filter((s) => s.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  },

  // Delete multiple sale records
  deleteMultiple: (ids: string[]): void => {
    const sales = itemSalesLocal.getAll()
    const filtered = sales.filter((s) => !ids.includes(s.id))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  },

  // Update a sale record
  update: (id: string, data: { quantity: number; sale_date: string; price_per_item: number }): LocalItemSale | null => {
    const sales = itemSalesLocal.getAll()
    const index = sales.findIndex((s) => s.id === id)
    if (index === -1) return null
    
    const updated = {
      ...sales[index],
      quantity: data.quantity,
      price_per_item: data.price_per_item,
      total_amount: Number((data.quantity * data.price_per_item).toFixed(2)),
      sale_date: data.sale_date,
    }
    
    sales[index] = updated
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales))
    return updated
  }
}
