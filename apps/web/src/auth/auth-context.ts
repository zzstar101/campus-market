import { createContext } from 'react'

export const TOKEN_KEY =
  'campus-market-token'

export type AuthUser = {
  id: number
  username: string
  role: 'user' | 'admin'
}

export type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isLoading: boolean

  setSession: (
    token: string,
    user: AuthUser,
  ) => void

  logout: () => void
}

export const AuthContext =
  createContext<AuthContextValue | null>(
    null,
  )

export function getAuthToken() {
  return localStorage.getItem(
    TOKEN_KEY,
  )
}

export function getAuthHeaders():
  Record<string, string> {
  const token = getAuthToken()

  if (!token) {
    return {}
  }

  return {
    Authorization:
      `Bearer ${token}`,
  }
}
