'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { deleteProduct, deleteMultipleProducts, updateProduct } from '@/app/actions/inventory'
import { getSessionUserRole } from '@/app/actions/auth'
import { Pagination } from '@/components/ui/pagination'
import { useLanguage } from '@/context/LanguageContext'

export function ProductsList({ products: initialProducts }: { products: any[] }) {
  const router = useRouter()
  const { locale } = useLanguage()
  const [role, setRole] = useState<string | null>(null)
  
  // Selection and Pagination states
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState(0)
  const [editStock, setEditStock] = useState(0)
  const [editDescription, setEditDescription] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    async function loadRole() {
      const userRole = await getSessionUserRole()
      setRole(userRole)
    }
    loadRole()
  }, [])

  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'agent'

  // Pagination bounds
  const totalItems = initialProducts.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const paginatedProducts = initialProducts.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedProducts.map((p) => p.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    }
  }

  const handleSingleDelete = async (id: string, name: string) => {
    if (!isAdmin) {
      alert('Only administrators can delete products.')
      return
    }
    if (confirm(`Are you sure you want to delete product "${name}"?`)) {
      const res = await deleteProduct(id)
      if (res?.error) {
        alert('Error: ' + res.error)
      } else {
        alert('Product deleted successfully.')
        router.refresh()
      }
    }
  }

  const handleBulkDelete = async () => {
    if (!isAdmin) return

    if (confirm(`Are you sure you want to delete the ${selectedIds.length} selected products?`)) {
      const res = await deleteMultipleProducts(selectedIds)
      if (res?.error) {
        alert('Error: ' + res.error)
      } else {
        alert('Selected products deleted successfully.')
        setSelectedIds([])
        setPage(1)
        router.refresh()
      }
    }
  }

  const startEdit = (product: any) => {
    setEditingProduct(product)
    setEditName(product.product_name)
    setEditPrice(product.price)
    setEditStock(product.stock_quantity)
    setEditDescription(product.description || '')
  }

  const handleUpdateProduct = async () => {
    if (!editingProduct) return
    setIsUpdating(true)
    const res = await updateProduct(editingProduct.id, {
      product_name: editName,
      price: editPrice,
      stock_quantity: editStock,
      description: editDescription,
    })
    setIsUpdating(false)

    if (res?.error) {
      alert('Error updating product: ' + res.error)
    } else {
      alert('Product updated successfully!')
      setEditingProduct(null)
      router.refresh()
    }
  }

  return (
    <div className="rounded-2xl border border-white/40 bg-white/75 shadow-xl backdrop-blur-xl relative overflow-hidden flex flex-col justify-between h-full">
      <div className="border-b border-slate-200/70 p-4 flex justify-between items-center bg-white/30">
        <h3 className="font-bold text-slate-800">
          {locale === 'hi' ? 'स्टॉक में उत्पाद' : 'Products in Stock'}
        </h3>
        {selectedIds.length > 0 && isAdmin && (
          <Button
            size="sm"
            onClick={handleBulkDelete}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-1 px-2.5 rounded-lg flex items-center gap-1 shadow"
          >
            🗑️ {locale === 'hi' ? `चयनित हटाएं (${selectedIds.length})` : `Delete Selected (${selectedIds.length})`}
          </Button>
        )}
      </div>

      <div className="p-4 space-y-3 pt-0 max-h-[380px] overflow-y-auto flex-grow">
        {/* Table header / Multi-select checkbox */}
        {paginatedProducts.length > 0 && isAdmin && (
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50/50 rounded-lg border border-slate-100 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedIds.includes(p.id))}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>{locale === 'hi' ? 'पृष्ठ पर सभी चुनें' : 'Select All on Page'}</span>
          </div>
        )}

        {paginatedProducts.map((p) => {
          const isChecked = selectedIds.includes(p.id)
          return (
            <div key={p.id} className={`flex justify-between items-center p-3 rounded-xl border border-blue-50/50 bg-white/50 hover:bg-slate-50/50 transition ${isChecked ? 'bg-blue-50/30' : ''}`}>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleSelectRow(p.id, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                )}
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">{p.product_name}</h4>
                  <p className="text-xs text-slate-500">{p.description || (locale === 'hi' ? 'कोई विवरण नहीं' : 'No description')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-700 block">Rs {p.price}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-block ${
                    p.stock_quantity > 10 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {p.stock_quantity} {locale === 'hi' ? 'उपलब्ध' : 'available'}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      onClick={() => startEdit(p)}
                      className="text-blue-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg p-1.5 h-8 w-8 flex items-center justify-center border border-transparent hover:border-blue-200"
                      title={locale === 'hi' ? 'उत्पाद संपादित करें' : 'Edit product'}
                    >
                      ✏️
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      onClick={() => handleSingleDelete(p.id, p.product_name)}
                      className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg p-1.5 h-8 w-8 flex items-center justify-center border border-transparent hover:border-rose-200"
                      title={locale === 'hi' ? 'उत्पाद हटाएं' : 'Delete product'}
                    >
                      🗑️
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {initialProducts.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-6">
            {locale === 'hi' ? 'अभी तक कोई उत्पाद पंजीकृत नहीं है।' : 'No products registered yet.'}
          </p>
        )}
      </div>

      <Pagination
        page={page}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onChangePage={(p) => { setPage(p); setSelectedIds([]); }}
        onChangeItemsPerPage={(sz) => { setItemsPerPage(sz); setSelectedIds([]); }}
        itemLabel={locale === 'hi' ? 'उत्पाद' : 'products'}
      />

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/95 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {locale === 'hi' ? 'उत्पाद संपादित करें' : 'Edit Product'}
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  {locale === 'hi' ? 'उत्पाद का नाम' : 'Product Name'}
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Product name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  {locale === 'hi' ? 'विवरण' : 'Description'}
                </label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    {locale === 'hi' ? 'मूल्य (Rs)' : 'Price (Rs)'}
                  </label>
                  <Input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    {locale === 'hi' ? 'स्टॉक मात्रा' : 'Stock Qty'}
                  </label>
                  <Input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingProduct(null)}
                className="bg-white border-slate-200"
              >
                {locale === 'hi' ? 'रद्द करें' : 'Cancel'}
              </Button>
              <Button
                onClick={handleUpdateProduct}
                disabled={isUpdating}
                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                {isUpdating ? (locale === 'hi' ? 'सहेज रहे हैं...' : 'Saving...') : (locale === 'hi' ? 'परिवर्तन सहेजें' : 'Save Changes')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
