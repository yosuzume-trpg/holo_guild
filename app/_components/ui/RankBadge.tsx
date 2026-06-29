// basePath(/holo_guild)配下のため背景画像 URL にも basePath を含める
const BASE_PATH = '/holo_guild'

interface Props {
  /** ★ランク（ランク画像の上に表示する数値） */
  rank: number
  /** サイズ・文字色などを指定（既定: w-6 h-6 の小さめ） */
  className?: string
}

/** ランク画像(public/rank.webp)を背景に★ランクの数値を重ねて表示するバッジ。 */
export default function RankBadge({ rank, className = 'w-6 h-6 text-xs' }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center bg-contain bg-center bg-no-repeat font-bold text-ink leading-none ${className}`}
      style={{ backgroundImage: `url(${BASE_PATH}/rank.webp)` }}
    >
      {rank}
    </span>
  )
}
