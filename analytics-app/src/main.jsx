import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import L from 'leaflet'
window.L = L;
import 'leaflet.heat'
import './index.css'
import App from './App.jsx'

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Dashboard Error caught by RootErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#F8FAFC',
          color: '#0F172A',
          padding: '24px'
        }}>
          <div style={{
            background: '#FFFFFF',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            maxWidth: '560px',
            textAlign: 'center',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#DC2626' }}>
              Dashboard Render Notice
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '18px' }}>
              {this.state.error?.message || "An unexpected issue occurred while rendering."}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)

