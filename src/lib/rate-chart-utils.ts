import { type IRateChartStep, type IRateChartBonus } from '@/models'
import * as XLSX from 'xlsx'

export interface RateChartInput {
  chart_name: string
  milk_type: 'cow' | 'buffalo' | 'mixed'
  bonus_amount: number
  calculation_type: 'fat_based' | 'snf_based' | 'fat_snf' | 'fat_snf_base_rate'
  status: 'active' | 'inactive'
  is_default: boolean
  cards: Array<{
    card_name: string
    fat_steps: IRateChartStep[]
    snf_steps: IRateChartStep[]
    fat_bonus: IRateChartBonus[]
    snf_bonus: IRateChartBonus[]
  }>
}

// Validation logic for dynamic ranges to prevent overlaps & duplicates
export function validateRateChartRanges(chart: RateChartInput): string | null {
  for (const card of chart.cards) {
    // 1. Validate FAT steps
    const fatSteps = [...card.fat_steps].sort((a, b) => a.min_val - b.min_val)
    for (let i = 0; i < fatSteps.length; i++) {
      const step = fatSteps[i]
      if (step.min_val < 0 || step.max_val < step.min_val || step.rate < 0) {
        return `Card "${card.card_name}": Invalid FAT range [${step.min_val} - ${step.max_val}] or rate [${step.rate}].`
      }
      if (i > 0) {
        const prev = fatSteps[i - 1]
        if (step.min_val <= prev.max_val) {
          return `Card "${card.card_name}": Overlapping FAT steps detected [${prev.min_val}-${prev.max_val}] and [${step.min_val}-${step.max_val}].`
        }
      }
    }

    // 2. Validate SNF steps
    const snfSteps = [...card.snf_steps].sort((a, b) => a.min_val - b.min_val)
    for (let i = 0; i < snfSteps.length; i++) {
      const step = snfSteps[i]
      if (step.min_val < 0 || step.max_val < step.min_val || step.rate < 0) {
        return `Card "${card.card_name}": Invalid SNF range [${step.min_val} - ${step.max_val}] or rate [${step.rate}].`
      }
      if (i > 0) {
        const prev = snfSteps[i - 1]
        if (step.min_val <= prev.max_val) {
          return `Card "${card.card_name}": Overlapping SNF steps detected [${prev.min_val}-${prev.max_val}] and [${step.min_val}-${step.max_val}].`
        }
      }
    }
  }
  return null
}

