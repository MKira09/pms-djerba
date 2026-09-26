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

// Genre grammatical de chaque type de bien, pour accorder correctement les
// articles / adjectifs dans l'interface ("un/une", "le/la", "premier/première"...).
// Le terme générique multi-types ("bien") est masculin.
const GENDERS: Record<string, 'm' | 'f'> = {
  Villa: 'f',
  Appartement: 'm',
  Maison: 'f',
  Riad: 'm',
  Chalet: 'm',
  Bungalow: 'm',
  Studio: 'm',
}

function startsWithVowelSound(word: string) {
  return /^[aeiouyàâäéèêëïîôöùûü]/i.test(word)
}

export function usePropertyTerm() {
  const { tenant } = useAuthStore()
  const types = (tenant?.property_types?.length ?? 0) > 0
    ? (tenant!.property_types as string[])
    : ['Villa']

  const isMultiType = types.length > 1

  const singular = isMultiType ? 'bien' : types[0]
  const plural = isMultiType ? 'biens' : (PLURALS[types[0]] ?? `${types[0]}s`)
  const gender: 'm' | 'f' = isMultiType ? 'm' : (GENDERS[types[0]] ?? 'm')

  const lower = singular.toLowerCase()
  const elided = startsWithVowelSound(lower)

  const indefiniteArticle = gender === 'f' ? 'une' : 'un'
  const definiteArticle = elided ? "l'" : (gender === 'f' ? 'la ' : 'le ')
  const possessive = gender === 'f' ? 'ma' : 'mon'
  const noneArticle = gender === 'f' ? 'Aucune' : 'Aucun'
  const allDeterminerPlural = gender === 'f' ? 'Toutes' : 'Tous'
  const firstAdjective = gender === 'f' ? 'première' : 'premier'
  const pastParticipleSuffix = gender === 'f' ? 'e' : ''

  return {
    singular, plural, isMultiType, types, gender,
    indefiniteArticle, definiteArticle, possessive, noneArticle, firstAdjective, pastParticipleSuffix,
    allDeterminerPlural,
  }
}
