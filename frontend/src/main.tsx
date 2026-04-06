import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const rootEl = document.getElementById('root')
const defaultApiUrl = `${window.location.origin.replace(/\/$/, '')}/api`

if (!rootEl) {
  throw new Error('Root element #root not found.')
}

const hasRuntimeConfig = (): boolean =>
  typeof window.RUNTIME_CONFIG?.API_URL === 'string' &&
  window.RUNTIME_CONFIG.API_URL.trim().length > 0

const ensureRuntimeConfig = async (): Promise<void> => {
  if (hasRuntimeConfig()) {
    return
  }

  window.RUNTIME_CONFIG = {
    ...(window.RUNTIME_CONFIG || {}),
    API_URL: defaultApiUrl,
  }
}

const showBootstrapError = (message: string) => {
  rootEl.textContent = message
}

const bootstrap = async () => {
  try {
    await ensureRuntimeConfig()
    const { default: App } = await import('./App')

    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (error) {
    console.error('Frontend bootstrap aborted:', error)
    showBootstrapError('Runtime configuration could not be loaded. App start blocked.')
  }
}

void bootstrap()
