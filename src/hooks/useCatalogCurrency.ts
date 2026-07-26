import { useState, useEffect } from 'react'
import { fmtCurrency } from '@/lib/utils'

export type CatalogCurrency = 'EUR' | 'USD' | 'GBP' | 'MAD' | 'TND' | 'CHF'

export const CATALOG_CURRENCIES: { value: CatalogCurrency; label: string; flag: string }[] = [
  { value: 'EUR', label: 'EUR – Euro',           flag: '🇪🇺' },
  { value: 'USD', label: 'USD – Dollar US',      flag: '🇺🇸' },
  { value: 'GBP', label: 'GBP – Livre sterling', flag: '🇬🇧' },
  { value: 'MAD', label: 'MAD – Dirham',         flag: '🇲🇦' },
  { value: 'TND', label: 'TND – Dinar',          flag: '🇹🇳' },
  { value: 'CHF', label: 'CHF – Franc suisse',   flag: '🇨🇭' },
]

const LS_KEY = 'vhub_catalog_currency'

// Module-level cache so rates survive re-renders without re-fetching
const rateCache: Record<string, Record<string, number>> = {}

async function fetchRate(from: string, to: string): Promise<number | null> {
  // Frankfurter (ECB data, CORS-enabled, covers EUR/USD/GBP/CHF/MAD)
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`)
    if (res.ok) {
      const data = await res.json()
      if (data.rates?.[to] != null) return data.rates[to] as number
    }
  } catch { /* ignore */ }

  // Fallback: fawazahmed0 via jsDelivr (160+ currencies, includes TND, MAD)
  try {
    const res = await fetch(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from.toLowerCase()}.min.json`
    )
    if (res.ok) {
      const data = await res.json()
      return data[from.toLowerCase()]?.[to.toLowerCase()] ?? null
    }
  } catch { /* ignore */ }

  return null
}

export function useCatalogCurrency(baseCurrency: string) {
  const [displayCurrency, setDisplayCurrencyState] = useState<CatalogCurrency>(() => {
    const stored = localStorage.getItem(LS_KEY) as CatalogCurrency | null
    return stored ?? 'EUR'
  })
  const [rate, setRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)

  const setDisplayCurrency = (c: CatalogCurrency) => {
    localStorage.setItem(LS_KEY, c)
    setDisplayCurrencyState(c)
  }

  useEffect(() => {
    const base = baseCurrency.toUpperCase()
    const target = displayCurrency.toUpperCase()

    if (!base || base === target) {
      setRate(1)
      return
    }

    const cached = rateCache[base]?.[target]
    if (cached != null) {
      setRate(cached)
      return
    }

    setRateLoading(true)
    fetchRate(base, target).then(r => {
      if (r != null) {
        if (!rateCache[base]) rateCache[base] = {}
        rateCache[base][target] = r
      }
      setRate(r)
      setRateLoading(false)
    })
  }, [baseCurrency, displayCurrency])

  const isConverted = displayCurrency !== baseCurrency.toUpperCase()

  const formatAmount = (amount: number): string => {
    if (!isConverted || rate == null) return fmtCurrency(amount, baseCurrency || 'TND')
    const converted = Math.round(amount * rate * 100) / 100
    return fmtCurrency(converted, displayCurrency)
  }

  return {
    displayCurrency,
    setDisplayCurrency,
    rate,
    rateLoading,
    isConverted,
    formatAmount,
  }
}
