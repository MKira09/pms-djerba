import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    botpress?: {
      open?: () => void
      close?: () => void
      toggle?: () => void
      hide?: () => void
      show?: () => void
      on?: (event: string, callback: (...args: unknown[]) => void) => void
      [key: string]: unknown
    }
  }
}

const BOTPRESS_INJECT_URL = 'https://cdn.botpress.cloud/webchat/v5.0/inject.js'
const BOTPRESS_CONFIG_URL = 'https://files.bpcontent.cloud/2026/11/12/16/20261112162307-31XHZR8B.js'
const BOTPRESS_INJECT_ID = 'botpress-inject-script'
const BOTPRESS_CONFIG_ID = 'botpress-config-script'

// Espaces d'administration, dashboard et parcours privé sous authentification
const PRIVATE_ROUTE_PREFIXES = [
  '/dashboard',
  '/villas',
  '/calendar',
  '/reservations',
  '/team',
  '/pricing',
  '/communications',
  '/blacklist',
  '/settings',
  '/billing',
  '/admin',
  '/onboarding',
]

function isPrivateRoute(pathname: string): boolean {
  return PRIVATE_ROUTE_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function loadBotpressScripts(onLoaded?: () => void) {
  if (typeof document === 'undefined') return

  const hasInject = !!document.getElementById(BOTPRESS_INJECT_ID)
  const hasConfig = !!document.getElementById(BOTPRESS_CONFIG_ID)

  if (hasInject && hasConfig) {
    onLoaded?.()
    return
  }

  const appendConfigScript = () => {
    if (document.getElementById(BOTPRESS_CONFIG_ID)) {
      onLoaded?.()
      return
    }
    const configScript = document.createElement('script')
    configScript.id = BOTPRESS_CONFIG_ID
    configScript.src = BOTPRESS_CONFIG_URL
    configScript.defer = true
    configScript.onload = () => {
      onLoaded?.()
    }
    document.body.appendChild(configScript)
  }

  if (!hasInject) {
    const injectScript = document.createElement('script')
    injectScript.id = BOTPRESS_INJECT_ID
    injectScript.src = BOTPRESS_INJECT_URL
    injectScript.async = true
    injectScript.onload = appendConfigScript
    document.body.appendChild(injectScript)
  } else {
    appendConfigScript()
  }
}

export default function BotpressChat() {
  const location = useLocation()

  useEffect(() => {
    const isPrivate = isPrivateRoute(location.pathname)

    const syncVisibility = () => {
      if (isPrivate) {
        document.body.classList.add('hide-botpress-chat')
        window.botpress?.close?.()
        window.botpress?.hide?.()
      } else {
        document.body.classList.remove('hide-botpress-chat')
        window.botpress?.show?.()
      }
    }

    if (!isPrivate) {
      // Chargement unique des scripts lors de la navigation sur une page publique
      loadBotpressScripts(() => {
        syncVisibility()
        // Botpress monte ses composants DOM de manière asynchrone après chargement
        setTimeout(syncVisibility, 300)
        setTimeout(syncVisibility, 1000)
      })
    } else {
      syncVisibility()
    }
  }, [location.pathname])

  return null
}

