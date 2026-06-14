import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { Component, type ReactNode } from 'react'

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: {children: ReactNode}) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('CRITICAL FRONTEND CRASH [Telemetry Caught]:', error, errorInfo)
    // Here we would push to Sentry/Datadog via API
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#09090b] text-white">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Application Crash Detected</h1>
          <p className="text-zinc-400">The engineering team has been notified via Sentry.</p>
          <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md text-sm">Reload Application</button>
        </div>
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
