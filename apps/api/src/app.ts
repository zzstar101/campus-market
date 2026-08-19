import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { logger } from 'hono/logger'

import { DATA_DIR } from './db'
import { aiRoute } from './routes/ai'
import { productsRoute } from './routes/products'
import { authRoute } from './routes/auth'

const app = new Hono()
  .use('*', logger())
  .use(
    '/uploads/*',
    serveStatic({
      root: DATA_DIR,
    }),
  )

  .get('/', (c) => {
    return c.text('Campus Market API')
  })

  .get('/api/health', (c) => {
    return c.json({
      status: 'ok',
      service: 'campus-market-api',
    })
  })

  .route('/api/products', productsRoute)
  .route('/api/ai', aiRoute)
  .route('/api/auth', authRoute)

export type AppType = typeof app

export default app
