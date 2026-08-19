import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  username: text('username').notNull().unique(),

  passwordHash: text('password_hash').notNull(),

  role: text('role', {
    enum: ['user', 'admin'],
  })
    .notNull()
    .default('user'),

  createdAt: integer('created_at', {
    mode: 'timestamp',
  }).notNull(),
})

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, {
    onDelete: 'cascade',
  }),

  title: text('title').notNull(),

  category: text('category').notNull(),

  condition: text('condition').notNull(),

  aiTags: text('ai_tags', {
    mode: 'json',
  }).$type<string[]>(),

  price: integer('price').notNull(),

  aiPriceMin: integer('ai_price_min'),

  aiPriceMax: integer('ai_price_max'),

  description: text('description').notNull(),

  contact: text('contact').notNull(),

  status: text('status', {
    enum: ['active', 'sold', 'off_shelf'],
  })
    .notNull()
    .default('active'),

  createdAt: integer('created_at', {
    mode: 'timestamp',
  }).notNull(),

  updatedAt: integer('updated_at', {
    mode: 'timestamp',
  }).notNull(),
})

export const productImages = sqliteTable('product_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  productId: integer('product_id')
    .notNull()
    .references(() => products.id, {
      onDelete: 'cascade',
    }),

  path: text('path').notNull(),

  sortOrder: integer('sort_order').notNull().default(0),
})
