import { CATALOG_CURRENCIES, type CatalogCurrency } from '@/hooks/useCatalogCurrency'

interface Props {
  value: CatalogCurrency
  onChange: (c: CatalogCurrency) => void
  loading?: boolean
}

export default function CurrencySelector({ value, onChange, loading }: Props) {
  const selected = CATALOG_CURRENCIES.find(c => c.value === value)

  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value as CatalogCurrency)}
        className="appearance-none bg-white border border-gray-200 rounded-xl pl-8 pr-7 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#07BEB8] cursor-pointer"
        aria-label="Sélectionner la devise"
      >
        {CATALOG_CURRENCIES.map(c => (
          <option key={c.value} value={c.value}>
            {c.flag} {c.value}
          </option>
        ))}
      </select>

      {/* Flag overlay */}
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm leading-none">
        {selected?.flag ?? '🌐'}
      </span>

      {/* Chevron */}
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
        {loading ? (
          <span className="inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : '▾'}
      </span>
    </div>
  )
}
