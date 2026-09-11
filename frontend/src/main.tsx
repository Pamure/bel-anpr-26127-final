import React, { Component, ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Tactical Command Center Uncaught Error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#04060A] text-[#F1F5F9] flex flex-col items-center justify-center p-6 font-mono">
          <div className="max-w-md w-full p-6 rounded-xl bg-[#0E131F] border border-[#FF334B] shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 rounded-full bg-[#FF334B] animate-pulse" />
              <h1 className="text-sm font-bold text-[#FF334B] uppercase tracking-wider">
                TACTICAL SYSTEM RECOVERY
              </h1>
            </div>
            <p className="text-xs text-[#94A3B8] mb-4">
              An unexpected render interrupt occurred:
            </p>
            <div className="p-3 bg-black/60 rounded border border-[#222B3D] text-[11px] text-[#FFB020] mb-4 overflow-x-auto whitespace-pre-wrap">
              {this.state.error?.message || 'Unknown runtime interrupt'}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
              className="w-full py-2 bg-[#00E599] hover:bg-[#00E599]/90 text-black font-bold text-xs rounded transition-all cursor-pointer"
            >
              RESTART TACTICAL CONSOLE
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
