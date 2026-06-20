import axios, { AxiosError } from 'axios'

const isDev = (import.meta as any).env?.DEV
const api = axios.create({
  baseURL: isDev ? 'http://localhost:8000/api/v1' : '/api/v1',
})

export const setToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    localStorage.setItem('token', token)
  } else {
    delete api.defaults.headers.common.Authorization
    localStorage.removeItem('token')
    localStorage.removeItem('session')
  }
}

const savedToken = localStorage.getItem('token')
if (savedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${savedToken}`
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      setToken(null)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
