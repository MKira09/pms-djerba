import { useAuthStore } from '@/stores/auth.store'

const PLURALS: Record<string, string> = {
  Villa: 'Villas',
  Appartement: 'Appartements',
  Maison: 'Maisons',
  Riad: 'Riads',
  Chalet: 'Chalets',
  Bungalow: 'Bungalows',
  Studio: 'Studios',
}

export function usePropertyTerm() {
  const { tenant } = useAuthStore()
  const type = tenant?.property_type ?? 'Villa'
  const custom = (tenant?.property_type_custom ?? '').trim()

  const singular = type === 'Autre' ? (custom || 'Bien') : type
  const plural = type === 'Autre'
    ? (custom ? `${custom}s` : 'Biens')
    : (PLURALS[type] ?? `${type}s`)

  return { singular, plural }
}
