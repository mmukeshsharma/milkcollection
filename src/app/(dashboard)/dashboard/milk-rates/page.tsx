'use client'

import { useState, useEffect } from 'react'
import {
  getRateCharts,
  createRateChart,
  updateRateChart,
  deleteRateChart,
  duplicateRateChart,
  setDefaultRateChart
} from '@/lib/rate-charts-local'
import { generateRateMatrixPreview, type RateChartInput, exportChartsToExcel, parseExcelBackup } from '@/lib/rate-chart-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/context/LanguageContext'
import { Pagination } from '@/components/ui/pagination'

export default function RateChartDashboardPage() {
  const { t, locale } = useLanguage()
  
  // Dynamic page title sync
  useEffect(() => {
    document.title = locale === 'hi' ? 'रेट चार्ट | शर्मा डेयरी' : 'Rate Chart | Sharma Dairy'
  }, [locale])

  // List States
  const [charts, setCharts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [milkTypeFilter, setMilkTypeFilter] = useState<'all' | 'cow' | 'buffalo' | 'mixed'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Form View States
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Form Model State
  const [chartName, setChartName] = useState('')
  const [milkType, setMilkType] = useState<'cow' | 'buffalo' | 'mixed'>('cow')
  const [bonusAmount, setBonusAmount] = useState(0)
  const [calculationType, setCalculationType] = useState<'fat_based' | 'snf_based' | 'fat_snf' | 'fat_snf_base_rate'>('fat_snf_base_rate')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [isDefault, setIsDefault] = useState(false)
  const [cards, setCards] = useState<RateChartInput['cards']>([
    {
      card_name: 'Card 1',
      fat_steps: [{ min_val: 2.0, max_val: 5.0, rate: 38.00 }],
      snf_steps: [{ min_val: 8.0, max_val: 10.0, rate: 12.00 }],
      fat_bonus: [{ base_val: 4.0, bonus_rate: 0.10, penalty_rate: 0.15, step_size: 0.1 }],
      snf_bonus: [{ base_val: 8.5, bonus_rate: 0.12, penalty_rate: 0.20, step_size: 0.1 }]
    }
  ])

  // Form Inline Adders States
  const [newFatMin, setNewFatMin] = useState(2.0)
  const [newFatMax, setNewFatMax] = useState(5.0)
  const [newFatRate, setNewFatRate] = useState(38.0)
  const [newSnfMin, setNewSnfMin] = useState(8.0)
  const [newSnfMax, setNewSnfMax] = useState(10.0)
  const [newSnfRate, setNewSnfRate] = useState(12.0)

  // Excel / JSON Import/Backup State
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importError, setImportError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [importing, setImporting] = useState(false)

  // Fetch charts
  async function fetchCharts() {
    setLoading(true)
    const res = await getRateCharts()
    if (res.success && res.charts) {
      setCharts(res.charts)
    } else if (res.error) {
      showToast(res.error, 'error')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCharts()
  }, [])

  // Show dynamic toast helper
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Handle create click
  function handleAddClick() {
    setChartName('')
    setMilkType('cow')
    setBonusAmount(0)
    setCalculationType('fat_snf_base_rate')
    setStatus('active')
    setIsDefault(false)
    setCards([
      {
        card_name: 'Card 1',
        fat_steps: [{ min_val: 2.0, max_val: 5.0, rate: 38.00 }],
        snf_steps: [{ min_val: 8.0, max_val: 10.0, rate: 12.00 }],
        fat_bonus: [{ base_val: 4.0, bonus_rate: 0.10, penalty_rate: 0.15, step_size: 0.1 }],
        snf_bonus: [{ base_val: 8.5, bonus_rate: 0.12, penalty_rate: 0.20, step_size: 0.1 }]
      }
    ])
    setEditingId(null)
    setView('create')
  }

  // Handle edit click
  function handleEditClick(chart: any) {
    setChartName(chart.chart_name)
    setMilkType(chart.milk_type)
    setBonusAmount(chart.bonus_amount || 0)
    setCalculationType(chart.calculation_type)
    setStatus(chart.status)
    setIsDefault(chart.is_default)
    setCards(chart.cards && chart.cards.length > 0 ? chart.cards : [
      {
        card_name: 'Card 1',
        fat_steps: [],
        snf_steps: [],
        fat_bonus: [],
        snf_bonus: []
      }
    ])
    setEditingId(chart.id)
    setView('edit')
  }

  // Duplicate Chart action
  async function handleDuplicate(id: string) {
    const res = await duplicateRateChart(id)
    if (res.success) {
      showToast(locale === 'hi' ? 'चार्ट सफलतापूर्वक डुप्लिकेट किया गया' : 'Chart duplicated successfully!', 'success')
      fetchCharts()
    } else {
      showToast(res.error || 'Failed to duplicate chart', 'error')
    }
  }

  // Set Default action
  async function handleSetDefault(id: string) {
    const res = await setDefaultRateChart(id)
    if (res.success) {
      showToast(locale === 'hi' ? 'डिफ़ॉल्ट चार्ट सेट किया गया' : 'Default rate chart updated!', 'success')
      fetchCharts()
    } else {
      showToast(res.error || 'Failed to set default', 'error')
    }
  }

  // Add card utility
  function handleAddCard() {
    if (cards.length >= 5) {
      showToast(locale === 'hi' ? 'अधिकतम 5 कार्ड सीमा पूरी हो गई' : 'Max card limit (5) reached', 'error')
      return
    }
    setCards([
      ...cards,
      {
        card_name: `Card ${cards.length + 1}`,
        fat_steps: [],
        snf_steps: [],
        fat_bonus: [{ base_val: 4.0, bonus_rate: 0.10, penalty_rate: 0.15, step_size: 0.1 }],
        snf_bonus: [{ base_val: 8.5, bonus_rate: 0.12, penalty_rate: 0.20, step_size: 0.1 }]
      }
    ])
  }

  // Delete card utility
  function handleDeleteCard(cardIdx: number) {
    setCards(cards.filter((_, idx) => idx !== cardIdx))
  }

  // FAT Step management
  function addFatStep(cardIdx: number) {
    const card = cards[cardIdx]
    // Check overlaps
    const overlaps = card.fat_steps.some(s => newFatMin <= s.max_val && newFatMax >= s.min_val)
    if (overlaps) {
      showToast(t('rates.invalidFat') + ' (Overlaps)', 'error')
      return
    }
    if (newFatMax < newFatMin || newFatRate <= 0) {
      showToast(t('rates.invalidFat'), 'error')
      return
    }
    const updated = [...cards]
    updated[cardIdx].fat_steps.push({ min_val: newFatMin, max_val: newFatMax, rate: newFatRate })
    setCards(updated)
  }

  function deleteFatStep(cardIdx: number, stepIdx: number) {
    const updated = [...cards]
    updated[cardIdx].fat_steps = updated[cardIdx].fat_steps.filter((_, idx) => idx !== stepIdx)
    setCards(updated)
  }

  // SNF Step management
  function addSnfStep(cardIdx: number) {
    const card = cards[cardIdx]
    // Check overlaps
    const overlaps = card.snf_steps.some(s => newSnfMin <= s.max_val && newSnfMax >= s.min_val)
    if (overlaps) {
      showToast(t('rates.invalidSnf') + ' (Overlaps)', 'error')
      return
    }
    if (newSnfMax < newSnfMin || newSnfRate <= 0) {
      showToast(t('rates.invalidSnf'), 'error')
      return
    }
    const updated = [...cards]
    updated[cardIdx].snf_steps.push({ min_val: newSnfMin, max_val: newSnfMax, rate: newSnfRate })
    setCards(updated)
  }

  function deleteSnfStep(cardIdx: number, stepIdx: number) {
    const updated = [...cards]
    updated[cardIdx].snf_steps = updated[cardIdx].snf_steps.filter((_, idx) => idx !== stepIdx)
    setCards(updated)
  }

  // Bonus/Penalty Configuration parameters update
  function updateBonusConfig(cardIdx: number, type: 'fat' | 'snf', field: string, val: number) {
    const updated = [...cards]
    const list = type === 'fat' ? updated[cardIdx].fat_bonus : updated[cardIdx].snf_bonus
    if (list.length === 0) {
      list.push({ base_val: 0, bonus_rate: 0, penalty_rate: 0, step_size: 0.1 })
    }
    list[0] = { ...list[0], [field]: val }
    setCards(updated)
  }

  // Form submit handler
  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    if (!chartName.trim()) {
      showToast(locale === 'hi' ? 'चार्ट का नाम आवश्यक है।' : 'Chart name is required.', 'error')
      return
    }

    const payload: RateChartInput = {
      chart_name: chartName,
      milk_type: milkType,
      bonus_amount: Number(bonusAmount),
      calculation_type: calculationType,
      status,
      is_default: isDefault,
      cards
    }

    let res
    if (view === 'edit' && editingId) {
      res = await updateRateChart(editingId, payload)
    } else {
      res = await createRateChart(payload)
    }

    if (res.success) {
      showToast(view === 'edit' ? t('rates.toastUpdated') : t('rates.toastAdded'), 'success')
      setView('list')
      fetchCharts()
    } else {
      showToast(res.error || 'Failed to save chart', 'error')
    }
  }

  // Excel Export / Backup helper
  function handleBackupCharts() {
    if (charts.length === 0) return
    try {
      exportChartsToExcel(charts)
      showToast(locale === 'hi' ? 'एक्सेल बैकअप फ़ाइल डाउनलोड शुरू हुई!' : 'Excel backup file download started!', 'success')
    } catch (err: any) {
      showToast(locale === 'hi' ? 'बैकअप डाउनलोड करने में विफल' : 'Failed to download backup', 'error')
    }
  }

  // Multi-format File Import helper (JSON & Excel)
  async function handleFileImport(file: File) {
    setImportError('')
    setImporting(true)
    
    const fileReader = new FileReader()
    const isJson = file.name.endsWith('.json')
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    
    if (!isJson && !isExcel) {
      setImportError(locale === 'hi' 
        ? 'कृपया केवल .xlsx, .xls या .json फ़ाइल अपलोड करें।' 
        : 'Please upload only .xlsx, .xls, or .json files.'
      )
      setImporting(false)
      return
    }

    fileReader.onload = async (e) => {
      try {
        let chartsList: any[] = []
        if (isJson) {
          const text = e.target?.result as string
          const parsed = JSON.parse(text)
          chartsList = Array.isArray(parsed) ? parsed : [parsed]
        } else {
          const buffer = e.target?.result as ArrayBuffer
          chartsList = parseExcelBackup(buffer)
        }

        if (!chartsList || chartsList.length === 0) {
          throw new Error(locale === 'hi' ? 'अपलोड की गई फ़ाइल में कोई दर चार्ट नहीं मिला।' : 'No rate charts found in the uploaded file.')
        }

        let importedCount = 0
        let errorsList: string[] = []

        for (const item of chartsList) {
          const payload: RateChartInput = {
            chart_name: item.chart_name,
            milk_type: item.milk_type || 'cow',
            bonus_amount: item.bonus_amount || 0,
            calculation_type: item.calculation_type || 'fat_snf_base_rate',
            status: item.status || 'active',
            is_default: false,
            cards: item.cards || []
          }
          const res = await createRateChart(payload)
          if (res.success) {
            importedCount++
          } else {
            errorsList.push(`${item.chart_name}: ${res.error}`)
          }
        }

        if (errorsList.length > 0) {
          if (importedCount > 0) {
            showToast(
              locale === 'hi' 
                ? `${importedCount} चार्ट आयात किए गए, कुछ विफल रहे।` 
                : `${importedCount} charts imported. Some failed.`, 
              'error'
            )
            setImportError(errorsList.join(' | '))
          } else {
            throw new Error(errorsList.join(' | '))
          }
        } else {
          showToast(
            locale === 'hi' 
              ? `${importedCount} चार्ट सफलतापूर्वक आयात किए गए!` 
              : `Successfully imported ${importedCount} charts!`, 
            'success'
          )
          setIsImportOpen(false)
          setSelectedFile(null)
        }
        
        fetchCharts()
      } catch (err: any) {
        setImportError(err.message || (locale === 'hi' ? 'फ़ाइल पार्स करने में त्रुटि।' : 'Error parsing backup file.'))
      } finally {
        setImporting(false)
      }
    }

    if (isJson) {
      fileReader.readAsText(file)
    } else {
      fileReader.readAsArrayBuffer(file)
    }
  }

  // Filter and Search Charts
  const filteredCharts = charts.filter(c => {
    if (searchTerm) {
      const matchName = c.chart_name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchType = c.milk_type.toLowerCase().includes(searchTerm.toLowerCase())
      if (!matchName && !matchType) return false
    }
    if (milkTypeFilter !== 'all' && c.milk_type !== milkTypeFilter) return false
    if (statusFilter === 'all') return true
    if (statusFilter === 'active' && c.status !== 'active') return false
    if (statusFilter === 'inactive' && c.status !== 'inactive') return false
    return true
  })

  // Paginated elements
  const totalItems = filteredCharts.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const paginatedCharts = filteredCharts.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  // Generate Matrix dynamic preview based on current form configurations
  const matrixData = generateRateMatrixPreview({
    chart_name: chartName,
    milk_type: milkType,
    bonus_amount: bonusAmount,
    calculation_type: calculationType,
    status,
    is_default: isDefault,
    cards
  })

  return (
    <div className="space-y-6">
      {/* 1. LIST VIEW */}
      {view === 'list' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">{t('rates.title')}</h1>
              <p className="text-sm text-slate-600">{t('rates.tagline')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setIsImportOpen(true)}
                className="bg-white/60 hover:bg-slate-50 border-slate-200"
              >
                📤 {t('rates.importCsv')} JSON
              </Button>
              <Button
                variant="outline"
                onClick={handleBackupCharts}
                disabled={charts.length === 0}
                className="bg-white/60 hover:bg-slate-50 border-slate-200"
              >
                💾 {t('rates.backupMatrix')}
              </Button>
              <Button
                onClick={handleAddClick}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg font-semibold"
              >
                ➕ {t('rates.addChart')}
              </Button>
            </div>
          </div>

          {/* KPIs Overview */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="mb-3 h-1.5 w-12 rounded-full bg-blue-600" />
              <p className="text-xs text-slate-500 font-bold uppercase">{t('rates.activeCowRules')}</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">
                {charts.filter(c => c.milk_type === 'cow' && c.status === 'active').length} {t('rates.ranges')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="mb-3 h-1.5 w-12 rounded-full bg-emerald-500" />
              <p className="text-xs text-slate-500 font-bold uppercase">{t('rates.activeBufRules')}</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {charts.filter(c => c.milk_type === 'buffalo' && c.status === 'active').length} {t('rates.ranges')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="mb-3 h-1.5 w-12 rounded-full bg-indigo-500" />
              <p className="text-xs text-slate-500 font-bold uppercase">{t('rates.totalCoordinates')}</p>
              <p className="mt-1 text-2xl font-bold text-indigo-600">
                {charts.length} {t('rates.total')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="mb-3 h-1.5 w-12 rounded-full bg-amber-500" />
              <p className="text-xs text-slate-500 font-bold uppercase">{t('rates.activeStatus')}</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{t('rates.dynamicLookup')}</p>
            </div>
          </section>

          {/* Filters Bar */}
          <div className="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-xl backdrop-blur-xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="search">{t('rates.search')}</Label>
                <Input
                  id="search"
                  placeholder={t('rates.search') + "..."}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="bg-white/50 border-slate-200 shadow-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="milkType">{t('rates.milkType')}</Label>
                <select
                  id="milkType"
                  value={milkTypeFilter}
                  onChange={(e: any) => { setMilkTypeFilter(e.target.value); setPage(1); }}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white/50 px-3 py-1 text-sm shadow-xs focus:outline-none"
                >
                  <option value="all">{t('rates.allMilkTypes')}</option>
                  <option value="cow">{t('rates.cowOnly')}</option>
                  <option value="buffalo">{t('rates.buffaloOnly')}</option>
                  <option value="mixed">{locale === 'hi' ? 'मिश्रित केवल' : 'Mixed Only'}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="status">{t('rates.status')}</Label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e: any) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white/50 px-3 py-1 text-sm shadow-xs focus:outline-none"
                >
                  <option value="all">{t('rates.allStatuses')}</option>
                  <option value="active">{t('rates.activeOnly')}</option>
                  <option value="inactive">{t('rates.inactiveOnly')}</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('')
                    setMilkTypeFilter('all')
                    setStatusFilter('all')
                    setPage(1)
                  }}
                  className="w-full bg-white/40 hover:bg-slate-50 border-slate-200"
                >
                  {t('rates.resetFilters')}
                </Button>
              </div>
            </div>
          </div>

          {/* List Table */}
          <div className="rounded-2xl border border-white/40 bg-white/75 shadow-xl backdrop-blur-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">{t('rates.chartName')}</th>
                    <th className="px-4 py-3">{t('rates.milkType')}</th>
                    <th className="px-4 py-3">{t('rates.bonusAmount')}</th>
                    <th className="px-4 py-3">{t('rates.defaultChart')}</th>
                    <th className="px-4 py-3">{t('rates.status')}</th>
                    <th className="px-4 py-3">{t('rates.createdDate')}</th>
                    <th className="px-4 py-3 text-right">{t('rates.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        {t('rates.loading')}
                      </td>
                    </tr>
                  ) : paginatedCharts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        {t('rates.noRecords')}
                      </td>
                    </tr>
                  ) : (
                    paginatedCharts.map((chart) => (
                      <tr
                        key={chart.id}
                        className={`border-b hover:bg-slate-50/70 transition ${
                          chart.status === 'inactive' ? 'opacity-60 bg-slate-50/20' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {chart.chart_name}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                              chart.milk_type === 'cow'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : chart.milk_type === 'buffalo'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {chart.milk_type === 'cow' ? t('rates.cowMilk') : chart.milk_type === 'buffalo' ? t('rates.buffaloMilk') : t('rates.mixedMilk')}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">
                          {locale === 'hi' ? '₹' : 'Rs'} {Number(chart.bonus_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {chart.is_default ? (
                            <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
                              {locale === 'hi' ? 'डिफ़ॉल्ट' : 'Default'}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetDefault(chart.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 hover:border-blue-300 rounded px-2.5 py-1 bg-white/40"
                            >
                              {t('rates.setDefault')}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              chart.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {chart.status === 'active' ? t('rates.active') : t('rates.inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-semibold text-xs">
                          {new Date(chart.created_at || Date.now()).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              title={locale === 'hi' ? 'डिफ़ॉल्ट सेट करें' : 'Set Default'}
                              onClick={() => handleSetDefault(chart.id)}
                              disabled={chart.is_default}
                              className="rounded-lg p-1.5 hover:bg-amber-50 hover:text-amber-600 text-slate-500 transition-colors disabled:opacity-30"
                            >
                              ⭐
                            </button>
                            <button
                              title={locale === 'hi' ? 'डुप्लिकेट करें' : 'Duplicate'}
                              onClick={() => handleDuplicate(chart.id)}
                              className="rounded-lg p-1.5 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 transition-colors"
                            >
                              📋
                            </button>
                            <button
                              title={locale === 'hi' ? 'संपादित करें' : 'Edit'}
                              onClick={() => handleEditClick(chart)}
                              className="rounded-lg p-1.5 hover:bg-blue-50 hover:text-blue-600 text-slate-500 transition-colors"
                            >
                              ✏️
                            </button>
                            <button
                              title={locale === 'hi' ? 'चार्ट हटाएं' : 'Delete chart'}
                              onClick={() => setDeleteConfirmId(chart.id)}
                              className="rounded-lg p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <Pagination
              page={page}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onChangePage={setPage}
              onChangeItemsPerPage={setItemsPerPage}
              itemLabel="charts"
            />
          </div>
        </div>
      )}

      {/* 2. FORM VIEW (CREATE / EDIT) */}
      {(view === 'create' || view === 'edit') && (
        <form onSubmit={handleSubmitForm} className="space-y-6 select-none animate-[fadeIn_0.3s_ease-out]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
                {view === 'edit' ? t('rates.editChart') : t('rates.addChart')}
              </h1>
              <p className="text-sm text-slate-600">
                {locale === 'hi' ? 'फैट/एसएनएफ चरणों और बोनस नियमों को कॉन्फ़िगर करें।' : 'Configure custom FAT/SNF ranges and bonus parameters.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setView('list')}
                className="bg-white/60 hover:bg-slate-50 border-slate-200 font-semibold"
              >
                {t('rates.cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 shadow-lg font-bold"
              >
                {t('rates.saveRateChart')}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            {/* Form Fields & Steps Config - LEFT (7 Columns) */}
            <div className="xl:col-span-7 space-y-6">
              <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2">
                  {locale === 'hi' ? 'मूल कॉन्फ़िगरेशन' : 'Basic Configurations'}
                </h3>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="chartName">{t('rates.chartName')}</Label>
                    <Input
                      id="chartName"
                      value={chartName}
                      onChange={(e) => setChartName(e.target.value)}
                      placeholder={locale === 'hi' ? 'जैसे: गाय रेट चार्ट' : 'e.g. Cow Rate Chart'}
                      className="bg-white/50 border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bonusAmount">{t('rates.bonusAmount')} ({locale === 'hi' ? '₹' : 'Rs'})</Label>
                    <Input
                      id="bonusAmount"
                      type="number"
                      step="0.05"
                      value={bonusAmount}
                      onChange={(e) => setBonusAmount(parseFloat(e.target.value) || 0)}
                      className="bg-white/50 border-slate-200 font-semibold text-blue-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t('rates.milkType')}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['cow', 'buffalo', 'mixed'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setMilkType(type)}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold transition uppercase ${
                            milkType === type
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          {type === 'cow' ? t('rates.cowMilk') : type === 'buffalo' ? t('rates.buffaloMilk') : t('rates.mixedMilk')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="calcType">{t('rates.calculationType')}</Label>
                    <select
                      id="calcType"
                      value={calculationType}
                      onChange={(e: any) => setCalculationType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-white/50 px-3 py-1 text-sm shadow-xs focus:outline-none font-semibold text-slate-700"
                    >
                      <option value="fat_snf_base_rate">{t('rates.fatSnfBaseRate')}</option>
                      <option value="fat_snf">{t('rates.fatSnf')}</option>
                      <option value="fat_based">{t('rates.fatBased')}</option>
                      <option value="snf_based">{t('rates.snfBased')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="isDefault" className="cursor-pointer font-bold text-slate-700">
                      {locale === 'hi' ? 'डिफ़ॉल्ट रेट चार्ट के रूप में सहेजें' : 'Set as Default Rate Chart'}
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="statusCheck"
                      checked={status === 'active'}
                      onChange={(e) => setStatus(e.target.checked ? 'active' : 'inactive')}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="statusCheck" className="cursor-pointer font-bold text-slate-700">
                      {locale === 'hi' ? 'सक्रिय स्थिति' : 'Mark Chart Active'}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Dynamic Steps Cards configurations (Max 5) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-800">
                    {locale === 'hi' ? 'दर चरण कार्ड (अधिकतम 5)' : 'Rate Grid Config Cards (Max 5)'}
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCard}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50/50 text-xs font-semibold py-1 px-3"
                  >
                    ➕ {t('rates.addCard')}
                  </Button>
                </div>

                {cards.map((card, cardIdx) => (
                  <div key={cardIdx} className="rounded-2xl border border-white/40 bg-white/80 p-5 shadow-xl backdrop-blur-xl space-y-4 border-l-4 border-l-blue-600">
                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                      <span className="font-bold text-blue-700 uppercase tracking-wide text-xs">
                        {locale === 'hi' ? `ग्रिड कार्ड ${cardIdx + 1}` : `Grid Configuration Card ${cardIdx + 1}`}
                      </span>
                      {cards.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(cardIdx)}
                          className="text-xs text-rose-500 font-bold hover:underline"
                        >
                          ✕ {locale === 'hi' ? 'कार्ड हटाएं' : 'Remove Card'}
                        </button>
                      )}
                    </div>

                    {/* Left & Right Step configs */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {/* Fat Steps list */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="font-bold text-slate-700 flex items-center gap-1.5">
                            🐄 {t('rates.fatSteps')}
                          </Label>
                        </div>
                        
                        {/* Fat steps input adder */}
                        <div className="flex gap-1 items-end bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{t('rates.fatMin')}</span>
                            <Input
                              type="number"
                              step="0.1"
                              value={newFatMin}
                              onChange={(e) => setNewFatMin(parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{t('rates.fatMax')}</span>
                            <Input
                              type="number"
                              step="0.1"
                              value={newFatMax}
                              onChange={(e) => setNewFatMax(parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{locale === 'hi' ? 'दर' : 'Rate'}</span>
                            <Input
                              type="number"
                              step="0.5"
                              value={newFatRate}
                              onChange={(e) => setNewFatRate(parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs bg-white font-bold"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => addFatStep(cardIdx)}
                            className="bg-blue-600 text-white hover:bg-blue-700 h-8 text-xs py-0.5 px-2"
                          >
                            ➕
                          </Button>
                        </div>

                        {/* List of active Fat steps */}
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {card.fat_steps.map((step, stepIdx) => (
                            <div key={stepIdx} className="flex justify-between items-center bg-white p-2 rounded-lg border text-xs shadow-2xs">
                              <span className="font-semibold text-slate-700">
                                {step.min_val.toFixed(1)} - {step.max_val.toFixed(1)} %
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-blue-700">{locale === 'hi' ? '₹' : 'Rs'} {step.rate.toFixed(2)}</span>
                                <button
                                  type="button"
                                  onClick={() => deleteFatStep(cardIdx, stepIdx)}
                                  className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                          {card.fat_steps.length === 0 && (
                            <p className="text-xs text-slate-400 italic text-center py-2">
                              {locale === 'hi' ? 'कोई फैट नियम सेट नहीं' : 'No FAT rules configured'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* SNF Steps list */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="font-bold text-slate-700 flex items-center gap-1.5">
                            🥛 {t('rates.snfSteps')}
                          </Label>
                        </div>

                        {/* SNF steps input adder */}
                        <div className="flex gap-1 items-end bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{t('rates.snfMin')}</span>
                            <Input
                              type="number"
                              step="0.1"
                              value={newSnfMin}
                              onChange={(e) => setNewSnfMin(parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{t('rates.snfMax')}</span>
                            <Input
                              type="number"
                              step="0.1"
                              value={newSnfMax}
                              onChange={(e) => setNewSnfMax(parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{locale === 'hi' ? 'दर' : 'Rate'}</span>
                            <Input
                              type="number"
                              step="0.5"
                              value={newSnfRate}
                              onChange={(e) => setNewSnfRate(parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs bg-white font-bold"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => addSnfStep(cardIdx)}
                            className="bg-blue-600 text-white hover:bg-blue-700 h-8 text-xs py-0.5 px-2"
                          >
                            ➕
                          </Button>
                        </div>

                        {/* List of active SNF steps */}
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {card.snf_steps.map((step, stepIdx) => (
                            <div key={stepIdx} className="flex justify-between items-center bg-white p-2 rounded-lg border text-xs shadow-2xs">
                              <span className="font-semibold text-slate-700">
                                {step.min_val.toFixed(1)} - {step.max_val.toFixed(1)} %
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-emerald-700">{locale === 'hi' ? '₹' : 'Rs'} {step.rate.toFixed(2)}</span>
                                <button
                                  type="button"
                                  onClick={() => deleteSnfStep(cardIdx, stepIdx)}
                                  className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                          {card.snf_steps.length === 0 && (
                            <p className="text-xs text-slate-400 italic text-center py-2">
                              {locale === 'hi' ? 'कोई एसएनएफ नियम सेट नहीं' : 'No SNF rules configured'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bonus & Penalty Config offsets - visible when Fat/SNF with Base Rate chosen */}
                    {calculationType === 'fat_snf_base_rate' && (
                      <div className="border-t border-slate-100 pt-4 space-y-4">
                        <span className="text-xs font-bold text-slate-700 block">
                          📈 {t('rates.bonusPenalty')}
                        </span>
                        
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {/* FAT Bonus Config */}
                          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2">
                            <span className="text-[11px] font-bold text-blue-700 block uppercase">
                              🐄 {t('rates.fatBonusPenalty')}
                            </span>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 block font-semibold">{t('rates.baseVal')} (FAT)</span>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={card.fat_bonus[0]?.base_val ?? 4.0}
                                  onChange={(e) => updateBonusConfig(cardIdx, 'fat', 'base_val', parseFloat(e.target.value) || 0)}
                                  className="h-8 text-xs bg-white"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 block font-semibold">{t('rates.stepSize')}</span>
                                <Input
                                  type="number"
                                  step="0.05"
                                  value={card.fat_bonus[0]?.step_size ?? 0.1}
                                  onChange={(e) => updateBonusConfig(cardIdx, 'fat', 'step_size', parseFloat(e.target.value) || 0)}
                                  className="h-8 text-xs bg-white"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 block font-semibold">{locale === 'hi' ? 'बोनस राशि' : 'Bonus Rate'}</span>
                                <Input
                                  type="number"
                                  step="0.05"
                                  value={card.fat_bonus[0]?.bonus_rate ?? 0.10}
                                  onChange={(e) => updateBonusConfig(cardIdx, 'fat', 'bonus_rate', parseFloat(e.target.value) || 0)}
                                  className="h-8 text-xs bg-white font-semibold text-emerald-600"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 block font-semibold">{locale === 'hi' ? 'जुर्माना दर' : 'Penalty Rate'}</span>
                                <Input
                                  type="number"
                                  step="0.05"
                                  value={card.fat_bonus[0]?.penalty_rate ?? 0.15}
                                  onChange={(e) => updateBonusConfig(cardIdx, 'fat', 'penalty_rate', parseFloat(e.target.value) || 0)}
                                  className="h-8 text-xs bg-white font-semibold text-rose-600"
                                />
                              </div>
                            </div>
                          </div>

                          {/* SNF Bonus Config */}
                          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2">
                            <span className="text-[11px] font-bold text-emerald-700 block uppercase">
                              🥛 {t('rates.snfBonusPenalty')}
                            </span>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 block font-semibold">{t('rates.baseVal')} (SNF)</span>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={card.snf_bonus[0]?.base_val ?? 8.5}
                                  onChange={(e) => updateBonusConfig(cardIdx, 'snf', 'base_val', parseFloat(e.target.value) || 0)}
                                  className="h-8 text-xs bg-white"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 block font-semibold">{t('rates.stepSize')}</span>
                                <Input
                                  type="number"
                                  step="0.05"
                                  value={card.snf_bonus[0]?.step_size ?? 0.1}
                                  onChange={(e) => updateBonusConfig(cardIdx, 'snf', 'step_size', parseFloat(e.target.value) || 0)}
                                  className="h-8 text-xs bg-white"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 block font-semibold">{locale === 'hi' ? 'बोनस राशि' : 'Bonus Rate'}</span>
                                <Input
                                  type="number"
                                  step="0.05"
                                  value={card.snf_bonus[0]?.bonus_rate ?? 0.12}
                                  onChange={(e) => updateBonusConfig(cardIdx, 'snf', 'bonus_rate', parseFloat(e.target.value) || 0)}
                                  className="h-8 text-xs bg-white font-semibold text-emerald-600"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 block font-semibold">{locale === 'hi' ? 'जुर्माना दर' : 'Penalty Rate'}</span>
                                <Input
                                  type="number"
                                  step="0.05"
                                  value={card.snf_bonus[0]?.penalty_rate ?? 0.20}
                                  onChange={(e) => updateBonusConfig(cardIdx, 'snf', 'penalty_rate', parseFloat(e.target.value) || 0)}
                                  className="h-8 text-xs bg-white font-semibold text-rose-600"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* LIVE RATE MATRIX PREVIEW - RIGHT (5 Columns) */}
            <div className="xl:col-span-5 space-y-6">
              <div className="rounded-2xl border border-white/40 bg-white/80 p-5 shadow-xl backdrop-blur-xl space-y-4 sticky top-6">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-slate-800">
                    📊 {t('rates.rateMatrix')}
                  </h3>
                  <span className="text-[10px] text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">
                    {calculationType.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="text-xs text-slate-500 italic leading-relaxed">
                  {locale === 'hi'
                    ? 'नीचे दिए गए ग्रिड निर्देशांक वास्तविक समय में आपके द्वारा जोड़े गए चरणों और बोनस नियमों के आधार पर गणना किए जाते हैं।'
                    : 'The grid coordinates below calculate in real-time based on the steps, offsets and base rates configured.'}
                </p>

                {/* Matrix View Table */}
                <div className="overflow-x-auto border rounded-xl shadow-inner bg-slate-50 max-h-[380px]">
                  <table className="w-full text-center text-xs select-none">
                    <thead className="bg-slate-100 sticky top-0 font-bold border-b text-[10px]">
                      <tr>
                        <th className="px-2.5 py-2 border-r bg-slate-200">
                          FAT / SNF
                        </th>
                        {matrixData.snfHeaders.map(snf => (
                          <th key={snf} className="px-2 py-2 border-r">
                            {snf.toFixed(1)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixData.fatHeaders.map((fat, fatIdx) => (
                        <tr key={fat} className="border-b hover:bg-slate-100/50">
                          <td className="px-2.5 py-1.5 border-r font-bold bg-slate-200/50 sticky left-0 text-[10px]">
                            {fat.toFixed(1)}
                          </td>
                          {matrixData.matrix[fatIdx].map((rate, snfIdx) => (
                            <td
                              key={snfIdx}
                              className={`px-1.5 py-1.5 border-r font-bold ${
                                rate > 0
                                  ? milkType === 'cow'
                                    ? 'text-blue-700 bg-blue-50/10'
                                    : 'text-emerald-700 bg-emerald-50/10'
                                  : 'text-slate-300'
                              }`}
                            >
                              {rate > 0 ? rate.toFixed(2) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 justify-end border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setView('list')}
                    className="bg-white/60 hover:bg-slate-50 border-slate-200 font-semibold"
                  >
                    {t('rates.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 shadow-lg font-bold"
                  >
                    {t('rates.saveRateChart')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Multi-format Import Overlay Dialog (Excel / JSON) */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in-0 duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-white/40 bg-white/95 p-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h2 className="text-xl font-bold text-slate-800">{t('rates.importTitle')}</h2>
              <button
                onClick={() => {
                  setIsImportOpen(false)
                  setSelectedFile(null)
                  setImportError('')
                }}
                className="rounded-lg p-1 hover:bg-slate-100 text-slate-500"
              >
                ✕
              </button>
            </div>

            {importError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-600 font-semibold leading-relaxed max-h-[120px] overflow-y-auto">
                ⚠️ {importError}
              </div>
            )}

            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) {
                    setSelectedFile(file)
                    setImportError('')
                  }
                }}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 scale-[1.02]'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".xlsx,.xls,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setSelectedFile(file)
                      setImportError('')
                    }
                  }}
                />
                
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 mb-4">
                  <span className="text-3xl">📥</span>
                </div>
                
                <p className="text-sm font-bold text-slate-800 text-center">
                  {locale === 'hi' ? 'एक्सेल (.xlsx) या JSON फ़ाइल खींचें और छोड़ें' : 'Drag & Drop Excel (.xlsx) or JSON file'}
                </p>
                <p className="text-xs text-slate-500 text-center mt-1">
                  {locale === 'hi' ? 'या ब्राउज़ करने के लिए क्लिक करें' : 'or click to browse your files'}
                </p>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-3 shadow-xs">
                  <div className="flex items-center gap-3 pl-3">
                    <span className="text-2xl">
                      {selectedFile.name.endsWith('.json') ? '📄' : '📊'}
                    </span>
                    <div className="text-left py-2">
                      <p className="text-sm font-bold text-slate-800 truncate max-w-[240px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500 font-semibold">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFile(null)
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500 transition-colors mr-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="text-[10px] text-slate-500 bg-slate-100/50 p-3 rounded-xl border border-slate-200/60 leading-relaxed text-left">
                <span className="font-bold text-slate-700 block mb-1">
                  💡 {locale === 'hi' ? 'निर्देश:' : 'Instructions:'}
                </span>
                <ul className="list-disc pl-4 space-y-0.5 font-semibold">
                  <li>{locale === 'hi' ? 'समर्थित फ़ाइल स्वरूप: .xlsx, .xls, .json' : 'Supported formats: Excel (.xlsx, .xls) and JSON (.json).'}</li>
                  <li>{locale === 'hi' ? 'एक्सेल फ़ाइल में 4 विशिष्ट शीट होनी चाहिए: "Rate Charts", "FAT Steps", "SNF Steps", "Bonus Penalties" डेटा मैपिंग के लिए।' : 'Excel templates must contain four sheets: "Rate Charts", "FAT Steps", "SNF Steps", "Bonus Penalties" mapping the relational data.'}</li>
                  <li>{locale === 'hi' ? 'पुराने दर चार्ट बैकअप प्रारूपों के साथ पूरी तरह संगत।' : 'Backwards compatible with legacy JSON backup files.'}</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsImportOpen(false)
                    setSelectedFile(null)
                    setImportError('')
                  }}
                  className="bg-white/60 hover:bg-slate-50 border-slate-200 font-semibold"
                >
                  {t('rates.cancel')}
                </Button>
                <Button
                  onClick={() => selectedFile && handleFileImport(selectedFile)}
                  disabled={!selectedFile || importing}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 shadow-lg font-bold disabled:opacity-50"
                >
                  {importing 
                    ? (locale === 'hi' ? 'आयात हो रहा है...' : 'Importing...') 
                    : (locale === 'hi' ? 'फ़ाइल आयात करें' : 'Import File')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in-0 duration-200">
          <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/95 p-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              {t('rates.confirmDeleteTitle')}
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed font-semibold">
              {t('rates.confirmDeleteText')}
            </p>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
                className="bg-white/60 hover:bg-slate-50 border-slate-200 font-semibold"
              >
                {t('rates.cancel')}
              </Button>
              <Button
                onClick={async () => {
                  const id = deleteConfirmId
                  setDeleteConfirmId(null)
                  const res = await deleteRateChart(id)
                  if (!res.success) {
                    showToast(res.error || 'Failed to delete rate chart', 'error')
                  } else {
                    showToast(t('rates.toastDeleted'), 'success')
                    fetchCharts()
                  }
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg font-semibold"
              >
                {t('rates.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Dynamic Toasts alerts system */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-900/95 px-5 py-4 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
            toast.type === 'success' ? 'bg-emerald-500 text-slate-900' : 'bg-rose-500 text-white'
          }`}>
            {toast.type === 'success' ? '✓' : '⚠️'}
          </div>
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}
    </div>
  )
}
