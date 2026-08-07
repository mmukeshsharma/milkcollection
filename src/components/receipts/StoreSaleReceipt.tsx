import React from 'react'
import { buildStoreSaleText, RECEIPT_FONT_FAMILY, type PrinterSettings } from '@/lib/printer-service'

interface Props {
  data: any
  settings: PrinterSettings
  locale?: 'en' | 'hi'
  mode?: 'preview' | 'print'
}

export const StoreSaleReceipt: React.FC<Props> = ({ data, settings, locale = 'en', mode = 'print' }) => {
  const text = buildStoreSaleText(data, settings, locale)
  const is58mm = settings.paperWidth === '58mm'
  const charWidth = is58mm ? 32 : 48
  const feedPadding = `${settings.paperFeedAfterPrint ?? 5}mm`

  return (
    <pre
      style={{
        fontFamily: RECEIPT_FONT_FAMILY,
        fontSize: mode === 'preview' ? '13px' : '10px',
        lineHeight: 1.3,
        color: '#000000',
        backgroundColor: '#FFFFFF',
        margin: '0 auto',
        padding: mode === 'preview' ? '12px 16px' : `0 0 ${feedPadding} 0`,
        width: `${charWidth}ch`,
        whiteSpace: 'pre',
        wordBreak: 'break-all',
        boxSizing: 'content-box',
      }}
    >
      {text}
    </pre>
  )
}
