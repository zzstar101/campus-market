import { hc } from 'hono/client'
import type { InferResponseType } from 'hono/client'

import type { AppType } from '@campus/api'
import { getAuthHeaders } from '@/auth/auth-context'

function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers)

  for (const [key, value] of Object.entries(getAuthHeaders())) {
    headers.set(key, value)
  }

  return fetch(input, {
    ...init,
    headers,
  })
}

export const api = hc<AppType>('/', {
  fetch: fetchWithAuth,
})

type ProductsApi = typeof api.api.products

type ProductByIdApi = ProductsApi[':id']

type ProductGetEndpoint = ProductByIdApi['$get']

type ProductDetailResponse = InferResponseType<
  ProductGetEndpoint,
  200
>

export type Product =
  ProductDetailResponse extends {
    data: infer T
  }
    ? T
    : never
