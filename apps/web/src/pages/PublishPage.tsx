import { useState, type ChangeEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ImagePlus, LoaderCircle, Sparkles, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CONDITIONS,
  PRODUCT_CONDITION_LABELS,
  type ProductCategory,
  type ProductCondition,
} from '@campus/shared'

import { getAuthHeaders } from '@/auth/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Category = ProductCategory

type Condition = ProductCondition

type AIAnalysis = {
  title: string
  category: Category
  condition: Condition
  priceMin: number
  priceMax: number
  tags: string[]
  description: string
}

const categories = PRODUCT_CATEGORIES.map((value) => ({
  value,
  label: PRODUCT_CATEGORY_LABELS[value],
}))

const conditions = PRODUCT_CONDITIONS.map((value) => ({
  value,
  label: PRODUCT_CONDITION_LABELS[value],
}))

function yuanToCents(value: number) {
  return Math.round(value * 100)
}

export function PublishPage() {
  const navigate = useNavigate()

  const [files, setFiles] = useState<File[]>([])

  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  const [hint, setHint] = useState('')

  const [title, setTitle] = useState('')

  const [category, setCategory] = useState<Category>('other')

  const [condition, setCondition] = useState<Condition>('good')

  const [priceMin, setPriceMin] = useState<number | null>(null)

  const [priceMax, setPriceMax] = useState<number | null>(null)

  const [price, setPrice] = useState('')

  const [tags, setTags] = useState<string[]>([])

  const [description, setDescription] = useState('')

  const [contact, setContact] = useState('')

  const [error, setError] = useState<string | null>(null)

  const aiMutation = useMutation({
    mutationFn: async () => {
      if (files.length < 1 || files.length > 3) {
        throw new Error('请选择 1～3 张商品图片')
      }

      const formData = new FormData()

      for (const file of files) {
        formData.append('images', file)
      }

      if (hint.trim()) {
        formData.append('description', hint.trim())
      }

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? result.error ?? 'AI 分析失败')
      }

      return result.data as AIAnalysis
    },

    onSuccess: (data) => {
      toast.success('AI 分析成功')
      setError(null)

      setTitle(data.title)
      setCategory(data.category)
      setCondition(data.condition)

      setPriceMin(data.priceMin)
      setPriceMax(data.priceMax)

      // 默认售价先取推荐区间中间值
      setPrice(String(Math.round((data.priceMin + data.priceMax) / 2)))

      setTags(data.tags)
      setDescription(data.description)
    },

    onError: (err) => {
      setError(err instanceof Error ? err.message : 'AI 分析失败')
    },
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      setError(null)

      if (files.length < 1 || files.length > 3) {
        throw new Error('请选择 1～3 张商品图片')
      }

      if (!title.trim()) {
        throw new Error('请输入商品标题')
      }

      const priceNumber = Number(price)

      if (!Number.isFinite(priceNumber) || priceNumber < 0) {
        throw new Error('请输入正确的售价')
      }

      if (!description.trim()) {
        throw new Error('请输入商品描述')
      }

      if (!contact.trim()) {
        throw new Error('请输入联系方式')
      }

      const formData = new FormData()

      /*
       * 商品信息作为 JSON 字符串
       */
      formData.append(
        'product',
        JSON.stringify({
          title: title.trim(),

          category,

          condition,

          price: yuanToCents(priceNumber),

          aiPriceMin: priceMin != null ? yuanToCents(priceMin) : undefined,

          aiPriceMax: priceMax != null ? yuanToCents(priceMax) : undefined,

          aiTags: tags,

          description: description.trim(),

          contact: contact.trim(),
        }),
      )

      /*
       * 图片
       */
      for (const file of files) {
        formData.append('images', file)
      }

      const response = await fetch('/api/products/publish', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.data) {
        throw new Error(result.error ?? '发布失败')
      }

      return result.data
    },

    onSuccess: (product) => {
      toast.success('商品发布成功')

      navigate(`/products/${product.id}`)
    },

    onError: (err) => {
      setError(err instanceof Error ? err.message : '发布失败')
    },
  })

  const handleImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])

    if (files.length + selected.length > 3) {
      setError('最多只能选择 3 张图片')

      event.target.value = ''
      return
    }

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

    for (const file of selected) {
      if (!allowedTypes.has(file.type)) {
        setError('仅支持 JPG、PNG、WebP')

        event.target.value = ''
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('单张图片不能超过 10 MB')

        event.target.value = ''
        return
      }
    }

    const newPreviewUrls = selected.map((file) => URL.createObjectURL(file))

    setFiles((current) => [...current, ...selected])

    setPreviewUrls((current) => [...current, ...newPreviewUrls])

    setError(null)

    event.target.value = ''
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index])

    setFiles((current) => current.filter((_, i) => i !== index))

    setPreviewUrls((current) => current.filter((_, i) => i !== index))
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link
          to="/"
          className={`${buttonVariants({
            variant: 'ghost',
          })} mb-6`}
        >
          <ArrowLeft />
          返回市场
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">AI 智能发布</h1>

          <p className="mt-2 text-muted-foreground">
            上传商品照片，AI 将自动识别商品、分析成色并给出估价。
          </p>
        </div>

        <div className="space-y-6">
          {/* 图片 */}
          <Card>
            <CardHeader>
              <CardTitle>1. 商品照片</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {previewUrls.map((url, index) => (
                  <div
                    key={url}
                    className="group relative aspect-square overflow-hidden rounded-xl border bg-muted"
                  >
                    <img
                      src={url}
                      alt={`商品图片 ${index + 1}`}
                      className="h-full w-full object-cover"
                    />

                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute right-2 top-2"
                      onClick={() => removeImage(index)}
                      aria-label="删除图片"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}

                {files.length < 3 && (
                  <Label
                    htmlFor="images"
                    className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <ImagePlus className="size-8" />

                    <span className="text-sm">添加图片</span>

                    <span className="text-xs">{files.length}/3</span>
                  </Label>
                )}
              </div>

              <Input
                id="images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleImagesChange}
              />

              <p className="text-xs text-muted-foreground">
                支持 JPG、PNG、WebP， 最多 3 张，每张不超过 10 MB。
              </p>
            </CardContent>
          </Card>

          {/* AI */}
          <Card>
            <CardHeader>
              <CardTitle>2. AI 智能估价</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hint">补充说明</Label>

                <Textarea
                  id="hint"
                  value={hint}
                  onChange={(event) => setHint(event.target.value)}
                  placeholder="例如：使用一年，功能正常，盒子和充电器都在……"
                  maxLength={500}
                  rows={4}
                />

                <div className="text-right text-xs text-muted-foreground">{hint.length}/500</div>
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={files.length === 0 || aiMutation.isPending}
                onClick={() => aiMutation.mutate()}
              >
                {aiMutation.isPending ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    AI 正在识别和估价…
                  </>
                ) : (
                  <>
                    <Sparkles />
                    AI 智能识别与估价
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* AI 分析结果 / 商品编辑 */}
          {(aiMutation.isSuccess || title) && (
            <Card>
              <CardHeader>
                <CardTitle>3. 确认商品信息</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">商品标题</Label>

                  <Input
                    id="title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={80}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">商品分类</Label>

                    <select
                      id="category"
                      value={category}
                      onChange={(event) => setCategory(event.target.value as Category)}
                      className="h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {categories.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">商品成色</Label>

                    <select
                      id="condition"
                      value={condition}
                      onChange={(event) => setCondition(event.target.value as Condition)}
                      className="h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {conditions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {priceMin != null && priceMax != null && (
                  <div className="rounded-xl border bg-muted/40 p-4">
                    <div className="text-sm text-muted-foreground">AI 推荐价格区间</div>

                    <div className="mt-1 text-2xl font-semibold">
                      ¥{priceMin}
                      {' ～ '}¥{priceMax}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="price">实际售价（元）</Label>

                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="例如：3288"
                  />
                </div>

                {tags.length > 0 && (
                  <div className="space-y-2">
                    <Label>AI 商品标签</Label>

                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">商品描述</Label>

                  <Textarea
                    id="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={7}
                    maxLength={2000}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact">联系方式</Label>

                  <Input
                    id="contact"
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    placeholder="微信 / QQ / 手机号"
                    maxLength={200}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 错误 */}
          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* 发布 */}
          {(aiMutation.isSuccess || title) && (
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={publishMutation.isPending}
              onClick={() => publishMutation.mutate()}
            >
              {publishMutation.isPending ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  正在发布…
                </>
              ) : (
                '确认发布'
              )}
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}
