import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CheckCircle2, Copy, EyeOff, RotateCcw } from 'lucide-react'
import { Link, useParams, useNavigate } from 'react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/auth/useAuth'
import { api } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Skeleton } from '@/components/ui/skeleton'

const categoryLabels: Record<string, string> = {
  digital: '数码',
  books: '书籍',
  daily: '生活用品',
  sports: '运动',
  clothing: '服饰',
  other: '其他',
}

const conditionLabels: Record<string, string> = {
  new: '全新',
  like_new: '95新',
  good: '9成新',
  fair: '8成新',
  poor: '有明显使用痕迹',
}

export function ProductPage() {
  const [selectedImage, setSelectedImage] = useState(0)
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const queryClient = useQueryClient()

  const productQuery = useQuery({
    queryKey: ['product', id],

    enabled: Boolean(id),

    queryFn: async () => {
      if (!id) {
        throw new Error('商品 ID 不存在')
      }

      const response = await api.api.products[':id'].$get({
        param: {
          id,
        },
      })

      if (!response.ok) {
        throw new Error(response.status === 404 ? '商品不存在' : `HTTP ${response.status}`)
      }

      const result = await response.json()

      if (!('data' in result)) {
        throw new Error('商品加载失败')
      }

      return result.data
    },
  })

  const statusMutation = useMutation({
    mutationFn: async (status: 'active' | 'sold' | 'off_shelf') => {
      if (!id) {
        throw new Error('商品 ID 不存在')
      }

      const response = await api.api.products[':id'].status.$patch({
        param: {
          id,
        },

        json: {
          status,
        },
      })

      if (!response.ok) {
        throw new Error('状态更新失败')
      }

      const result = await response.json()

      if (!('data' in result)) {
        throw new Error('状态更新失败')
      }

      return result.data
    },

    onSuccess: async (_data, status) => {
      const messages = {
        active: '商品已恢复上架',
        sold: '商品已标记为售出',
        off_shelf: '商品已下架',
      }

      toast.success(messages[status])

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['product', id],
        }),

        queryClient.invalidateQueries({
          queryKey: ['products'],
        }),
      ])

      if (status === 'off_shelf') {
        navigate('/')
      }
    },
  })

  if (productQuery.isPending) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Skeleton className="mb-6 h-9 w-32" />

        <div className="grid gap-10 md:grid-cols-2">
          <Skeleton className="aspect-square w-full" />

          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </main>
    )
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">无法加载商品</h1>

        <p className="mt-2 text-muted-foreground">{productQuery.error?.message}</p>

        <Link
          to="/"
          className={`${buttonVariants({
            variant: 'outline',
          })} mt-6`}
        >
          <ArrowLeft className="size-4" />
          返回市场
        </Link>
      </main>
    )
  }

  const product = productQuery.data
  const canManage = Boolean(user && (user.role === 'admin' || user.id === product.userId))

  const copyContact = async () => {
    try {
      await navigator.clipboard.writeText(product.contact)

      toast.success('联系方式已复制')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link
          to="/"
          className={`${buttonVariants({
            variant: 'ghost',
          })} mb-6`}
        >
          <ArrowLeft className="size-4" />
          返回市场
        </Link>

        <div className="grid gap-10 md:grid-cols-2">
          {/* 图片 */}
          <div className="space-y-4">
            {/* 主图 */}
            <div className="overflow-hidden rounded-xl border bg-muted">
              {product.images.length > 0 ? (
                <img
                  src={product.images[selectedImage]?.path ?? product.images[0].path}
                  alt={product.title}
                  className="
          aspect-square
          h-full
          w-full
          object-cover
        "
                />
              ) : (
                <div
                  className="
          flex
          aspect-square
          items-center
          justify-center
          text-muted-foreground
        "
                >
                  暂无商品图片
                </div>
              )}
            </div>

            {/* 缩略图 */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-3 gap-3">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={`
              overflow-hidden
              rounded-lg
              border-2
              transition
              ${
                selectedImage === index
                  ? 'border-foreground'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }
            `}
                  >
                    <img
                      src={image.path}
                      alt={`${product.title} 图片 ${index + 1}`}
                      className="
                aspect-square
                h-full
                w-full
                object-cover
              "
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 商品内容 */}
          <section>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {categoryLabels[product.category] ?? product.category}
              </Badge>

              <Badge variant="outline">
                {conditionLabels[product.condition] ?? product.condition}
              </Badge>

              {product.status === 'active' && <Badge variant="secondary">在售</Badge>}

              {product.status === 'sold' && <Badge variant="destructive">已售出</Badge>}

              {product.status === 'off_shelf' && <Badge variant="outline">已下架</Badge>}
            </div>

            <h1 className="text-3xl font-bold tracking-tight">{product.title}</h1>

            <p className="mt-4 text-3xl font-semibold">¥{(product.price / 100).toFixed(2)}</p>

            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              发布于 {new Date(product.createdAt).toLocaleString('zh-CN')}
            </p>

            {product.aiPriceMin != null && product.aiPriceMax != null && (
              <p className="mt-2 text-sm text-muted-foreground">
                AI 建议价格： ¥{(product.aiPriceMin / 100).toFixed(2)}
                {' ～ '}¥{(product.aiPriceMax / 100).toFixed(2)}
              </p>
            )}

            {/* AI 标签 */}
            {product.aiTags && product.aiTags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {product.aiTags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="my-8 border-t" />

            <h2 className="font-semibold">商品描述</h2>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">
              {product.description}
            </p>

            <div className="my-8 border-t" />

            {product.status === 'active' ? (
              <>
                <h2 className="font-semibold">联系卖家</h2>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 rounded-lg border px-4 py-3 text-sm">
                    {product.contact}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyContact}
                    aria-label="复制联系方式"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </>
            ) : product.status === 'sold' ? (
              <div className="rounded-xl border bg-muted/30 p-5">
                <div className="font-medium">该商品已售出</div>

                <p className="mt-1 text-sm text-muted-foreground">
                  商品交易已经完成，联系方式暂不展示。
                </p>
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/30 p-5">
                <div className="font-medium">该商品已下架</div>

                <p className="mt-1 text-sm text-muted-foreground">当前商品暂不可交易。</p>
              </div>
            )}

            <div className="my-8 border-t" />

            {canManage && (
              <>
                <h2 className="font-semibold">商品管理</h2>

                <p className="mt-1 text-sm text-muted-foreground">修改商品当前的交易状态。</p>

                <div className="mt-4 flex flex-wrap gap-3">
                  {product.status !== 'sold' && (
                    <Button
                      type="button"
                      onClick={() => statusMutation.mutate('sold')}
                      disabled={statusMutation.isPending}
                    >
                      <CheckCircle2 className="size-4" />
                      标记为已售出
                    </Button>
                  )}

                  {product.status !== 'off_shelf' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => statusMutation.mutate('off_shelf')}
                      disabled={statusMutation.isPending}
                    >
                      <EyeOff className="size-4" />
                      下架商品
                    </Button>
                  )}

                  {product.status !== 'active' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => statusMutation.mutate('active')}
                      disabled={statusMutation.isPending}
                    >
                      <RotateCcw className="size-4" />
                      恢复上架
                    </Button>
                  )}
                </div>

                {statusMutation.isError && (
                  <p className="mt-4 text-sm text-destructive">{statusMutation.error.message}</p>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
