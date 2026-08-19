import { z } from 'zod'

export const aiAnalysisSchema = z.object({
  title: z.string().min(1).max(80),

  category: z.enum(['digital', 'books', 'daily', 'sports', 'clothing', 'other']),

  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']),

  // 单位：人民币元
  priceMin: z.number().int().nonnegative(),

  priceMax: z.number().int().nonnegative(),

  tags: z.array(z.string()).min(1).max(5),

  description: z.string().min(1).max(1000),
})

export type AIAnalysis = z.infer<typeof aiAnalysisSchema>
