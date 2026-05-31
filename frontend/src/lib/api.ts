import axios from 'axios'

const isProd = import.meta.env.PROD
const api = axios.create({
  // Use absolute URL in production, relative /api for local dev proxy
  baseURL: isProd ? 'https://manga-dl.onrender.com/api' : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Optional: Add X-API-Key if set in local storage
api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('manga-api-key')
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey
  }
  return config
})

export default api
