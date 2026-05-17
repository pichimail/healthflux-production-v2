import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Initialize i18n (react-i18next) BEFORE any component that uses useTranslation() mounts.
// This prevents production chunking/timing issues where i18n.changeLanguage or t() could be undefined.
import '@/components/i18n/i18n.jsx'

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Root render crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#13131a', color: '#f0f0f8', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>HealthFlux failed to load</h1>
          <p style={{ opacity: 0.85, marginBottom: '0.5rem' }}>A startup error occurred in the app bundle.</p>
          <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.75, fontSize: '0.85rem' }}>
            {String(this.state.error?.message || this.state.error || 'Unknown error')}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
  // </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}


