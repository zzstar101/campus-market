import type { Context } from 'hono'
import { jwt, type JwtVariables } from 'hono/jwt'

export type UserRole = 'user' | 'admin'

export type AuthUser = {
  id: number
  username: string
  role: UserRole
}

const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
  throw new Error('JWT_SECRET is not configured')
}

export const JWT_SECRET: string = jwtSecret

export const authMiddleware = jwt({
  secret: JWT_SECRET,
  alg: 'HS256',
})

export function roleForUsername(username: string): UserRole {
  const adminUsername = process.env.ADMIN_USERNAME?.trim().toLowerCase()

  return adminUsername && username === adminUsername ? 'admin' : 'user'
}

export function getAuthUser(c: Context<{ Variables: JwtVariables }>): AuthUser | null {
  const payload = c.get('jwtPayload')
  const id = Number(payload.sub)

  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  return {
    id,
    username: String(payload.username ?? ''),
    role: payload.role === 'admin' ? 'admin' : 'user',
  }
}

export function isAdmin(user: AuthUser) {
  return user.role === 'admin'
}
