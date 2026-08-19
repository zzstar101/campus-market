import {
  useState,
  type FormEvent,
} from 'react'
import {
  useMutation,
} from '@tanstack/react-query'
import {
  ArrowLeft,
  LoaderCircle,
  LogIn,
} from 'lucide-react'
import {
  Link,
  useNavigate,
} from 'react-router'
import { toast } from 'sonner'

import { api } from '@/api/client'
import {
  useAuth,
} from '@/auth/useAuth'
import {
  Button,
} from '@/components/ui/button'
import {
  buttonVariants,
} from '@/components/ui/button-variants'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Input,
} from '@/components/ui/input'
import {
  Label,
} from '@/components/ui/label'

export function LoginPage() {
  const navigate =
    useNavigate()

  const auth =
    useAuth()

  const [
    username,
    setUsername,
  ] = useState('')

  const [
    password,
    setPassword,
  ] = useState('')

  const loginMutation =
    useMutation({
      mutationFn: async () => {
        const response =
          await api.api.auth.login.$post(
            {
              json: {
                username:
                  username.trim(),

                password,
              },
            },
          )

        const result =
          await response.json()

        if (
          !response.ok ||
          !('data' in result) ||
          !result.data
        ) {
          throw new Error(
            '用户名或密码错误',
          )
        }

        return result.data
      },

      onSuccess: (data) => {
        const user = {
          ...data.user,
          role: data.user.role === 'admin' ? 'admin' : 'user',
        } as const

        auth.setSession(
          data.token,
          user,
        )

        toast.success(
          '登录成功',
        )

        navigate('/')
      },

      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : '登录失败',
        )
      },
    })

  const handleSubmit = (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    loginMutation.mutate()
  }

  return (
    <main className="min-h-screen bg-muted/20">

      <div className="mx-auto max-w-md px-4 py-12">

        <Link
          to="/"
          className={`${buttonVariants({
            variant: 'ghost',
          })} mb-6`}
        >
          <ArrowLeft className="size-4" />
          返回市场
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              登录
            </CardTitle>

            <CardDescription>
              登录 Campus Market
              管理和发布你的闲置商品。
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5"
            >

              <div className="space-y-2">
                <Label htmlFor="username">
                  用户名
                </Label>

                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(
                    event,
                  ) =>
                    setUsername(
                      event.target
                        .value,
                    )
                  }
                  placeholder="请输入用户名"
                  minLength={3}
                  maxLength={24}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  密码
                </Label>

                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(
                    event,
                  ) =>
                    setPassword(
                      event.target
                        .value,
                    )
                  }
                  placeholder="请输入密码"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  loginMutation.isPending
                }
              >
                {loginMutation.isPending ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    登录中…
                  </>
                ) : (
                  <>
                    <LogIn />
                    登录
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                还没有账号？
                {' '}

                <Link
                  to="/register"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  注册账号
                </Link>
              </p>

            </form>
          </CardContent>
        </Card>

      </div>
    </main>
  )
}
