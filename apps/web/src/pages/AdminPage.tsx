import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ShieldCheck, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useAuth } from '@/auth/useAuth'
import { api } from '@/api/client'
import { ProductCard } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Skeleton } from '@/components/ui/skeleton'

export function AdminPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const adminQuery = useQuery({
    queryKey: ['admin-products'],
    enabled: user?.role === 'admin',
    queryFn: async () => {
      const response = await api.api.products.admin.$get({
        query: {
          page: '1',
          pageSize: '50',
        },
      })

      if (!response.ok) {
        throw new Error(response.status === 403 ? '没有管理员权限' : '管理数据加载失败')
      }

      return response.json()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.api.products[':id'].$delete({
        param: { id: String(id) },
      })

      if (!response.ok) {
        throw new Error(response.status === 403 ? '没有管理员权限' : '删除失败')
      }

      return response.json()
    },
    onSuccess: async () => {
      toast.success('违规商品已删除')
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  if (user?.role !== 'admin') {
    return (
      <main className="min-h-screen bg-muted/20">
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <ShieldCheck className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-5 text-2xl font-semibold">无权访问</h1>
          <p className="mt-2 text-sm text-muted-foreground">当前账号不是管理员。</p>
          <Link to="/" className={`${buttonVariants({ variant: 'outline' })} mt-6`}>
            返回市场
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/" className={`${buttonVariants({ variant: 'ghost' })} -ml-3 mb-6`}>
          <ArrowLeft className="size-4" />
          返回市场
        </Link>

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4" />
              内容管理
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">管理员管控</h1>
            <p className="mt-2 text-muted-foreground">处理违规商品并维护校园市场内容。</p>
          </div>
        </div>

        {adminQuery.isPending && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            ))}
          </div>
        )}

        {adminQuery.isError && (
          <div className="rounded-2xl border bg-background py-20 text-center">
            <h2 className="text-lg font-medium">无法加载管理数据</h2>
            <p className="mt-2 text-sm text-muted-foreground">{adminQuery.error.message}</p>
            <Button className="mt-5" variant="outline" onClick={() => adminQuery.refetch()}>
              重新加载
            </Button>
          </div>
        )}

        {adminQuery.data && adminQuery.data.data.length === 0 && (
          <div className="rounded-2xl border bg-background py-20 text-center text-muted-foreground">
            当前没有待处理商品。
          </div>
        )}

        {adminQuery.data && adminQuery.data.data.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {adminQuery.data.data.map((product) => (
              <div key={product.id} className="space-y-3">
                <ProductCard product={product} />
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (window.confirm('确认删除这件商品及其图片吗？')) {
                      deleteMutation.mutate(product.id)
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                  删除商品
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