// Generate the 2D matrix dynamic preview
export function generateRateMatrixPreview(chart: RateChartInput): {
  fatHeaders: number[]
  snfHeaders: number[]
  matrix: number[][]
} {
  const fatHeaders: number[] = []
  const snfHeaders: number[] = []

  // Default coordinate ranges for matrix preview rendering
  const isCow = chart.milk_type === 'cow'
  const startFat = isCow ? 2.0 : 5.0
  const endFat = isCow ? 5.5 : 10.0
  const startSnf = isCow ? 7.5 : 8.0
  const endSnf = isCow ? 9.5 : 11.5

  for (let f = startFat; f <= endFat; f = Number((f + 0.1).toFixed(1))) {
    fatHeaders.push(f)
  }
  for (let s = startSnf; s <= endSnf; s = Number((s + 0.1).toFixed(1))) {
    snfHeaders.push(s)
  }

  const matrix: number[][] = []
  const card = chart.cards[0]

  if (!card) {
    return { fatHeaders, snfHeaders, matrix: fatHeaders.map(() => snfHeaders.map(() => 0)) }
  }

  const calcType = chart.calculation_type
  const bonusAmt = chart.bonus_amount || 0

  for (const fat of fatHeaders) {
    const row: number[] = []
    for (const snf of snfHeaders) {
      let fatBaseRate = 0
      let snfBaseRate = 0

      if (calcType === 'fat_based' || calcType === 'fat_snf' || calcType === 'fat_snf_base_rate') {
        const match = card.fat_steps.find((s: any) => fat >= s.min_val && fat <= s.max_val)
        if (match) fatBaseRate = match.rate
      }
      if (calcType === 'snf_based' || calcType === 'fat_snf' || calcType === 'fat_snf_base_rate') {
        const match = card.snf_steps.find((s: any) => snf >= s.min_val && snf <= s.max_val)
        if (match) snfBaseRate = match.rate
      }

      let fatDev = 0
      let snfDev = 0

      if (calcType === 'fat_snf_base_rate') {
        const fatBonusConfig = card.fat_bonus[0]
        if (fatBonusConfig) {
          const baseFat = fatBonusConfig.base_val
          const stepSize = fatBonusConfig.step_size || 0.1
          const delta = Number((fat - baseFat).toFixed(2))
          if (delta > 0) {
            const stepsCount = Math.floor(Number((delta / stepSize).toFixed(4)))
            fatDev = stepsCount * fatBonusConfig.bonus_rate
          } else if (delta < 0) {
            const stepsCount = Math.floor(Number((Math.abs(delta) / stepSize).toFixed(4)))
            fatDev = -(stepsCount * fatBonusConfig.penalty_rate)
          }
        }

        const snfBonusConfig = card.snf_bonus[0]
        if (snfBonusConfig) {
          const baseSnf = snfBonusConfig.base_val
          const stepSize = snfBonusConfig.step_size || 0.1
          const delta = Number((snf - baseSnf).toFixed(2))
          if (delta > 0) {
            const stepsCount = Math.floor(Number((delta / stepSize).toFixed(4)))
            snfDev = stepsCount * snfBonusConfig.bonus_rate
          } else if (delta < 0) {
            const stepsCount = Math.floor(Number((Math.abs(delta) / stepSize).toFixed(4)))
            snfDev = -(stepsCount * snfBonusConfig.penalty_rate)
          }
        }
      }

      let val = 0
      if (calcType === 'fat_based') {
        val = fatBaseRate
      } else if (calcType === 'snf_based') {
        val = snfBaseRate
      } else if (calcType === 'fat_snf_base_rate') {
        // Correct formula: Rate = (FAT × fat_rate) + bonus
        val = fat * fatBaseRate
      } else {
        // fat_snf: FAT rate + SNF rate
        val = fatBaseRate + snfBaseRate
      }

      val = val + bonusAmt + fatDev + snfDev
      row.push(Math.max(0, Number(val.toFixed(2))))
    }
    matrix.push(row)
  }

  return { fatHeaders, snfHeaders, matrix }
}

