import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border border-red-100 p-8 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Une erreur est survenue</h1>
          <p className="text-gray-500 text-sm mb-6">
            L'application a rencontré un problème inattendu. Rechargez la page pour réessayer.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
            <p className="text-xs font-mono text-red-600 break-all">{error.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-brand-900 hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
          >
            Recharger la page
          </button>
        </div>
      </div>
    )
  }
}
