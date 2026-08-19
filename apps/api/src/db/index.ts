import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'

export const DATA_DIR = join(import.meta.dir, '../../data')
export const UPLOADS_DIR = join(DATA_DIR, 'uploads')

mkdirSync(UPLOADS_DIR, {
  recursive: true,
})

const sqlite = new Database(process.env.DATABASE_PATH ?? join(DATA_DIR, 'app.db'), {
  create: true,
})

sqlite.exec('PRAGMA foreign_keys = ON')

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    condition TEXT NOT NULL,
    ai_tags TEXT,
    price INTEGER NOT NULL,
    ai_price_min INTEGER,
    ai_price_max INTEGER,
    description TEXT NOT NULL,
    contact TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    product_id INTEGER NOT NULL,
    path TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );
`)

function ensureColumn(table: string, column: string, definition: string) {
  const columns = sqlite.query(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>

  if (!columns.some((item) => item.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

// 兼容已经存在的旧数据库，不要求用户删除本地数据。
ensureColumn('users', 'role', "TEXT NOT NULL DEFAULT 'user'")
ensureColumn('products', 'user_id', 'INTEGER')
ensureColumn('products', 'ai_tags', 'TEXT')

export const db = drizzle(sqlite)
