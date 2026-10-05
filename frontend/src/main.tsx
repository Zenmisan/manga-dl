import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { ToastProvider } from './components/common/Toast.tsx'
import { initBackendFailover } from './lib/api.ts'
import './index.css'

if (localStorage.getItem('manga-api-key') === null) {
  localStorage.setItem('manga-api-key', 'mgdl-creator')
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

initBackendFailover().then(() => {
  const staticShell = document.getElementById('root-static')
  if (staticShell) staticShell.remove()
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  )
})
