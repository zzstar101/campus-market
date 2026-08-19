import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, PackageOpen, Plus } from 'lucide-react'
import { Link } from 'react-router'

import { api } from '@/api/client'
import { ProductCard } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/auth/useAuth'

export function MyListingsPage() {
  const { user } = useAuth()

  const listingsQuery = useQuery({
    queryKey: ['my-products', user?.id],
    queryFn: async () => {
      const response = await api.api.products.mine.$get({
        query: {
          page: '1',
          pageSize: '50',
        },
      })

      if (!response.ok) {
        throw new Error(response.status === 401 ? '登录状态已失效' : '我的发布加载失败')
      }

      return response.json()
    },
  })

  return (
    <main className="min-h-screen bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/"
              className={`${buttonVariants({ variant: 'ghost' })} -ml-3 mb-4`}
            >
              <ArrowLeft className="size-4" />
              返回市场
            </Link>

            <h1 className="text-3xl font-bold tracking-tight">我的发布</h1>
            <p className="mt-2 text-muted-foreground">集中查看和管理你发布的校园闲置。</p>
          </div>

          <Link to="/publish" className={buttonVariants()}>
            <Plus className="size-4" />
            发布闲置
          </Link>
        </div>

        {listingsQuery.isPending && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {listingsQuery.isError && (
          <div className="rounded-2xl border bg-background py-20 text-center">
            <h2 className="text-lg font-medium">暂时无法加载</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {listingsQuery.error.message}
            </p>
            <Button className="mt-5" variant="outline" onClick={() => listingsQuery.refetch()}>
              重新加载
            </Button>
          </div>
        )}

        {listingsQuery.data && listingsQuery.data.data.length === 0 && (
          <div className="rounded-2xl border bg-background px-4 py-20 text-center">
            <PackageOpen className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-5 text-lg font-medium">还没有发布商品</h2>
            <p className="mt-2 text-sm text-muted-foreground">上传一张照片，让 AI 帮你完成第一条发布。</p>
            <Link to="/publish" className={`${buttonVariants()} mt-6`}>
              <Plus className="size-4" />
              开始发布
            </Link>
          </div>
        )}

        {listingsQuery.data && listingsQuery.data.data.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listingsQuery.data.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
