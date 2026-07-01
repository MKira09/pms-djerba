import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', background: '#F5F0E8',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          maxWidth: 480, width: '100%', background: '#fff',
          borderRadius: 16, padding: 40, textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #fecaca',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0D1F2D' }}>
            Une erreur est survenue
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6B7A85' }}>
            Rechargez la page pour réessayer.
          </p>
          <div style={{
            background: '#FEF2F2', borderRadius: 8, padding: '12px 16px',
            marginBottom: 24, textAlign: 'left',
          }}>
            <code style={{ fontSize: 12, color: '#DC2626', wordBreak: 'break-all' }}>
              {error.message}
            </code>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#5F7F3B', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 28px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Recharger la page
          </button>
        </div>
      </div>
    )
  }
}
