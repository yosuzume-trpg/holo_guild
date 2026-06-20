interface Props {
  /** 進捗率（0〜100）。範囲外はクランプされる */
  pct: number
  /** バーの色クラス（既定: bg-accent） */
  color?: string
  /** トラックの色クラス（既定: bg-surface-2） */
  trackColor?: string
  /** 高さクラス（既定: h-1.5） */
  heightClass?: string
  /** バーに付与する追加クラス（トランジション等） */
  barClassName?: string
}

/** 各ページで重複していたプログレスバーの共通コンポーネント。 */
export default function ProgressBar({
  pct,
  color = 'bg-accent',
  trackColor = 'bg-surface-2',
  heightClass = 'h-1.5',
  barClassName = 'transition-all',
}: Props) {
  return (
    <div className={`w-full ${heightClass} ${trackColor} rounded-full overflow-hidden`}>
      <div
        className={`h-full ${color} rounded-full ${barClassName}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}
