'use client'

import type { CSSProperties } from 'react'
import Image from 'next/image'
import { getCharacterMaster } from '@/data/characters'
import { useGameStore } from '@/store/gameStore'
import { withSafeSuffix } from '@/utils/safeImage'

// basePath(/holo_guild)配下のため src には basePath を含める（next/image の仕様）
const BASE_PATH = '/holo_guild'
const FALLBACK = `${BASE_PATH}/characters/default/portrait.png`

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const SIZE_CLASS: Record<AvatarSize, string> = {
  xs:    'w-8 h-8',
  sm:    'w-9 h-9',
  md:    'w-10 h-10',
  lg:    'w-12 h-12',
  xl:    'w-20 h-20',
  '2xl': 'w-24 h-24',
}

/**
 * 立ち絵(1000×2000)の頭部を切り出した正方形アイコン。
 * 元画像の x:167〜833（中央2/3）・y:0〜667（上1/3）＝約667px四方を枠いっぱいに拡大表示する。
 *
 * ── 後で専用アイコン画像に差し替える場合（この1ファイルだけ直せばよい）──
 * src を `${BASE_PATH}/characters/icon/${id}.png` 等に変更し、下の CROP_STYLE を外して
 * Image を `fill className="object-cover"` の通常表示にすればよい。
 */
const CROP_STYLE: CSSProperties = {
  width: '150%',   // 1000/667 ≒ 150%（横の切り出し667pxを枠幅に合わせる倍率）
  height: '300%',  // 2000/667 ≒ 300%
  left: '-25%',    // 左右1/6を切り落として中央寄せ
  top: '0%',       // 上端そろえ
  maxWidth: 'none',
}

interface Props {
  masterId: string
  size?: AvatarSize
  className?: string
}

/** キャラクターのアイコン（立ち絵の頭部を流用）。各ページで共通利用する。 */
export default function CharacterAvatar({ masterId, size = 'md', className = '' }: Props) {
  const master = getCharacterMaster(masterId)
  const safeMode = useGameStore((s) => s.safeMode)
  const src = master?.portrait
    ? `${BASE_PATH}${withSafeSuffix(master.portrait, safeMode)}`
    : FALLBACK
  return (
    <div
      className={`relative overflow-hidden rounded-full bg-surface-3 shrink-0 ${SIZE_CLASS[size]} ${className}`}
    >
      <Image
        src={src}
        alt={master?.name ?? masterId}
        width={1000}
        height={2000}
        sizes="150px"
        className="absolute"
        style={CROP_STYLE}
      />
    </div>
  )
}
