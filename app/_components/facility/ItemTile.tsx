import type { ReactNode } from 'react'
import ItemIcon from '@/app/_components/facility/ItemIcon'

export interface TileIngredient {
  name: string
  qty: number
  have: number
}

interface Props {
  /** アイテム名 */
  name: string
  /** アイコン画像のアイテムid（素材/レシピのid）。public/items/{icon}.webp を参照 */
  icon?: string
  /** 価格(G, 経済倍率適用後) */
  price: number
  /** 価格表示を上書きするラベル（例: "売却不可"）。指定時は {price}G の代わりに表示 */
  priceLabel?: string
  /** このアイテムの在庫数 */
  stock: number
  /** 配置スロット由来の合計レート(個/分)。0なら未配置として控えめ表示。 */
  ratePerMin: number
  /** 押下アクション。渡すと button、無ければ静的カードとして描画。 */
  onClick?: () => void
  disabled?: boolean
  /** 進行中タスクの進捗(0-1)。null/undefined で非表示。 */
  progress?: number | null
  /** 工芸のみ: 必要素材と在庫 */
  ingredients?: TileIngredient[]
  /** 名前右に差し込むバッジ(生産の豊作など) */
  badge?: ReactNode
  /** 枠を強調(豊作など) */
  highlight?: boolean
}

/**
 * 生産施設・工芸ギルド・商人ギルドで共有するアイテムタイル。
 * 共通でアイテム名・価格・在庫・配置スロットによる1分あたりの個数を表記。工芸は必要素材も表示。
 */
export default function ItemTile({
  name,
  icon,
  price,
  priceLabel,
  stock,
  ratePerMin,
  onClick,
  disabled,
  progress,
  ingredients,
  badge,
  highlight,
}: Props) {
  const Tag = onClick ? 'button' : 'div'
  const dim = disabled && (progress == null)
  return (
    <Tag
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      className={`relative overflow-hidden block w-full text-left rounded-lg p-2 transition-colors bg-surface border ${
        highlight ? 'border-success' : 'border-line'
      } ${onClick ? 'hover:border-accent-strong disabled:cursor-not-allowed' : ''}`}
    >
      {progress != null && (
        <div
          className="absolute inset-y-0 left-0 bg-accent/30 pointer-events-none"
          style={{ width: `${progress * 100}%` }}
        />
      )}
      <div className={`relative flex gap-2 ${dim ? 'opacity-40' : ''}`}>
        {icon && (
          <div className="relative w-12 aspect-5/4 shrink-0 self-center">
            <ItemIcon id={icon} alt={name} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex justify-between items-center gap-1">
            <span className="text-xs font-semibold text-ink truncate">
              {name}
              {badge}
            </span>
            {progress != null && (
              <span className="text-xs text-accent-strong shrink-0">{Math.floor(progress * 100)}%</span>
            )}
          </div>

          {ingredients && (
            <div className="text-xs mt-0.5">
              {ingredients.map((ing) => (
                <span
                  key={ing.name}
                  className={`mr-1 ${ing.have >= ing.qty ? 'text-ink-muted' : 'text-danger'}`}
                >
                  {ing.name}×{ing.qty}({ing.have})
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-between text-xs text-ink-muted mt-0.5">
            <span>
              {priceLabel ?? `${price}G`} ・ 在庫{stock}
            </span>
            <span className={ratePerMin > 0 ? 'text-success' : 'text-ink-subtle'}>
              {ratePerMin > 0 ? `+${ratePerMin.toFixed(2)}/分` : '—'}
            </span>
          </div>
        </div>
      </div>
    </Tag>
  )
}
