/**
 * rate-charts.ts — SERVER ACTION STUBS
 *
 * ⚠️  Rate chart data is now stored in IndexedDB (local device storage).
 *     MongoDB is ONLY used for Users (authentication).
 *
 * UI components should import directly from '@/lib/rate-charts-local'.
 */
'use server'

export type { RateChartRecord } from '@/lib/rate-charts-local'

export async function getRateCharts() {
  return { success: false, charts: [], error: 'Rate chart data is stored locally. Use @/lib/rate-charts-local in client components.' }
}

export async function getRateChartById() {
  return { success: false, error: 'Use @/lib/rate-charts-local in client components.' }
}

export async function createRateChart() {
  return { success: false, error: 'Use @/lib/rate-charts-local in client components.' }
}

export async function updateRateChart() {
  return { success: false, error: 'Use @/lib/rate-charts-local in client components.' }
}

export async function deleteRateChart() {
  return { success: false, error: 'Use @/lib/rate-charts-local in client components.' }
}

export async function duplicateRateChart() {
  return { success: false, error: 'Use @/lib/rate-charts-local in client components.' }
}

export async function setDefaultRateChart() {
  return { success: false, error: 'Use @/lib/rate-charts-local in client components.' }
}

export async function calculateRateForPurchase() {
  return { rate: 0, bonus: 0, penalty: 0, chartId: '', chartName: '', error: 'Use @/lib/rate-charts-local or @/lib/local-db#getLocalRateForPurchase in client components.' }
}
