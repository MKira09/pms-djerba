import { useEffect } from 'react'

const DEFAULTS = {
  title: 'VillaHub – Gérez vos locations de villa sans Excel',
  description:
    'Réservations, calendrier, emails automatisés : VillaHub centralise la gestion de vos locations saisonnières. Fini les tableaux Excel qui débordent.',
}

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = value
}

export function usePageMeta({
  title = DEFAULTS.title,
  description = DEFAULTS.description,
}: {
  title?: string
  description?: string
} = {}) {
  useEffect(() => {
    document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
  }, [title, description])
}
