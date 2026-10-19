import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi, getErrorMessage } from '@/services/api'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (accountCode: string, passcode: string) => Promise<void>
  register: (accountCode: string, passcode: string) => Promise<string>
  logout: () => void
  error: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('always_us_token')
    if (!token) {
      setIsLoading(false)
      return
    }
    authApi.me()
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        localStorage.removeItem('always_us_token')
        setIsAuthenticated(false)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (accountCode: string, passcode: string) => {
    setError(null)
    try {
      const data = await authApi.login(accountCode, passcode)
      localStorage.setItem('always_us_token', data.access_token)
      setIsAuthenticated(true)
    } catch (err) {
      const msg = getErrorMessage(err)
      setError(msg)
      throw new Error(msg)
    }
  }, [])

  const register = useCallback(async (accountCode: string, passcode: string): Promise<string> => {
    setError(null)
    try {
      const data = await authApi.register(accountCode, passcode)
      localStorage.setItem('always_us_token', data.access_token)
      setIsAuthenticated(true)
      return data.account_code
    } catch (err) {
      const msg = getErrorMessage(err)
      setError(msg)
      throw new Error(msg)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('always_us_token')
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, register, logout, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
