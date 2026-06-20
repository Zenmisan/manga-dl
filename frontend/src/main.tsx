import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// Pre-populate default API key for the public backend on fresh installs
if (!localStorage.getItem('manga-api-key')) {
  localStorage.setItem('manga-api-key', 'mgdl-creator')
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
