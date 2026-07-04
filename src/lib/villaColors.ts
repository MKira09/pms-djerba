import type { Villa } from '@/types'

export const VILLA_PALETTE = [
  '#2563EB', // saphir
  '#7C3AED', // améthyste
  '#DB2777', // fuchsia
  '#D97706', // ambre
  '#16A34A', // émeraude
  '#DC2626', // corail
  '#0891B2', // azur
  '#9333EA', // prune
  '#EA580C', // orange
  '#0D9488', // jade
]

export function getVillaColor(villaId: string, villas: Pick<Villa, 'id' | 'color'>[]): string {
  const villa = villas.find(v => v.id === villaId)
  if (villa?.color) return villa.color
  const idx = villas.findIndex(v => v.id === villaId)
  return VILLA_PALETTE[Math.max(0, idx) % VILLA_PALETTE.length]
}
