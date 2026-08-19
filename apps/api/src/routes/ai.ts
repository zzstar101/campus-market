import { Hono } from 'hono'
import type { JwtVariables } from 'hono/jwt'

import { authMiddleware } from '../lib/auth'
import { validateImageContents } from '../lib/moderation'
import { analyzeProduct } from '../services/ai.service'

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

const MAX_IMAGE_SIZE = 10 * 1024 * 1024

export const aiRoute = new Hono<{ Variables: JwtVariables }>().post(
  '/analyze',
  authMiddleware,
  async (c) => {
  try {
    const body = await c.req.parseBody({
      all: true,
    })

    const rawImages = body.images

    const images = Array.isArray(rawImages) ? rawImages : rawImages ? [rawImages] : []

    const files = images.filter((value): value is File => value instanceof File)

    if (files.length < 1 || files.length > 3) {
      return c.json(
        {
          error: 'Please upload 1 to 3 images',
        },
        400,
      )
    }

    for (const file of files) {
      if (!allowedImageTypes.has(file.type)) {
        return c.json(
          {
            error: `Unsupported image type: ${file.type}`,
          },
          400,
        )
      }

      if (file.size > MAX_IMAGE_SIZE) {
        return c.json(
          {
            error: 'Each image must be 10 MB or smaller',
          },
          400,
        )
      }
    }

    const contentError = await validateImageContents(files)

    if (contentError) {
      return c.json({ error: contentError }, 400)
    }

    const rawDescription = body.description

    const description = typeof rawDescription === 'string' ? rawDescription : undefined

    if (description && description.length > 500) {
      return c.json(
        {
          error: 'Description is too long',
        },
        400,
      )
    }

    const result = await analyzeProduct(files, description)

    return c.json(
      {
        data: result,
      },
      200,
    )
  } catch (error) {
    console.error('AI analyze error:', error)

    return c.json(
      {
        error: 'AI analysis failed',
      },
      500,
    )
  }
  },
)
