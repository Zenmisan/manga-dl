import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
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
