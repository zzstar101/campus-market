import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import {
  AuthContext,
  TOKEN_KEY,
  type AuthUser,
} from './auth-context'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [token, setToken] =
    useState<string | null>(() =>
      localStorage.getItem(
        TOKEN_KEY,
      ),
    )

  const [user, setUser] =
    useState<AuthUser | null>(
      null,
    )

  const [
    isLoading,
    setIsLoading,
  ] = useState(() =>
    Boolean(
      localStorage.getItem(
        TOKEN_KEY,
      ),
    ),
  )

  useEffect(() => {
    const storedToken =
      localStorage.getItem(
        TOKEN_KEY,
      )

    if (!storedToken) {
      return
    }

    let cancelled = false

    const restoreSession =
      async () => {
        try {
          const response =
            await fetch(
              '/api/auth/me',
              {
                headers: {
                  Authorization:
                    `Bearer ${storedToken}`,
                },
              },
            )

          if (!response.ok) {
            throw new Error(
              'Invalid session',
            )
          }

          const result =
            await response.json()

          if (
            !result.data ||
            cancelled
          ) {
            return
          }

          setUser(result.data)
        } catch {
          if (cancelled) {
            return
          }

          localStorage.removeItem(
            TOKEN_KEY,
          )

          setToken(null)
          setUser(null)
        } finally {
          if (!cancelled) {
            setIsLoading(false)
          }
        }
      }

    void restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  const setSession = (
    newToken: string,
    newUser: AuthUser,
  ) => {
    localStorage.setItem(
      TOKEN_KEY,
      newToken,
    )

    setToken(newToken)
    setUser(newUser)
    setIsLoading(false)
  }

  const logout = () => {
    localStorage.removeItem(
      TOKEN_KEY,
    )

    setToken(null)
    setUser(null)
    setIsLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        setSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}