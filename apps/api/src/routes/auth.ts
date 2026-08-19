import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { sign, type JwtVariables } from 'hono/jwt'

import { db } from '../db'
import { users } from '../db/schema'
import { authMiddleware, JWT_SECRET, roleForUsername } from '../lib/auth'

const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      '用户名只能包含字母、数字和下划线',
    ),

  password: z
    .string()
    .min(8)
    .max(128),
})

type Variables = JwtVariables

export const authRoute =
  new Hono<{
    Variables: Variables
  }>()

    /*
     * 注册
     */
    .post(
      '/register',
      zValidator(
        'json',
        credentialsSchema,
      ),
      async (c) => {
        const {
          username,
          password,
        } = c.req.valid('json')

        const normalizedUsername =
          username.toLowerCase()

        const [existingUser] =
          await db
            .select()
            .from(users)
            .where(
              eq(
                users.username,
                normalizedUsername,
              ),
            )
            .limit(1)

        if (existingUser) {
          return c.json(
            {
              error:
                'Username already exists',
            },
            409,
          )
        }

        const passwordHash =
          await Bun.password.hash(
            password,
          )

        const result =
          await db
            .insert(users)
            .values({
              username:
                normalizedUsername,

              passwordHash,

              role:
                roleForUsername(
                  normalizedUsername,
                ),

              createdAt:
                new Date(),
            })
            .returning()

        const user = result[0]

        if (!user) {
          return c.json(
            {
              error:
                'Failed to create user',
            },
            500,
          )
        }

        const now = Math.floor(
          Date.now() / 1000,
        )

        const token =
          await sign(
            {
              sub:
                String(user.id),

              username:
                user.username,

              role:
                user.role,

              iat: now,

              exp:
                now +
                60 *
                  60 *
                  24 *
                  7,
            },

            JWT_SECRET,
          )

        return c.json(
          {
            data: {
              token,

              user: {
                id: user.id,
                username:
                  user.username,
                role: user.role,
              },
            },
          },
          201,
        )
      },
    )

    /*
     * 登录
     */
    .post(
      '/login',
      zValidator(
        'json',
        credentialsSchema,
      ),
      async (c) => {
        const {
          username,
          password,
        } = c.req.valid('json')

        const normalizedUsername =
          username.toLowerCase()

        const [user] =
          await db
            .select()
            .from(users)
            .where(
              eq(
                users.username,
                normalizedUsername,
              ),
            )
            .limit(1)

        /*
         * 不区分：
         * 用户不存在
         * 密码错误
         *
         * 避免把用户名是否存在直接暴露出来。
         */
        if (!user) {
          return c.json(
            {
              error:
                'Invalid username or password',
            },
            401,
          )
        }

        const validPassword =
          await Bun.password.verify(
            password,
            user.passwordHash,
          )

        if (!validPassword) {
          return c.json(
            {
              error:
                'Invalid username or password',
            },
            401,
          )
        }

        const role =
          user.role === 'admin' ||
          roleForUsername(user.username) ===
            'admin'
            ? 'admin'
            : 'user'

        const now = Math.floor(
          Date.now() / 1000,
        )

        const token =
          await sign(
            {
              sub:
                String(user.id),

              username:
                user.username,

              role,

              iat: now,

              exp:
                now +
                60 *
                  60 *
                  24 *
                  7,
            },

            JWT_SECRET,
          )

        return c.json(
          {
            data: {
              token,

              user: {
                id: user.id,
                username:
                  user.username,
                role,
              },
            },
          },
          200,
        )
      },
    )

    /*
     * 下面开始需要 JWT
     */
    .use(
      '/me',
      authMiddleware,
    )

    /*
     * 当前用户
     */
    .get(
      '/me',
      async (c) => {
        const payload =
          c.get('jwtPayload')

        const userId =
          Number(payload.sub)

        if (
          !Number.isInteger(
            userId,
          )
        ) {
          return c.json(
            {
              error:
                'Invalid token payload',
            },
            401,
          )
        }

        const [user] =
          await db
            .select({
              id: users.id,
              username:
                users.username,
              role: users.role,
              createdAt:
                users.createdAt,
            })
            .from(users)
            .where(
              eq(
                users.id,
                userId,
              ),
            )
            .limit(1)

        if (!user) {
          return c.json(
            {
              error:
                'User not found',
            },
            404,
          )
        }

        const role =
          user.role === 'admin' ||
          roleForUsername(user.username) ===
            'admin'
            ? 'admin'
            : 'user'

        return c.json(
          {
            data: {
              ...user,
              role,
            },
          },
          200,
        )
      },
    )
