'use client'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/LanguageContext'

interface PaginationProps {
  page: number
  totalItems: number
  itemsPerPage: number
  onChangePage: (page: number) => void
  onChangeItemsPerPage: (itemsPerPage: number) => void
  itemLabel?: string
}

export function Pagination({
  page,
  totalItems,
  itemsPerPage,
  onChangePage,
  onChangeItemsPerPage,
  itemLabel = 'entries',
}: PaginationProps) {
  const { locale } = useLanguage()

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const startItem = (page - 1) * itemsPerPage + 1
  const endItem = Math.min(page * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (page <= 2) {
        pages.push(1, 2, '..', totalPages - 1, totalPages)
      } else if (page >= totalPages - 1) {
        pages.push(1, 2, '..', totalPages - 1, totalPages)
      } else {
        pages.push(1, '..', page, '..', totalPages)
      }
    }
    return pages
  }

  const sizes = [10, 25, 100, 200, 500]

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-slate-500 text-xs shrink-0">
      {/* Mobile view: "10 of 12 products Per page: 10" in a single row */}
      <div className="flex sm:hidden items-center justify-between w-full">
        <span>
          {endItem} {locale === 'hi' ? 'कुल' : 'of'} {totalItems} {itemLabel}
        </span>
        <div className="flex items-center gap-1">
          <span>{locale === 'hi' ? 'प्रति पृष्ठ:' : 'Per page:'}</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              onChangeItemsPerPage(Number(e.target.value))
              onChangePage(1)
            }}
            className="h-6 rounded border border-slate-200 bg-white px-1.5 py-0 text-[10px] text-slate-700 shadow-sm focus:outline-none cursor-pointer"
          >
            {sizes.map((sz) => (
              <option key={sz} value={sz}>
                {sz}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop view: "Showing 1 to 10 of 12 products Per page: 10" */}
      <div className="hidden sm:flex flex-wrap items-center gap-3 w-full sm:w-auto text-left justify-start shrink-0">
        <span>
          {locale === 'hi' ? 'दिखा रहा है' : 'Showing'}{' '}
          <span className="font-semibold">{totalItems === 0 ? 0 : startItem}</span>{' '}
          {locale === 'hi' ? 'से' : 'to'}{' '}
          <span className="font-semibold">{endItem}</span>{' '}
          {locale === 'hi' ? 'कुल' : 'of'}{' '}
          <span className="font-semibold">{totalItems}</span>{' '}
          {itemLabel}
        </span>
        
        <div className="flex items-center gap-1.5 justify-center">
          <span>{locale === 'hi' ? 'प्रति पृष्ठ:' : 'Per page:'}</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              onChangeItemsPerPage(Number(e.target.value))
              onChangePage(1)
            }}
            className="h-7 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {sizes.map((sz) => (
              <option key={sz} value={sz}>
                {sz}
              </option>
            ))}
          </select>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1 justify-center w-full sm:w-auto shrink-0 py-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChangePage(page - 1)}
            disabled={page === 1}
            className="bg-white hover:bg-slate-50 text-xs py-1 px-2.5 h-7 border border-slate-200 disabled:opacity-50"
            title={locale === 'hi' ? 'पिछला' : 'Prev'}
          >
            &lt;
          </Button>
          
          {getPageNumbers().map((p, i) => {
            if (p === '..') {
              return (
                <span key={`ellipsis-${i}`} className="px-1.5 py-1 text-slate-400 select-none">
                  ..
                </span>
              )
            }
            const pageNum = p as number
            return (
              <Button
                key={`page-${pageNum}`}
                variant={page === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => onChangePage(pageNum)}
                className={`text-xs py-1 px-2.5 h-7 min-w-[28px] ${
                  page === pageNum
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {pageNum}
              </Button>
            )
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onChangePage(page + 1)}
            disabled={page === totalPages}
            className="bg-white hover:bg-slate-50 text-xs py-1 px-2.5 h-7 border border-slate-200 disabled:opacity-50"
            title={locale === 'hi' ? 'अगला' : 'Next'}
          >
            &gt;
          </Button>
        </div>
      )}
    </div>
  )
}
