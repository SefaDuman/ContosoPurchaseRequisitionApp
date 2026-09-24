import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppStateProvider } from './state/AppState'
import { AssistantProvider } from './state/AssistantContext'
import { handleAuthBrokerPage } from './services/assistantClient'

// If this page load is the sign-in broker popup, let it drive MSAL and close
// itself instead of booting the full app.
void handleAuthBrokerPage().then((handled) => {
  if (handled) return
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppStateProvider>
        <AssistantProvider>
          <App />
        </AssistantProvider>
      </AppStateProvider>
    </StrictMode>,
  )
})
