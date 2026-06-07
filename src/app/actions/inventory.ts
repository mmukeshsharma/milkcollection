'use server'

import { connectToDatabase } from '@/lib/mongodb'
import { Product, ItemSale, PassbookEntry, Customer } from '@/models'
import mongoose from 'mongoose'
import { revalidatePath } from 'next/cache'

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

export async function addProduct(data: InventoryItem) {
  try {
    await connectToDatabase()
    const product = await Product.create(data)

    revalidatePath('/inventory')
    return { success: true, product: JSON.parse(JSON.stringify(product)) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to add product'
    return { error: message }
  }
}

export async function getProducts() {
  try {
    await connectToDatabase()
    const data = await Product.find({}).sort({ updated_at: -1 })
    return { products: JSON.parse(JSON.stringify(data)) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch products'
    return { products: [], error: message }
  }
}

export async function restoreProducts(products: any[]) {
  try {
    await connectToDatabase()
    for (const item of products) {
      const productId = item.id || item._id
      const dataToSave = {
        product_name: item.product_name,
        description: item.description,
        price: item.price,
        stock_quantity: item.stock_quantity,
        updated_at: new Date(item.updated_at || Date.now())
      }
      if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        await Product.findByIdAndUpdate(productId, dataToSave, { upsert: true, new: true })
      } else {
        await Product.create(dataToSave)
      }
    }
    revalidatePath('/inventory')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to restore products'
    return { error: message }
  }
}

export async function createItemSale(data: ItemSale) {
  try {
    await connectToDatabase()

    const customerInput = String(data.customer_id).trim()
    
    // No longer verifying customer_id from MongoDB Customer collection.
    // We will save customerInput (UUID or 'custom') directly as a string.

    const productInput = String(data.product_id).trim()
    let resolvedProductId = productInput
    if (!mongoose.Types.ObjectId.isValid(productInput)) {
      const product = await Product.findOne({ product_name: productInput })
      if (!product) {
        return { error: 'Please select a valid product' }
      }
      resolvedProductId = product.id
    }

    const product = await Product.findById(resolvedProductId)
    if (!product) {
      return { error: 'Product not found' }
    }

    if (product.stock_quantity < data.quantity) {
      return { error: `Insufficient stock. Only ${product.stock_quantity} units available.` }
    }

    const calculatedTotal = Number((data.quantity * data.price_per_item).toFixed(2))

    // Create item sale
    const sale = await ItemSale.create({
      customer_id: customerInput,
      product_id: resolvedProductId,
      quantity: data.quantity,
      price_per_item: data.price_per_item,
      total_amount: calculatedTotal,
      sale_date: data.sale_date,
    })

    // Deduct stock
    product.stock_quantity -= data.quantity
    product.updated_at = new Date()
    
    if (product.stock_quantity <= 0) {
      await Product.findByIdAndDelete(resolvedProductId)
    } else {
      await product.save()
    }

    revalidatePath('/inventory')
    revalidatePath('/members')
    revalidatePath('/dashboard')
    return { success: true, sale: JSON.parse(JSON.stringify(sale)) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create item sale'
    return { error: message }
  }
}

export async function getItemSales() {
  try {
    await connectToDatabase()
    // Do not populate customer_id from MongoDB Customer since customers are in IndexedDB
    // Auto-delete item sales older than 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    try {
      await ItemSale.deleteMany({ created_at: { $lt: sevenDaysAgo } })
    } catch (err) {
      console.error('Failed to auto-delete old item sales:', err)
    }

    const data = await ItemSale.find({})
      .populate('product_id', 'product_name')
      .sort({ created_at: -1 })

    const serialized = data.map(item => {
      const obj = item.toJSON()
      obj.inventory = obj.product_id
      return obj
    })

    return { itemSales: JSON.parse(JSON.stringify(serialized)) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch item sales'
    return { itemSales: [], error: message }
  }
}

export async function updateProduct(id: string, data: Partial<InventoryItem>) {
  try {
    const { getSessionUserRole } = await import('@/app/actions/auth')
    const role = (await getSessionUserRole()) as string | null
    if (role !== 'admin' && role !== 'super_admin' && role !== 'agent') {
      return { error: 'Unauthorized: Only administrators can edit products.' }
    }

    await connectToDatabase()

    if (data.stock_quantity !== undefined && data.stock_quantity <= 0) {
      await Product.findByIdAndDelete(id)
      revalidatePath('/inventory')
      return { success: true, deleted: true }
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { ...data, updated_at: new Date() },
      { new: true }
    )

    revalidatePath('/inventory')
    return { success: true, product: JSON.parse(JSON.stringify(product)) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update product'
    return { error: message }
  }
}

export async function deleteProduct(id: string) {
  try {
    const { getSessionUserRole } = await import('@/app/actions/auth')
    const role = (await getSessionUserRole()) as string | null
    if (role !== 'admin' && role !== 'super_admin' && role !== 'agent') {
      return { error: 'Unauthorized: Only administrators can delete products.' }
    }

    await connectToDatabase()
    await Product.findByIdAndDelete(id)

    revalidatePath('/inventory')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete product'
    return { error: message }
  }
}

export async function deleteItemSale(id: string) {
  try {
    const { getSessionUserRole } = await import('@/app/actions/auth')
    const role = (await getSessionUserRole()) as string | null
    if (role !== 'admin' && role !== 'super_admin' && role !== 'agent') {
      return { error: 'Unauthorized: Only administrators can delete item sales.' }
    }

    await connectToDatabase()
    const sale = await ItemSale.findById(id)
    if (sale) {
      // Revert stock
      const product = await Product.findById(sale.product_id)
      if (product) {
        product.stock_quantity += sale.quantity
        product.updated_at = new Date()
        await product.save()
      }
      
      // Passbook entry delete is handled client-side in IndexedDB if needed.
      await ItemSale.findByIdAndDelete(id)
    }

    revalidatePath('/inventory')
    revalidatePath('/members')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete item sale'
    return { error: message }
  }
}

export async function deleteMultipleProducts(ids: string[]) {
  try {
    for (const id of ids) {
      const res = await deleteProduct(id)
      if (res?.error) return { error: res.error }
    }
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete selected products' }
  }
}

export async function deleteMultipleItemSales(ids: string[]) {
  try {
    for (const id of ids) {
      const res = await deleteItemSale(id)
      if (res?.error) return { error: res.error }
    }
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete selected store sales' }
  }
}

export async function updateItemSale(
  id: string,
  data: { quantity: number; sale_date: string; price_per_item: number }
) {
  try {
    const { getSessionUserRole } = await import('@/app/actions/auth')
    const role = (await getSessionUserRole()) as string | null
    if (role !== 'admin' && role !== 'super_admin' && role !== 'agent') {
      return { error: 'Unauthorized: Only administrators can edit store sales.' }
    }

    await connectToDatabase()
    const sale = await ItemSale.findById(id)
    if (!sale) {
      return { error: 'Sale record not found' }
    }

    const product = await Product.findById(sale.product_id)
    if (!product) {
      return { error: 'Product not found' }
    }

    const qtyDiff = data.quantity - sale.quantity
    if (qtyDiff > 0 && product.stock_quantity < qtyDiff) {
      return { error: `Insufficient stock to increase sale. Only ${product.stock_quantity} units available.` }
    }

    // Update product stock
    product.stock_quantity -= qtyDiff
    product.updated_at = new Date()
    
    if (product.stock_quantity <= 0) {
      await Product.findByIdAndDelete(sale.product_id)
    } else {
      await product.save()
    }

    // Update sale record
    sale.quantity = data.quantity
    sale.price_per_item = data.price_per_item
    sale.total_amount = Number((data.quantity * data.price_per_item).toFixed(2))
    sale.sale_date = data.sale_date
    await sale.save()

    revalidatePath('/inventory')
    revalidatePath('/members')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update store sale'
    return { error: message }
  }
}

export async function deductProductStock(productId: string, quantity: number) {
  try {
    await connectToDatabase()
    const product = await Product.findById(productId)
    if (!product) {
      return { error: 'Product not found' }
    }

    if (product.stock_quantity < quantity) {
      return { error: `Insufficient stock. Only ${product.stock_quantity} units available.` }
    }

    product.stock_quantity -= quantity
    product.updated_at = new Date()

    if (product.stock_quantity <= 0) {
      await Product.findByIdAndDelete(productId)
    } else {
      await product.save()
    }

    revalidatePath('/inventory')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to deduct stock' }
  }
}

export async function refundProductStock(productId: string, quantity: number) {
  try {
    await connectToDatabase()
    const product = await Product.findById(productId)
    if (!product) {
      return { success: true, info: 'Product no longer exists in stock' }
    }

    product.stock_quantity += quantity
    product.updated_at = new Date()
    await product.save()

    revalidatePath('/inventory')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to refund stock' }
  }
}

export async function adjustProductStock(productId: string, quantityDiff: number) {
  try {
    await connectToDatabase()
    const product = await Product.findById(productId)
    if (!product) {
      return { error: 'Product not found' }
    }

    if (quantityDiff > 0 && product.stock_quantity < quantityDiff) {
      return { error: `Insufficient stock to increase quantity. Only ${product.stock_quantity} units available.` }
    }

    product.stock_quantity -= quantityDiff
    product.updated_at = new Date()

    if (product.stock_quantity <= 0) {
      await Product.findByIdAndDelete(productId)
    } else {
      await product.save()
    }

    revalidatePath('/inventory')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to adjust stock' }
  }
}
