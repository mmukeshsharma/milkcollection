'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCustomer, deleteCustomer } from '@/lib/customers-local'
import { DeleteButton } from '@/components/ui/delete-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type Customer = {
  id: string
  customer_code: string
  name: string
  mobile: string
  address: string
  village: string
  aadhaar_number?: string | null
  milk_type_preference: 'cow' | 'buffalo' | 'mixed'
  active_status: boolean
  notes?: string | null
}

export function CustomerRowActions({ customer }: { customer: Customer }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: customer.name,
    mobile: customer.mobile,
    address: customer.address ?? '',
    village: customer.village ?? '',
    milk_type_preference: customer.milk_type_preference,
  })

  async function onSave() {
    setError('')
    if (!/^\d{10}$/.test(form.mobile)) {
      setError('Mobile number must be exactly 10 digits containing only numbers')
      return
    }
    setSaving(true)
    const res = await updateCustomer(customer.id, form)
    setSaving(false)
    if (res?.error) {
      setError(res.error)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="flex justify-end gap-1 sm:gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button variant="ghost" size="sm" className="text-blue-600">
              Edit
            </Button>
          }
        />
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update customer details and save changes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Mobile</Label>
              <Input
                value={form.mobile}
                maxLength={10}
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault()
                  }
                }}
                onChange={(e) => {
                  const numeric = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setForm((f) => ({ ...f, mobile: numeric }))
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Village</Label>
              <Input value={form.village} onChange={(e) => setForm((f) => ({ ...f, village: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Milk Preference</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={form.milk_type_preference}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    milk_type_preference: e.target.value as 'cow' | 'buffalo' | 'mixed',
                  }))
                }
              >
                <option value="cow">Cow</option>
                <option value="buffalo">Buffalo</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="w-full sm:w-auto" onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button
        variant="ghost"
        size="sm"
        className="text-slate-600"
        onClick={() => router.push(`/passbook?customer_id=${customer.id}`)}
      >
        Passbook
      </Button>
      <DeleteButton
        id={customer.id}
        deleteAction={deleteCustomer}
        confirmMessage={`Are you sure you want to delete customer ${customer.name} (${customer.customer_code})?`}
        successMessage="Customer deleted successfully."
      />
    </div>
  )
}
