'use client'

import { getCharacterMaster } from '@/data/characters'
import { ASSET_VERSION } from '@/utils/safeImage'

// basePath(/holo_guild)配下のため src には basePath を含める
const BASE_PATH = '/holo_guild'

interface Props {
  masterId: string
  onClose: () => void
}

/**
 * 交遊時に表示するカットインのポップアップ。
 * 画面全体のオーバーレイにカットイン画像を表示し、タップで閉じる。
 * セーフモード時は呼び出し側で表示しない想定（このコンポーネントは常に表示する）。
 * カットインは元画像のアスペクト比のまま表示したいので next/image ではなく素の img を使う。
 */
export default function CutinPopup({ masterId, onClose }: Props) {
  const master = getCharacterMaster(masterId)
  if (!master?.cutin) return null
  const src = `${BASE_PATH}${master.cutin}?v=${ASSET_VERSION}`
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={master.name}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
      />
    </div>
  )
}
