import type { ReactNode } from 'react'

interface Props {
  slotCount: number
  /** 枠数の右に表示する補足（例: 上限 GR×10=40） */
  slotNote?: ReactNode
  /** ボーナス行のラベル（例: 研究ボーナス / 販売速度ボーナス / 製作速度ボーナス） */
  bonusLabel: string
  /** ボーナス率（0〜1の割合）。+{n}% として表示 */
  bonusPct: number
  gold: number
  expandCost: number
  researchCost: number
  onExpand: () => void
  onResearch: () => void
  /** 拡張が上限に達している場合 true（ボタンを無効化し「拡張上限」表記にする） */
  expandAtMax?: boolean
  /** 研究が上限に達している場合 true */
  researchAtMax?: boolean
}

const BTN_CLASS =
  'flex-1 text-xs bg-surface-2 hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed border border-line-strong rounded py-1.5 transition-colors'

/** 施設の枠数・ボーナス表示と拡張/研究ボタンの共通枠。生産施設・商人/工芸ギルドで共有。 */
export default function FacilityStatsBox({
  slotCount,
  slotNote,
  bonusLabel,
  bonusPct,
  gold,
  expandCost,
  researchCost,
  onExpand,
  onResearch,
  expandAtMax = false,
  researchAtMax = false,
}: Props) {
  return (
    <div className="bg-surface rounded-lg p-3 text-sm space-y-1">
      <div className="flex justify-between text-ink">
        <span>枠数</span>
        <span className="font-semibold">
          {slotCount}
          {slotNote && <span className="text-xs text-ink-subtle"> {slotNote}</span>}
        </span>
      </div>
      <div className="flex justify-between text-ink">
        <span>{bonusLabel}</span>
        <span className="font-semibold text-success">+{(bonusPct * 100).toFixed(0)}%</span>
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={onExpand} disabled={gold < expandCost || expandAtMax} className={BTN_CLASS}>
          {expandAtMax ? '拡張上限' : `拡張 (${expandCost.toLocaleString()}G)`}
        </button>
        <button
          onClick={onResearch}
          disabled={gold < researchCost || researchAtMax}
          className={BTN_CLASS}
        >
          {researchAtMax ? '研究上限' : `研究 (${researchCost.toLocaleString()}G)`}
        </button>
      </div>
    </div>
  )
}
