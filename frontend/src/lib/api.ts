const isDev = (import.meta as any).env?.DEV
const baseURL = isDev ? 'http://localhost:8000/api/v1' : '/api/v1'

export const setToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem('token')
    localStorage.removeItem('session')
  }
}

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${baseURL}${path}`
  
  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch (netErr: any) {
    const error: any = new Error(netErr.message || 'Network error')
    error.response = { status: 0, data: { detail: 'Network error or server unreachable' } }
    throw error
  }

  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('session')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  let data: any = null
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    data = await response.json()
  } else {
    data = await response.text()
  }

  if (!response.ok) {
    const error: any = new Error(data?.detail || 'Request failed')
    error.response = {
      status: response.status,
      data: data && typeof data === 'object' ? data : { detail: data },
    }
    throw error
  }

  return { data }
}

const api = {
  get: <T = any>(url: string, options?: RequestInit) => 
    request(url, { method: 'GET', ...options }) as Promise<{ data: T }>,
  post: <T = any>(url: string, body?: any, options?: RequestInit) => 
    request(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      ...options,
    }) as Promise<{ data: T }>,
  put: <T = any>(url: string, body?: any, options?: RequestInit) => 
    request(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      ...options,
    }) as Promise<{ data: T }>,
  delete: <T = any>(url: string, options?: RequestInit) => 
    request(url, { method: 'DELETE', ...options }) as Promise<{ data: T }>,
}

export default api
