import { useAuthStore } from '@/stores/auth.store'

export const PROPERTY_TYPE_LIST = [
  'Villa', 'Appartement', 'Maison', 'Riad', 'Chalet', 'Bungalow', 'Studio',
]

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
  const types = Array.isArray(tenant?.property_types) && tenant!.property_types!.length > 0
    ? tenant!.property_types as string[]
    : ['Villa']

  const isMultiType = types.length > 1

  if (isMultiType) {
    return { singular: 'bien', plural: 'biens', isMultiType: true, types }
  }

  const type = types[0]
  const plural = PLURALS[type] ?? `${type}s`

  return { singular: type, plural, isMultiType: false, types }
}
