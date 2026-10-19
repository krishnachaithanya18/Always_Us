import axios, { type AxiosError } from 'axios'
import type {
  AuthResponse,
  RegisterResponse,
  HealthStatus,
  Letter,
  LetterCreate,
  LetterListResponse,
  Memory,
  MemoryCreate,
  MemoryListResponse,
  MemoryUpdate,
  AppSettings,
} from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Inject auth token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('always_us_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('always_us_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ---- Auth ----------------------------------------------------------------

export const authApi = {
  register: (accountCode: string, passcode: string) =>
    api.post<RegisterResponse>('/auth/register', { account_code: accountCode, passcode }).then((r) => r.data),
  login: (accountCode: string, passcode: string) =>
    api.post<AuthResponse>('/auth/login', { account_code: accountCode, passcode }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  changePasscode: (passcode: string) =>
    api.post('/auth/change-passcode', { passcode }).then((r) => r.data),
}

// ---- Health ---------------------------------------------------------------

export const healthApi = {
  check: () => api.get<HealthStatus>('/health').then((r) => r.data),
}

// ---- Settings ------------------------------------------------------------

export const settingsApi = {
  get: () => api.get<{ settings: AppSettings }>('/settings').then((r) => r.data.settings),
  update: (settings: Partial<AppSettings>) =>
    api
      .put<{ settings: AppSettings }>('/settings', {
        settings: Object.entries(settings).map(([key, value]) => ({ key, value })),
      })
      .then((r) => r.data.settings),
}

// ---- Memories -------------------------------------------------------------

export const memoriesApi = {
  list: (params?: {
    page?: number
    per_page?: number
    tag?: string
    search?: string
    favorites_only?: boolean
  }) => api.get<MemoryListResponse>('/memories', { params }).then((r) => r.data),

  get: (id: string) => api.get<Memory>(`/memories/${id}`).then((r) => r.data),

  create: (data: MemoryCreate) => api.post<Memory>('/memories', data).then((r) => r.data),

  update: (id: string, data: MemoryUpdate) =>
    api.patch<Memory>(`/memories/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/memories/${id}`),

  random: () => api.get<Memory>('/memories/random').then((r) => r.data),

  uploadPhoto: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<Memory>(`/memories/${id}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      })
      .then((r) => r.data)
  },

  photoUrl: (id: string) => `${BASE_URL}/api/v1/memories/${id}/photo`,
}

// ---- Letters --------------------------------------------------------------

export const lettersApi = {
  list: (params?: {
    page?: number
    per_page?: number
    category?: string
    favorites_only?: boolean
    authored_by?: string
  }) => api.get<LetterListResponse>('/letters', { params }).then((r) => r.data),

  get: (id: string) => api.get<Letter>(`/letters/${id}`).then((r) => r.data),

  create: (data: LetterCreate) => api.post<Letter>('/letters', data).then((r) => r.data),

  update: (id: string, data: Partial<LetterCreate> & { is_read?: boolean }) =>
    api.patch<Letter>(`/letters/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/letters/${id}`),

  markRead: (id: string) => api.post<Letter>(`/letters/${id}/mark-read`).then((r) => r.data),
}

// ---- Error helpers -------------------------------------------------------

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string })?.detail
    if (detail) return detail
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.'
    if (!error.response) return 'Cannot connect to the server. Is the backend running?'
    return `Server error (${error.response.status})`
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}
