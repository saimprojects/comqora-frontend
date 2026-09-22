import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from './features/auth/AuthContext'
import App from './App'
import AppErrorBoundary from './components/AppErrorBoundary'
import { ThemeProvider, useTheme } from './components/Theme'
import './styles.css'
import './enhancements.css'
import './comqora.css'
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})
function Notifications() {
  const { theme } = useTheme()
  return <Toaster theme={theme} position="bottom-right" richColors closeButton />
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppErrorBoundary>
              <App />
            </AppErrorBoundary>
            <Notifications />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
