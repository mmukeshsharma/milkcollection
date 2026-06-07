/**
 * rate-charts-local.ts
 * Client-side service — rate charts stored in IndexedDB.
 * Formula: Rate = (FAT × fat_step_rate) + bonus_amount
 */

import { STORES, dbGetAll, dbGet, dbPut, dbDelete, generateId, calculateRateFromChart } from '@/lib/local-db'
import { type RateChartInput, validateRateChartRanges } from '@/lib/rate-chart-utils'

export type RateChartRecord = RateChartInput & {
  id: string
  created_at: string
  updated_at: string
}

export async function getRateCharts(): Promise<{ success: boolean; charts?: RateChartRecord[]; error?: string }> {
  try {
    const all = await dbGetAll<RateChartRecord>(STORES.rate_charts)
    const sorted = all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return { success: true, charts: sorted }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getRateChartById(id: string): Promise<{ success: boolean; chart?: RateChartRecord; error?: string }> {
  try {
    const chart = await dbGet<RateChartRecord>(STORES.rate_charts, id)
    if (!chart) return { success: false, error: 'Rate chart not found' }
    return { success: true, chart }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function createRateChart(data: RateChartInput): Promise<{ success: boolean; chart?: RateChartRecord; error?: string }> {
  try {
    const rangeError = validateRateChartRanges(data)
    if (rangeError) return { success: false, error: rangeError }

    const all = await dbGetAll<RateChartRecord>(STORES.rate_charts)
    if (all.find(c => c.chart_name === data.chart_name)) {
      return { success: false, error: `A rate chart named "${data.chart_name}" already exists.` }
    }

    if (data.is_default) {
      // Unset other defaults for same milk type
      for (const c of all.filter(c => c.milk_type === data.milk_type && c.is_default)) {
        await dbPut(STORES.rate_charts, { ...c, is_default: false, updated_at: new Date().toISOString() })
      }
    }

    const now = new Date().toISOString()
    const record: RateChartRecord = { ...data, id: generateId(), created_at: now, updated_at: now }
    await dbPut(STORES.rate_charts, record)
    return { success: true, chart: record }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateRateChart(id: string, updates: Partial<RateChartInput>): Promise<{ success: boolean; chart?: RateChartRecord; error?: string }> {
  try {
    const existing = await dbGet<RateChartRecord>(STORES.rate_charts, id)
    if (!existing) return { success: false, error: 'Rate chart not found' }

    if (updates.chart_name && updates.chart_name !== existing.chart_name) {
      const all = await dbGetAll<RateChartRecord>(STORES.rate_charts)
      if (all.find(c => c.chart_name === updates.chart_name && c.id !== id)) {
        return { success: false, error: `A rate chart named "${updates.chart_name}" already exists.` }
      }
    }

    const merged = { ...existing, ...updates }
    if (updates.cards) {
      const rangeError = validateRateChartRanges(merged as RateChartInput)
      if (rangeError) return { success: false, error: rangeError }
    }

    if (updates.is_default) {
      const all = await dbGetAll<RateChartRecord>(STORES.rate_charts)
      for (const c of all.filter(c => c.milk_type === existing.milk_type && c.is_default && c.id !== id)) {
        await dbPut(STORES.rate_charts, { ...c, is_default: false, updated_at: new Date().toISOString() })
      }
    }

    const updated: RateChartRecord = { ...merged, id, updated_at: new Date().toISOString() }
    await dbPut(STORES.rate_charts, updated)
    return { success: true, chart: updated }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteRateChart(id: string, role?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (role && role !== 'admin') return { success: false, error: 'Unauthorized: Only administrators can delete rate charts.' }
    await dbDelete(STORES.rate_charts, id)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function setDefaultRateChart(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const chart = await dbGet<RateChartRecord>(STORES.rate_charts, id)
    if (!chart) return { success: false, error: 'Rate chart not found' }

    const all = await dbGetAll<RateChartRecord>(STORES.rate_charts)
    for (const c of all.filter(c => c.milk_type === chart.milk_type && c.is_default)) {
      await dbPut(STORES.rate_charts, { ...c, is_default: false, updated_at: new Date().toISOString() })
    }
    await dbPut(STORES.rate_charts, { ...chart, is_default: true, updated_at: new Date().toISOString() })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function duplicateRateChart(id: string): Promise<{ success: boolean; chart?: RateChartRecord; error?: string }> {
  try {
    const source = await dbGet<RateChartRecord>(STORES.rate_charts, id)
    if (!source) return { success: false, error: 'Source rate chart not found' }

    const all = await dbGetAll<RateChartRecord>(STORES.rate_charts)
    const baseName = source.chart_name.replace(/ \(Copy\b.*\)?$/, '')
    let uniqueName = `${baseName} (Copy)`
    let counter = 1
    while (all.find(c => c.chart_name === uniqueName)) {
      uniqueName = `${baseName} (Copy ${counter++})`
    }

    const now = new Date().toISOString()
    const copy: RateChartRecord = {
      ...source,
      id:          generateId(),
      chart_name:  uniqueName,
      is_default:  false,
      created_at:  now,
      updated_at:  now,
    }
    await dbPut(STORES.rate_charts, copy)
    return { success: true, chart: copy }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/** Calculate rate for a purchase using local IndexedDB rate charts */
export async function calculateRateForPurchaseLocal(
  milkType: 'cow' | 'buffalo' | 'mixed',
  fat: number,
  snf: number
): Promise<{ rate: number; bonus: number; penalty: number; chartId: string; chartName: string; error?: string }> {
  const all = await dbGetAll<RateChartRecord>(STORES.rate_charts)

  let chart: RateChartRecord | undefined =
    all.find(c => c.milk_type === milkType && c.status === 'active' && c.is_default) ||
    all.find(c => c.milk_type === milkType && c.status === 'active')

  if (!chart && milkType === 'mixed') {
    chart =
      all.find(c => c.milk_type === 'cow' && c.status === 'active' && c.is_default) ||
      all.find(c => c.milk_type === 'cow' && c.status === 'active')
  }

  if (!chart) {
    return { rate: 0, bonus: 0, penalty: 0, chartId: '', chartName: '', error: `No active rate chart for ${milkType}` }
  }

  return calculateRateFromChart(chart, fat, snf)
}
