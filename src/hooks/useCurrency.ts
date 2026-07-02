import { useAuthStore } from '@/stores/auth.store'
import { fmtCurrency } from '@/lib/utils'

export function useCurrency() {
  const { tenant } = useAuthStore()
  const currency = tenant?.currency ?? 'EUR'
  const fmt = (amount: number) => fmtCurrency(amount, currency)
  return { currency, fmt }
}
