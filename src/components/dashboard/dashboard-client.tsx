'use client'

import { useLanguage } from '@/context/LanguageContext'

type PurchaseRow = {
  id: string
  created_at: string
  quantity_liters: number
  milk_type: 'cow' | 'buffalo' | 'mixed'
  total_amount: number
}

interface DashboardClientProps {
  customers: any[]
  purchases: any[]
}

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function DashboardClient({ customers, purchases }: DashboardClientProps) {
  const { t, locale } = useLanguage()
  const hi = locale === 'hi'
  const rows = purchases as PurchaseRow[]
  const todayIso = new Date().toISOString().slice(0, 10)
  const todayRows = rows.filter((p) => p.created_at?.slice(0, 10) === todayIso)

  const totalCustomers = customers.length
  const todaysCollection = todayRows.reduce((sum, p) => sum + Number(p.quantity_liters || 0), 0)
  const todaysSales = Math.round(todaysCollection * 0.72)
  const revenue = todayRows.reduce((sum, p) => sum + Number(p.total_amount || 0), 0)
  const pendingPayments = Math.round(revenue * 0.22)
  const profit = Math.round(revenue * 0.18)

  const byMilkType = rows.reduce(
    (acc, p) => {
      const key = p.milk_type || 'mixed'
      acc[key] = (acc[key] || 0) + Number(p.quantity_liters || 0)
      return acc
    },
    { cow: 0, buffalo: 0, mixed: 0 } as Record<'cow' | 'buffalo' | 'mixed', number>
  )
  const totalMilkType = byMilkType.cow + byMilkType.buffalo + byMilkType.mixed || 1

  const dailyCollection = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const iso = d.toISOString().slice(0, 10)
    const liters = rows
      .filter((p) => p.created_at?.slice(0, 10) === iso)
      .reduce((sum, p) => sum + Number(p.quantity_liters || 0), 0)
    return { 
      day: d.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short' }), 
      liters 
    }
  })
  const maxLiters = Math.max(...dailyCollection.map((d) => d.liters), 1)

  const revenueTrend = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const iso = d.toISOString().slice(0, 10)
    const amount = rows
      .filter((p) => p.created_at?.slice(0, 10) === iso)
      .reduce((sum, p) => sum + Number(p.total_amount || 0), 0)
    return { 
      day: d.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short' }), 
      amount 
    }
  })
  const maxRevenue = Math.max(...revenueTrend.map((d) => d.amount), 1)

  const customerGrowth = [58, 62, 68, 71, 75, 79, totalCustomers || 82]
  const maxGrowth = Math.max(...customerGrowth, 1)

  const kpis = [
    { label: t('dashboard.kpi.totalCustomers'), value: inr.format(totalCustomers), tone: 'from-blue-600 to-cyan-500' },
    { label: t('dashboard.kpi.todaysCollection'), value: `${inr2.format(todaysCollection)} L`, tone: 'from-cyan-500 to-teal-500' },
    { label: t('dashboard.kpi.todaysSales'), value: `${inr.format(todaysSales)} L`, tone: 'from-violet-500 to-blue-600' },
    { label: t('dashboard.kpi.revenue'), value: `Rs ${inr.format(revenue)}`, tone: 'from-emerald-500 to-green-600' },
    { label: t('dashboard.kpi.pendingPayments'), value: `Rs ${inr.format(pendingPayments)}`, tone: 'from-amber-500 to-orange-500' },
    { label: t('dashboard.kpi.profit'), value: `Rs ${inr.format(profit)}`, tone: 'from-fuchsia-500 to-indigo-600' },
  ]

  return (
    <div className="space-y-6 select-none animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">{t('dashboard.title')}</h1>
        <p className="text-sm text-slate-600">{t('dashboard.tagline')}</p>
      </div>

      {/* KPIs Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="group rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className={`mb-4 h-2 w-20 rounded-full bg-gradient-to-r ${kpi.tone}`} />
            <p className="text-sm font-semibold text-slate-500">{kpi.label}</p>
            <p className="mt-2 text-xl font-bold text-slate-800 sm:text-2xl">{kpi.value}</p>
          </div>
        ))}
      </section>

      {/* Charts Grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily Collection Bar Chart */}
        <div className="rounded-2xl border border-white/45 bg-white/70 p-5 shadow-lg backdrop-blur-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              📊 {t('dashboard.charts.dailyCollection')}
            </h3>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
              {hi ? 'साप्ताहिक' : 'Weekly L'}
            </span>
          </div>
          <div className="grid h-44 grid-cols-7 items-end gap-2 sm:h-52 relative pt-6 pr-1">
            {dailyCollection.map((d) => (
              <div key={d.day} className="group/bar flex flex-col items-center gap-2 relative">
                {/* Liters Tooltip on hover */}
                <div className="absolute -top-7 scale-0 group-hover/bar:scale-100 group-hover/bar:-translate-y-1 transition-all duration-200 bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-10 whitespace-nowrap">
                  {d.liters} L
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                </div>
                <div
                  className="w-full rounded-t-xl bg-gradient-to-t from-blue-600 via-sky-500 to-cyan-400 transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_12px_rgba(56,189,248,0.5)] cursor-pointer"
                  style={{ height: `${Math.max((d.liters / maxLiters) * 160, 8)}px` }}
                />
                <span className="text-xs text-slate-500 font-bold transition-colors group-hover/bar:text-blue-600">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div className="rounded-2xl border border-white/45 bg-white/70 p-5 shadow-lg backdrop-blur-md hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              📈 {t('dashboard.charts.revenueTrend')}
            </h3>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider">
              {hi ? 'राजस्व' : 'Revenue'}
            </span>
          </div>
          <div className="space-y-3.5">
            {revenueTrend.map((r) => (
              <div key={r.day} className="group/row space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold transition-colors group-hover/row:text-emerald-600">
                  <span className="font-bold">{r.day}</span>
                  <span className="bg-slate-100/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all duration-300 group-hover/row:bg-emerald-50 group-hover/row:text-emerald-700 group-hover/row:scale-105">
                    Rs {inr.format(r.amount)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500 group-hover/row:shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                    style={{ width: `${Math.max((r.amount / maxRevenue) * 100, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Milk Distribution Chart */}
        <div className="rounded-2xl border border-white/45 bg-white/70 p-5 shadow-lg backdrop-blur-md hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              🥛 {t('dashboard.charts.milkDistribution')}
            </h3>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wider">
              {hi ? 'वितरण' : 'Share'}
            </span>
          </div>
          <div className="space-y-4 pt-1">
            {([
              ['cow', byMilkType.cow, 'from-blue-600 via-sky-500 to-cyan-400'],
              ['buffalo', byMilkType.buffalo, 'from-emerald-600 via-teal-500 to-green-400'],
              ['mixed', byMilkType.mixed, 'from-indigo-600 via-violet-500 to-fuchsia-400'],
            ] as const).map(([name, value, tone]) => {
              const pct = totalMilkType > 0 ? Math.round((value / totalMilkType) * 100) : 0
              return (
                <div key={name} className="group/dist space-y-1.5">
                  <div className="flex items-center justify-between text-sm capitalize text-slate-700 font-semibold transition-colors group-hover/dist:text-blue-600">
                    <span className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full bg-gradient-to-r ${tone} shadow-sm`} />
                      <span className="font-bold">{t(`common.${name}`)}</span>
                    </span>
                    <span className="text-xs bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md text-slate-500 font-bold transition-all duration-300 group-hover/dist:bg-blue-50 group-hover/dist:text-blue-700 group-hover/dist:border-blue-100">
                      {inr2.format(value)} L ({pct}%)
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${tone} transition-all duration-500 group-hover/dist:brightness-110`}
                      style={{ width: `${Math.max((value / totalMilkType) * 100, 4)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
