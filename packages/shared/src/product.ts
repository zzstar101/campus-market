export const PRODUCT_CATEGORIES = [
  'digital',
  'books',
  'daily',
  'sports',
  'clothing',
  'other',
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export const PRODUCT_CATEGORY_LABELS = {
  digital: '数码',
  books: '书籍',
  daily: '生活用品',
  sports: '运动',
  clothing: '服饰',
  other: '其他',
} satisfies Record<ProductCategory, string>

export const PRODUCT_CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'] as const

export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number]

export const PRODUCT_CONDITION_LABELS = {
  new: '全新',
  like_new: '95新',
  good: '9成新',
  fair: '8成新',
  poor: '有明显使用痕迹',
} satisfies Record<ProductCondition, string>

export const PRODUCT_CONDITION_DESCRIPTIONS = {
  new: '全新或未使用',
  like_new: '接近全新',
  good: '正常使用、成色良好',
  fair: '有明显使用痕迹但功能正常',
  poor: '成色较差',
} satisfies Record<ProductCondition, string>

export const PRODUCT_STATUSES = ['active', 'sold', 'off_shelf'] as const

export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const PRODUCT_STATUS_LABELS = {
  active: '在售',
  sold: '已售出',
  off_shelf: '已下架',
} satisfies Record<ProductStatus, string>
