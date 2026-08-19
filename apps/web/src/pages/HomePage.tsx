import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  PackageOpen,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS, type ProductCategory } from '@campus/shared'

import { api } from '@/api/client'
import { ProductCard } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/auth/useAuth'

const categories = [
  { value: 'all' as const, label: '全部' },
  ...PRODUCT_CATEGORIES.map((value) => ({
    value,
    label: PRODUCT_CATEGORY_LABELS[value],
  })),
]

type Category = 'all' | ProductCategory

export function HomePage() {
  const [search, setSearch] = useState('')

  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [category, setCategory] = useState<Category>('all')
  const [page, setPage] = useState(1)
  const { user, logout } = useAuth()

  /*
   * 搜索防抖
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => {
      window.clearTimeout(timer)
    }
  }, [search])

  /*
   * 商品查询
   */
  const productsQuery = useQuery({
    queryKey: [
      'products',
      {
        q: debouncedSearch,
        category,
        page: String(page),
        pageSize: '12',
      },
    ],

    queryFn: async () => {
      const response = await api.api.products.$get({
        query: {
          q: debouncedSearch || undefined,

          category: category === 'all' ? undefined : category,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return response.json()
    },
  })

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setCategory('all')
    setPage(1)
  }

  const hasFilters = search.length > 0 || category !== 'all'

  return (
    <main className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background">
              <Sparkles className="size-4" />
            </div>

            <div>
              <div className="font-semibold leading-none">Campus Market</div>

              <div className="mt-1 hidden text-xs text-muted-foreground sm:block">
                校园二手交易平台
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="hidden items-center gap-2 rounded-lg px-3 text-sm sm:flex">
                  <User className="size-4 text-muted-foreground" />

                  <span>{user.username}</span>
                </div>

                <Link to="/publish" className={buttonVariants()}>
                  <Plus className="size-4" />
                  发布闲置
                </Link>

                <Link
                  to="/me"
                  className={buttonVariants({
                    variant: 'outline',
                  })}
                >
                  我的发布
                </Link>

                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={buttonVariants({
                      variant: 'outline',
                    })}
                    aria-label="管理员管控"
                  >
                    <ShieldCheck className="size-4" />
                    <span className="hidden sm:inline">管理</span>
                  </Link>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    logout()
                    toast.success('已退出登录')
                  }}
                  aria-label="退出登录"
                >
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={buttonVariants({
                    variant: 'ghost',
                  })}
                >
                  <LogIn className="size-4" />
                  登录
                </Link>

                <Link to="/register" className={buttonVariants()}>
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
              <Sparkles className="size-3.5" />
              AI 智能识别与估价
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">让闲置重新流动</h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              发现校园里的优质二手商品， 或上传照片，让 AI 帮你完成识别、估价和发布文案。
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/publish"
                className={buttonVariants({
                  size: 'lg',
                })}
              >
                <Sparkles className="size-4" />
                AI 智能发布
              </Link>

              <a
                href="#market"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'lg',
                })}
              >
                浏览市场
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Market */}
      <section id="market" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* 标题 */}
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">校园市场</h2>

            <p className="mt-1 text-sm text-muted-foreground">看看同学们最近发布了什么</p>
          </div>

          {productsQuery.isFetching && !productsQuery.isPending && (
            <span className="text-xs text-muted-foreground">正在更新…</span>
          )}
        </div>

        {/* 搜索 + 分类 */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-2xl">
            <Search
              className="
                absolute
                left-3
                top-1/2
                size-4
                -translate-y-1/2
                text-muted-foreground
              "
            />

            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="搜索 MacBook、教材、耳机……"
              className="h-11 pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={category === item.value ? 'default' : 'outline'}
                onClick={() => {
                  setCategory(item.value)
                  setPage(1)
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {productsQuery.isPending && (
          <div
            className="
              grid
              gap-6
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-4
            "
          >
            {Array.from({
              length: 8,
            }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />

                <div className="space-y-2 px-1">
                  <Skeleton className="h-5 w-3/4" />

                  <Skeleton className="h-4 w-1/3" />

                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {productsQuery.isError && (
          <div className="rounded-2xl border py-20 text-center">
            <h3 className="text-lg font-medium">商品加载失败</h3>

            <p className="mt-2 text-sm text-muted-foreground">{productsQuery.error.message}</p>

            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => productsQuery.refetch()}
            >
              重新加载
            </Button>
          </div>
        )}

        {/* Data */}
        {productsQuery.data && (
          <>
            {productsQuery.data.data.length === 0 ? (
              /*
               * Empty State
               */
              <div className="rounded-2xl border bg-muted/10 px-4 py-20 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                  <PackageOpen className="size-5 text-muted-foreground" />
                </div>

                <h3 className="mt-5 text-lg font-medium">
                  {hasFilters ? '没有找到相关商品' : '市场里还没有商品'}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {hasFilters ? '换一个关键词或分类试试看。' : '成为第一个发布校园闲置的人吧。'}
                </p>

                <div className="mt-6 flex justify-center gap-3">
                  {hasFilters ? (
                    <Button type="button" variant="outline" onClick={clearFilters}>
                      清除筛选
                    </Button>
                  ) : (
                    <Link to="/publish" className={buttonVariants()}>
                      <Plus className="size-4" />
                      发布闲置
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              /*
               * Product Grid
               */
              <div
                className="
                  grid
                  gap-6
                  sm:grid-cols-2
                  lg:grid-cols-3
                  xl:grid-cols-4
                "
              >
                {productsQuery.data.data.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {productsQuery.data.pagination.totalPages > 1 && (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                <p className="text-sm text-muted-foreground">
                  第 {page} / {productsQuery.data.pagination.totalPages} 页，共{' '}
                  {productsQuery.data.pagination.total} 件商品
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={page <= 1 || productsQuery.isFetching}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    aria-label="上一页"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={
                      page >= productsQuery.data.pagination.totalPages || productsQuery.isFetching
                    }
                    onClick={() => setPage((current) => current + 1)}
                    aria-label="下一页"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-12 border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
          <div className="font-medium text-foreground">Campus Market</div>

          <div>校园二手交易与 AI 智能估价平台</div>
        </div>
      </footer>
    </main>
  )
}
