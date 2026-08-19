import { mkdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm'
import type { JwtVariables } from 'hono/jwt'
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
  PRODUCT_STATUSES,
  type ProductCategory,
  type ProductStatus,
} from '@campus/shared'

import { DATA_DIR, db, UPLOADS_DIR } from '../db'
import { productImages, products } from '../db/schema'
import { authMiddleware, getAuthUser, isAdmin } from '../lib/auth'
import { findBlockedTerm, validateImageContents } from '../lib/moderation'

const categorySchema = z.enum(PRODUCT_CATEGORIES)

const conditionSchema = z.enum(PRODUCT_CONDITIONS)

const statusSchema = z.enum(PRODUCT_STATUSES)

const createProductSchema = z.object({
  title: z.string().trim().min(1).max(80),
  category: categorySchema,
  condition: conditionSchema,
  aiTags: z.array(z.string().trim().min(1)).max(5).optional(),
  price: z.number().int().nonnegative(),
  aiPriceMin: z.number().int().nonnegative().optional(),
  aiPriceMax: z.number().int().nonnegative().optional(),
  description: z.string().trim().min(1).max(2000),
  contact: z.string().trim().min(1).max(200),
})

const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: categorySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(12),
})

const adminQuerySchema = productQuerySchema.extend({
  status: statusSchema.optional(),
})

const updateStatusSchema = z.object({
  status: statusSchema,
})

function getImageExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      throw new Error(`Unsupported image type: ${mimeType}`)
  }
}

function getUploadedFiles(rawImages: unknown): File[] {
  const images = Array.isArray(rawImages) ? rawImages : rawImages ? [rawImages] : []

  return images.filter((image): image is File => image instanceof File)
}

async function validateImages(files: File[]): Promise<string | null> {
  if (files.length < 1 || files.length > 3) {
    return 'Please upload 1 to 3 images'
  }

  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

  for (const file of files) {
    if (!allowedTypes.has(file.type)) {
      return `Unsupported image type: ${file.type}`
    }

    if (file.size > 10 * 1024 * 1024) {
      return 'Each image must be 10 MB or smaller'
    }
  }

  return validateImageContents(files)
}

async function attachImages(rows: Array<typeof products.$inferSelect>) {
  if (rows.length === 0) {
    return []
  }

  const imageRows = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, rows.map((product) => product.id)))
    .orderBy(productImages.sortOrder)

  const imagesByProduct = new Map<number, typeof imageRows>()

  for (const image of imageRows) {
    const images = imagesByProduct.get(image.productId) ?? []
    images.push(image)
    imagesByProduct.set(image.productId, images)
  }

  return rows.map((product) => ({
    ...product,
    images: imagesByProduct.get(product.id) ?? [],
  }))
}

async function listProducts(options: {
  userId?: number
  q?: string
  category?: ProductCategory
  status?: ProductStatus
  includeHidden?: boolean
  page: number
  pageSize: number
}) {
  const keyword = options.q?.trim()

  const where = and(
    options.userId ? eq(products.userId, options.userId) : undefined,
    keyword
      ? or(like(products.title, `%${keyword}%`), like(products.description, `%${keyword}%`))
      : undefined,
    options.category ? eq(products.category, options.category) : undefined,
    options.status
      ? eq(products.status, options.status)
      : options.includeHidden
        ? undefined
        : or(eq(products.status, 'active'), eq(products.status, 'sold')),
  )

  const [countRow] = await db
    .select({ value: sql<number>`count(*)` })
    .from(products)
    .where(where)

  const total = Number(countRow?.value ?? 0)
  const rows = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(options.pageSize)
    .offset((options.page - 1) * options.pageSize)

  return {
    data: await attachImages(rows),
    pagination: {
      page: options.page,
      pageSize: options.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / options.pageSize)),
    },
  }
}

async function findProduct(id: number) {
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1)

  if (!product) {
    return null
  }

  const [withImages] = await attachImages([product])

  return withImages ?? null
}

