'use server'

import { connectToDatabase } from '@/lib/mongodb'
import { MilkRateMatrix } from '@/models'
import { revalidatePath } from 'next/cache'

export type MilkRateMatrix = {
  id?: string
  milk_type: 'cow' | 'buffalo'
  fat_min: number
  fat_max: number
  snf_min: number
  snf_max: number
  rate_per_liter: number
  effective_from: string
  effective_to?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

async function checkOverlappingRates(rate: Omit<MilkRateMatrix, 'id' | 'created_at' | 'updated_at'>, excludeId?: string): Promise<string | null> {
  await connectToDatabase()
  
  // Fetch all active rates of the same milk type
  const existingRates = await MilkRateMatrix.find({
    milk_type: rate.milk_type,
    is_active: true
  })

  const s1 = new Date(rate.effective_from).getTime()
  const e1 = rate.effective_to ? new Date(rate.effective_to).getTime() : Infinity

  const fMin1 = Number(rate.fat_min)
  const fMax1 = Number(rate.fat_max)
  const snfMin1 = Number(rate.snf_min)
  const snfMax1 = Number(rate.snf_max)

  for (const existing of existingRates) {
    if (excludeId && existing.id === excludeId) continue

    const s2 = new Date(existing.effective_from).getTime()
    const e2 = existing.effective_to ? new Date(existing.effective_to).getTime() : Infinity

    // 1. Date range overlap
    const datesOverlap = s1 <= e2 && s2 <= e1
    if (!datesOverlap) continue

    // 2. Fat range overlap
    const fMin2 = Number(existing.fat_min)
    const fMax2 = Number(existing.fat_max)
    const fatOverlap = fMin1 <= fMax2 && fMin2 <= fMax1
    if (!fatOverlap) continue

    // 3. SNF range overlap
    const snfMin2 = Number(existing.snf_min)
    const snfMax2 = Number(existing.snf_max)
    const snfOverlap = snfMin1 <= snfMax2 && snfMin2 <= snfMax1
    if (!snfOverlap) continue

    return `Overlaps with existing active rate entry (ID: ${existing.id || 'N/A'}): FAT ${fMin2}-${fMax2}%, SNF ${snfMin2}-${snfMax2}%, Rate: Rs ${existing.rate_per_liter}/L (Effective: ${existing.effective_from}${existing.effective_to ? ' to ' + existing.effective_to : ' onwards'})`
  }

  return null
}

export async function getRates() {
  try {
    await connectToDatabase()
    const data = await MilkRateMatrix.find({})
      .sort({ milk_type: 1, fat_min: 1, snf_min: 1 })

    return { rates: JSON.parse(JSON.stringify(data)) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch rates'
    return { rates: [], error: message }
  }
}

export async function addRate(rateData: Omit<MilkRateMatrix, 'id' | 'created_at' | 'updated_at'>) {
  try {
    await connectToDatabase()

    // Validate overlaps
    if (rateData.is_active) {
      const overlapError = await checkOverlappingRates(rateData)
      if (overlapError) {
        return { error: overlapError }
      }
    }

    const data = await MilkRateMatrix.create(rateData)

    revalidatePath('/dashboard/milk-rates')
    return { success: true, rate: JSON.parse(JSON.stringify(data)) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to add rate'
    return { error: message }
  }
}

export async function updateRate(id: string, updates: Partial<MilkRateMatrix>) {
  try {
    await connectToDatabase()

    // If making active or changing key attributes, check overlaps
    if (updates.is_active !== false) {
      const current = await MilkRateMatrix.findById(id)

      if (current) {
        const merged: any = {
          milk_type: updates.milk_type ?? current.milk_type,
          fat_min: updates.fat_min ?? current.fat_min,
          fat_max: updates.fat_max ?? current.fat_max,
          snf_min: updates.snf_min ?? current.snf_min,
          snf_max: updates.snf_max ?? current.snf_max,
          effective_from: updates.effective_from ?? current.effective_from,
          effective_to: updates.hasOwnProperty('effective_to') ? updates.effective_to : current.effective_to,
          is_active: updates.is_active ?? current.is_active
        }
        
        const overlapError = await checkOverlappingRates(merged, id)
        if (overlapError) {
          return { error: overlapError }
        }
      }
    }

    const data = await MilkRateMatrix.findByIdAndUpdate(id, updates, { new: true })
    if (!data) return { error: 'Rate entry not found' }

    revalidatePath('/dashboard/milk-rates')
    return { success: true, rate: JSON.parse(JSON.stringify(data)) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update rate'
    return { error: message }
  }
}

export async function deleteRate(id: string) {
  try {
    const { getSessionUserRole } = await import('@/app/actions/auth')
    const role = await getSessionUserRole()
    if (role !== 'admin') {
      return { error: 'Unauthorized: Only administrators can delete rate matrix entries.' }
    }

    await connectToDatabase()
    await MilkRateMatrix.findByIdAndDelete(id)

    revalidatePath('/dashboard/milk-rates')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete rate'
    return { error: message }
  }
}

export async function getMatchingRate(milkType: 'cow' | 'buffalo' | 'mixed', fat: number, snf: number, dateString?: string): Promise<{ rate: number; error?: string }> {
  try {
    await connectToDatabase()
    const checkDate = dateString || new Date().toISOString().split('T')[0]
    const lookupType = milkType === 'mixed' ? 'cow' : milkType

    const activeRates = await MilkRateMatrix.find({
      milk_type: lookupType,
      is_active: true
    })

    if (!activeRates || activeRates.length === 0) {
      return { rate: 0, error: 'No active rates configured for ' + lookupType }
    }

    const checkTime = new Date(checkDate).getTime()
    const fVal = Number(fat)
    const snfVal = Number(snf)

    const match = activeRates.find((r: any) => {
      const s = new Date(r.effective_from).getTime()
      const e = r.effective_to ? new Date(r.effective_to).getTime() : Infinity
      
      const inDateRange = checkTime >= s && checkTime <= e
      const inFatRange = fVal >= Number(r.fat_min) && fVal <= Number(r.fat_max)
      const inSnfRange = snfVal >= Number(r.snf_min) && snfVal <= Number(r.snf_max)

      return inDateRange && inFatRange && inSnfRange
    })

    if (!match) {
      return { rate: 0, error: 'No rate configured for this Fat/SNF range.' }
    }

    return { rate: Number(match.rate_per_liter) }
  } catch (err) {
    return { rate: 0, error: err instanceof Error ? err.message : 'Error executing rate lookup' }
  }
}

export async function importRates(ratesList: Omit<MilkRateMatrix, 'id' | 'created_at' | 'updated_at'>[]) {
  try {
    await connectToDatabase()
    
    // Validate each rate for overlaps
    for (let i = 0; i < ratesList.length; i++) {
      const rate = ratesList[i]
      if (rate.is_active) {
        const overlapError = await checkOverlappingRates(rate)
        if (overlapError) {
          return { error: `Row ${i + 1}: ${overlapError}` }
        }
      }
    }

    const data = await MilkRateMatrix.insertMany(ratesList)

    revalidatePath('/dashboard/milk-rates')
    return { success: true, count: data.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to import rates'
    return { error: message }
  }
}

export async function deleteMultipleRates(ids: string[]) {
  try {
    for (const id of ids) {
      const res = await deleteRate(id)
      if (res?.error) return { error: res.error }
    }
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete selected rates' }
  }
}
