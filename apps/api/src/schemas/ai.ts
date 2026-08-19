import { z } from 'zod'

import { PRODUCT_CATEGORIES, PRODUCT_CONDITIONS } from '@campus/shared'

export const aiAnalysisSchema = z.object({
  title: z.string().min(1).max(80),

  category: z.enum(PRODUCT_CATEGORIES),

  condition: z.enum(PRODUCT_CONDITIONS),

  // 单位：人民币元
  priceMin: z.number().int().nonnegative(),

  priceMax: z.number().int().nonnegative(),

  tags: z.array(z.string()).min(1).max(5),

  description: z.string().min(1).max(1000),
})

export type AIAnalysis = z.infer<typeof aiAnalysisSchema>
