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
  UserPlus,
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

export function RegisterPage() {
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

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const registerMutation =
    useMutation({
      mutationFn: async () => {
        if (
          password !==
          confirmPassword
        ) {
          throw new Error(
            '两次输入的密码不一致',
          )
        }

        const response =
          await api.api.auth.register.$post(
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
          response.status === 409
        ) {
          throw new Error(
            '该用户名已被注册',
          )
        }

        if (
          !response.ok ||
          !('data' in result) ||
          !result.data
        ) {
          throw new Error(
            '注册失败',
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
          '注册成功',
        )

        navigate('/')
      },

      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : '注册失败',
        )
      },
    })

  const handleSubmit = (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    registerMutation.mutate()
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
              注册账号
            </CardTitle>

            <CardDescription>
              创建 Campus Market
              账号后即可发布和管理闲置商品。
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
                  value={username}
                  onChange={(
                    event,
                  ) =>
                    setUsername(
                      event.target
                        .value,
                    )
                  }
                  autoComplete="username"
                  placeholder="3～24 位字母、数字或下划线"
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
                  value={password}
                  onChange={(
                    event,
                  ) =>
                    setPassword(
                      event.target
                        .value,
                    )
                  }
                  autoComplete="new-password"
                  placeholder="至少 8 位"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">
                  确认密码
                </Label>

                <Input
                  id="confirm-password"
                  type="password"
                  value={
                    confirmPassword
                  }
                  onChange={(
                    event,
                  ) =>
                    setConfirmPassword(
                      event.target
                        .value,
                    )
                  }
                  autoComplete="new-password"
                  placeholder="再次输入密码"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  registerMutation.isPending
                }
              >
                {registerMutation.isPending ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    注册中…
                  </>
                ) : (
                  <>
                    <UserPlus />
                    创建账号
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                已经有账号？
                {' '}

                <Link
                  to="/login"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  立即登录
                </Link>
              </p>

            </form>
          </CardContent>
        </Card>

      </div>
    </main>
  )
}
