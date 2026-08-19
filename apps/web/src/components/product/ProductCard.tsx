import { Link } from 'react-router'
import { PRODUCT_CATEGORY_LABELS, PRODUCT_CONDITION_LABELS, PRODUCT_STATUS_LABELS } from '@campus/shared'
import type { Product } from '@/api/client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ProductCardProps = {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link to={`/products/${product.id}`} className="group block">
      <Card
        className={`overflow-hidden transition-shadow hover:shadow-md ${
          product.status === 'sold' || product.status === 'off_shelf'
            ? 'opacity-75 grayscale-[0.35]'
            : ''
        }`}
      >
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          {product.images.length > 0 ? (
            <img
              src={product.images[0].path}
              alt={product.title}
              className="
           h-full
            w-full
            object-cover
            transition-transform
            duration-300
            group-hover:scale-105

          "
            />
          ) : (
            <div
              className="
        flex
        h-full
        items-center
        justify-center
        text-sm
        text-muted-foreground
      "
            >
              暂无图片
            </div>
          )}
        </div>

        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="line-clamp-1">{product.title}</CardTitle>

            <span className="shrink-0 text-lg font-semibold">
              ¥{(product.price / 100).toFixed(2)}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="secondary">
              {PRODUCT_CATEGORY_LABELS[product.category] ?? product.category}
            </Badge>

            <Badge variant="outline">
              {PRODUCT_CONDITION_LABELS[product.condition] ?? product.condition}
            </Badge>

            {product.status === 'sold' && <Badge variant="destructive">{PRODUCT_STATUS_LABELS.sold}</Badge>}

            {product.status === 'off_shelf' && <Badge variant="outline">{PRODUCT_STATUS_LABELS.off_shelf}</Badge>}
          </div>

          <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