// Professional Excel Backup Export logic
export function exportChartsToExcel(charts: any[]) {
  const wb = XLSX.utils.book_new()
  
  // Sheet 1: Rate Charts List
  const chartsRows = charts.map(c => ({
    'Chart Name': c.chart_name,
    'Milk Type': c.milk_type,
    'Bonus Amount': c.bonus_amount || 0,
    'Calculation Type': c.calculation_type,
    'Status': c.status,
    'Default': c.is_default ? 'TRUE' : 'FALSE'
  }))
  const wsCharts = XLSX.utils.json_to_sheet(chartsRows)
  XLSX.utils.book_append_sheet(wb, wsCharts, 'Rate Charts')
  
  // Sheet 2: FAT Steps
  const fatStepsRows: any[] = []
  // Sheet 3: SNF Steps
  const snfStepsRows: any[] = []
  // Sheet 4: Bonus Penalties
  const bonusRows: any[] = []
  
  charts.forEach(c => {
    c.cards?.forEach((card: any) => {
      card.fat_steps?.forEach((step: any) => {
        fatStepsRows.push({
          'Chart Name': c.chart_name,
          'Card Name': card.card_name,
          'FAT Min': step.min_val,
          'FAT Max': step.max_val,
          'Rate': step.rate
        })
      })
      
      card.snf_steps?.forEach((step: any) => {
        snfStepsRows.push({
          'Chart Name': c.chart_name,
          'Card Name': card.card_name,
          'SNF Min': step.min_val,
          'SNF Max': step.max_val,
          'Rate': step.rate
        })
      })
      
      card.fat_bonus?.forEach((b: any) => {
        bonusRows.push({
          'Chart Name': c.chart_name,
          'Card Name': card.card_name,
          'Type': 'FAT',
          'Base Value': b.base_val,
          'Bonus Rate': b.bonus_rate,
          'Penalty Rate': b.penalty_rate,
          'Step Size': b.step_size
        })
      })
      
      card.snf_bonus?.forEach((b: any) => {
        bonusRows.push({
          'Chart Name': c.chart_name,
          'Card Name': card.card_name,
          'Type': 'SNF',
          'Base Value': b.base_val,
          'Bonus Rate': b.bonus_rate,
          'Penalty Rate': b.penalty_rate,
          'Step Size': b.step_size
        })
      })
    })
  })
  
  const wsFat = XLSX.utils.json_to_sheet(fatStepsRows)
  XLSX.utils.book_append_sheet(wb, wsFat, 'FAT Steps')
  
  const wsSnf = XLSX.utils.json_to_sheet(snfStepsRows)
  XLSX.utils.book_append_sheet(wb, wsSnf, 'SNF Steps')
  
  const wsBonus = XLSX.utils.json_to_sheet(bonusRows)
  XLSX.utils.book_append_sheet(wb, wsBonus, 'Bonus Penalties')
  
  XLSX.writeFile(wb, `sharma_dairy_rate_charts_backup_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// Professional Excel Backup Import / Parser logic
export function parseExcelBackup(arrayBuffer: any): any[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  
  // Read Rate Charts
  const wsCharts = wb.Sheets['Rate Charts']
  if (!wsCharts) throw new Error('Sheet "Rate Charts" not found in Excel backup.')
  const chartsRows = XLSX.utils.sheet_to_json(wsCharts) as any[]
  
  // Read FAT Steps
  const wsFat = wb.Sheets['FAT Steps']
  const fatRows = wsFat ? XLSX.utils.sheet_to_json(wsFat) as any[] : []
  
  // Read SNF Steps
  const wsSnf = wb.Sheets['SNF Steps']
  const snfRows = wsSnf ? XLSX.utils.sheet_to_json(wsSnf) as any[] : []
  
  // Read Bonus Penalties
  const wsBonus = wb.Sheets['Bonus Penalties']
  const bonusRows = wsBonus ? XLSX.utils.sheet_to_json(wsBonus) as any[] : []
  
  // Reconstruct nested charts
  const reconstructedCharts = chartsRows.map(chartRow => {
    const chartName = chartRow['Chart Name']
    
    // Group cards
    const cardNames = new Set<string>()
    fatRows.filter(r => r['Chart Name'] === chartName).forEach(r => cardNames.add(r['Card Name']))
    snfRows.filter(r => r['Chart Name'] === chartName).forEach(r => cardNames.add(r['Card Name']))
    bonusRows.filter(r => r['Chart Name'] === chartName).forEach(r => cardNames.add(r['Card Name']))
    
    if (cardNames.size === 0) {
      cardNames.add('Card 1')
    }
    
    const cards = Array.from(cardNames).map(cardName => {
      const fat_steps = fatRows
        .filter(r => r['Chart Name'] === chartName && r['Card Name'] === cardName)
        .map(r => ({
          min_val: parseFloat(r['FAT Min']),
          max_val: parseFloat(r['FAT Max']),
          rate: parseFloat(r['Rate'])
        }))
        
      const snf_steps = snfRows
        .filter(r => r['Chart Name'] === chartName && r['Card Name'] === cardName)
        .map(r => ({
          min_val: parseFloat(r['SNF Min']),
          max_val: parseFloat(r['SNF Max']),
          rate: parseFloat(r['Rate'])
        }))
        
      const fat_bonus = bonusRows
        .filter(r => r['Chart Name'] === chartName && r['Card Name'] === cardName && r['Type'] === 'FAT')
        .map(r => ({
          base_val: parseFloat(r['Base Value']),
          bonus_rate: parseFloat(r['Bonus Rate']),
          penalty_rate: parseFloat(r['Penalty Rate']),
          step_size: parseFloat(r['Step Size'] || '0.1')
        }))
        
      const snf_bonus = bonusRows
        .filter(r => r['Chart Name'] === chartName && r['Card Name'] === cardName && r['Type'] === 'SNF')
        .map(r => ({
          base_val: parseFloat(r['Base Value']),
          bonus_rate: parseFloat(r['Bonus Rate']),
          penalty_rate: parseFloat(r['Penalty Rate']),
          step_size: parseFloat(r['Step Size'] || '0.1')
        }))
        
      return {
        card_name: cardName,
        fat_steps,
        snf_steps,
        fat_bonus,
        snf_bonus
      }
    })
    
    return {
      chart_name: chartName,
      milk_type: (chartRow['Milk Type'] || 'cow').toLowerCase(),
      bonus_amount: parseFloat(chartRow['Bonus Amount'] || '0'),
      calculation_type: chartRow['Calculation Type'] || 'fat_snf_base_rate',
      status: (chartRow['Status'] || 'active').toLowerCase(),
      is_default: String(chartRow['Default']).toUpperCase() === 'TRUE',
      cards
    }
  })
  
  return reconstructedCharts
}
