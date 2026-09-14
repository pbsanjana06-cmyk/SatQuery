import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SatQuery runtime error', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: '100vh', background: '#020617', color: '#fecaca', padding: '32px', fontFamily: 'system-ui' }}>
          <h1>SatQuery could not load</h1>
          <p>{this.state.error.message}</p>
          <p style={{ color: '#cbd5e1' }}>Refresh the page and try again. If this continues, send this error message.</p>
        </main>
      )
    }

    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