function canManageProduct(c: Parameters<typeof getAuthUser>[0], userId: number | null) {
  const user = getAuthUser(c)

  return Boolean(user && (user.id === userId || isAdmin(user)))
}

type ProductVariables = {
  Variables: JwtVariables
}

export const productsRoute = new Hono<ProductVariables>()
  /* 发布和写操作必须绑定登录用户。 */
  .post('/publish', authMiddleware, async (c) => {
    const user = getAuthUser(c)

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = await c.req.parseBody({
      all: true,
    })

    const rawProduct = body.product

    if (typeof rawProduct !== 'string') {
      return c.json({ error: 'Missing product data' }, 400)
    }

    let productJson: unknown

    try {
      productJson = JSON.parse(rawProduct)
    } catch {
      return c.json({ error: 'Invalid product JSON' }, 400)
    }

    const parsedProduct = createProductSchema.safeParse(productJson)

    if (!parsedProduct.success) {
      return c.json(
        {
          error: 'Invalid product data',
          issues: parsedProduct.error.issues,
        },
        400,
      )
    }

    const blockedTerm = findBlockedTerm([
      parsedProduct.data.title,
      parsedProduct.data.description,
      parsedProduct.data.contact,
      ...(parsedProduct.data.aiTags ?? []),
    ])

    if (blockedTerm) {
      return c.json(
        {
          error: '内容包含违规关键词，无法发布',
          code: 'CONTENT_REJECTED',
        },
        400,
      )
    }

    const files = getUploadedFiles(body.images)
    const imageError = await validateImages(files)

    if (imageError) {
      return c.json({ error: imageError }, 400)
    }

    await mkdir(UPLOADS_DIR, { recursive: true })

    const writtenFiles: string[] = []

    try {
      const result = await db.transaction(async (tx) => {
        const now = new Date()
        const createdProducts = await tx
          .insert(products)
          .values({
            ...parsedProduct.data,
            userId: user.id,
            aiTags: parsedProduct.data.aiTags ?? [],
            status: 'active',
            createdAt: now,
            updatedAt: now,
          })
          .returning()

        const product = createdProducts[0]

        if (!product) {
          throw new Error('Failed to create product')
        }

        const savedImages: Array<typeof productImages.$inferSelect> = []

        for (const [index, file] of files.entries()) {
          const extension = getImageExtension(file.type)
          const filename = `${crypto.randomUUID()}.${extension}`
          const diskPath = join(UPLOADS_DIR, filename)
          const publicPath = `/uploads/${filename}`

          await Bun.write(diskPath, await file.arrayBuffer())
          writtenFiles.push(diskPath)

          const createdImages = await tx
            .insert(productImages)
            .values({
              productId: product.id,
              path: publicPath,
              sortOrder: index,
            })
            .returning()

          const image = createdImages[0]

          if (!image) {
            throw new Error('Failed to create image record')
          }

          savedImages.push(image)
        }

        return {
          ...product,
          images: savedImages,
        }
      })

      return c.json({ data: result }, 201)
    } catch (error) {
      console.error('Publish product failed:', error)
      await Promise.allSettled(writtenFiles.map((path) => unlink(path)))

      return c.json({ error: 'Failed to publish product' }, 500)
    }
  })
  .post(
    '/',
    authMiddleware,
    zValidator('json', createProductSchema),
    async (c) => {
      const user = getAuthUser(c)

      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const body = c.req.valid('json')

      const blockedTerm = findBlockedTerm([
        body.title,
        body.description,
        body.contact,
        ...(body.aiTags ?? []),
      ])

      if (blockedTerm) {
        return c.json(
          {
            error: '内容包含违规关键词，无法发布',
            code: 'CONTENT_REJECTED',
          },
          400,
        )
      }

      const now = new Date()
      const result = await db
        .insert(products)
        .values({
          ...body,
          userId: user.id,
          aiTags: body.aiTags ?? [],
          status: 'active',
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      const product = result[0]

      if (!product) {
        return c.json({ error: 'Failed to create product' }, 500)
      }

      return c.json({ data: product }, 201)
    },
  )
  .patch(
    '/:id/status',
    authMiddleware,
    zValidator('json', updateStatusSchema),
    async (c) => {
      const id = Number(c.req.param('id'))

      if (!Number.isInteger(id) || id <= 0) {
        return c.json({ error: 'Invalid product id' }, 400)
      }

      const product = await findProduct(id)

      if (!product) {
        return c.json({ error: 'Product not found' }, 404)
      }

      if (!canManageProduct(c, product.userId)) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const { status } = c.req.valid('json')
      const result = await db
        .update(products)
        .set({ status, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning()

      const updatedProduct = result[0]

      if (!updatedProduct) {
        return c.json({ error: 'Product not found' }, 404)
      }

      return c.json({ data: updatedProduct }, 200)
    },
  )
  .post('/:id/images', authMiddleware, async (c) => {
    const id = Number(c.req.param('id'))

    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: 'Invalid product id' }, 400)
    }

    const product = await findProduct(id)

    if (!product) {
      return c.json({ error: 'Product not found' }, 404)
    }

    if (!canManageProduct(c, product.userId)) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const body = await c.req.parseBody({ all: true })
    const files = getUploadedFiles(body.images)
    const imageError = await validateImages(files)

    if (imageError) {
      return c.json({ error: imageError }, 400)
    }

    await mkdir(UPLOADS_DIR, { recursive: true })
    const savedImages: Array<typeof productImages.$inferSelect> = []

    for (const [index, file] of files.entries()) {
      const extension = getImageExtension(file.type)
      const filename = `${crypto.randomUUID()}.${extension}`
      const diskPath = join(UPLOADS_DIR, filename)
      const publicPath = `/uploads/${filename}`

      await Bun.write(diskPath, await file.arrayBuffer())

      const result = await db
        .insert(productImages)
        .values({
          productId: id,
          path: publicPath,
          sortOrder: index,
        })
        .returning()

      const image = result[0]

      if (!image) {
        return c.json({ error: 'Failed to create image' }, 500)
      }

      savedImages.push(image)
    }

    return c.json({ data: savedImages }, 201)
  })
  .get('/mine', authMiddleware, zValidator('query', productQuerySchema), async (c) => {
    const user = getAuthUser(c)

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const query = c.req.valid('query')

    return c.json(
      await listProducts({
        userId: user.id,
        q: query.q,
        category: query.category,
        includeHidden: true,
        page: query.page,
        pageSize: query.pageSize,
      }),
      200,
    )
  })
  .get('/admin', authMiddleware, zValidator('query', adminQuerySchema), async (c) => {
    const user = getAuthUser(c)

    if (!user || !isAdmin(user)) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const query = c.req.valid('query')

    return c.json(
      await listProducts({
        q: query.q,
        category: query.category,
        status: query.status,
        includeHidden: true,
        page: query.page,
        pageSize: query.pageSize,
      }),
      200,
    )
  })
  .delete('/:id', authMiddleware, async (c) => {
    const user = getAuthUser(c)

    if (!user || !isAdmin(user)) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const id = Number(c.req.param('id'))

    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: 'Invalid product id' }, 400)
    }

    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1)

    if (!product) {
      return c.json({ error: 'Product not found' }, 404)
    }

    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))

    await db.delete(products).where(eq(products.id, id))

    await Promise.allSettled(
      images.map((image) =>
        unlink(join(DATA_DIR, image.path.replace(/^\/?uploads[\\/]/, 'uploads/'))),
      ),
    )

    return c.json({ data: { id } }, 200)
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))

    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: 'Invalid product id' }, 400)
    }

    const product = await findProduct(id)

    if (!product) {
      return c.json({ error: 'Product not found' }, 404)
    }

    return c.json({ data: product }, 200)
  })
  .get('/', zValidator('query', productQuerySchema), async (c) => {
    const query = c.req.valid('query')

    return c.json(
      await listProducts({
        q: query.q,
        category: query.category,
        page: query.page,
        pageSize: query.pageSize,
      }),
      200,
    )
  })
