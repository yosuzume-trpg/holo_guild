// basePath(/holo_guild)配下のため背景画像 URL にも basePath を含める
const BASE_PATH = '/holo_guild'

interface Props {
  /** 親愛度（ハート背景の上に表示する数値） */
  level: number
  /** サイズ・文字色などを指定（既定: w-10 h-10 の文字大） */
  className?: string
}

/** ハート画像(public/heart.png)を背景に親愛度の数値を重ねて表示するバッジ。 */
export default function AffectionBadge({ level, className = 'w-10 h-10 text-xl' }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center bg-contain bg-center bg-no-repeat font-extrabold text-white leading-none ${className}`}
      style={{ backgroundImage: `url(${BASE_PATH}/heart.png)` }}
    >
      {level}
    </span>
  )
}
