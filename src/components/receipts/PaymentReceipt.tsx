import React from 'react'
import { buildPaymentText, type PrinterSettings } from '@/lib/printer-service'

interface Props {
  data: any
  settings: PrinterSettings
  locale?: 'en' | 'hi'
}

export const PaymentReceipt: React.FC<Props> = ({ data, settings, locale = 'en' }) => {
  const text = buildPaymentText(data, settings, locale)
  const w = settings.paperWidth === '58mm' ? '58mm' : '80mm'
  const feedPadding = `${settings.paperFeedAfterPrint ?? 5}mm`
  
  return (
    <pre
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '10px',
        lineHeight: 1.2,
        color: '#000',
        margin: '0 auto',
        padding: `0 0 ${feedPadding} 0`,
        width: w,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {text}
    </pre>
  )
}
