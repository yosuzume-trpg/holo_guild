import Image from 'next/image'
import { getCharacterMaster } from '@/data/characters'

// basePath(/holo_guild)配下のため src には basePath を含める（next/image の仕様）
const BASE_PATH = '/holo_guild'
const FALLBACK = `${BASE_PATH}/characters/default/portrait.png`

interface Props {
  masterId: string
  /** 画像に付与するクラス（既定: object-cover object-top）。親要素は relative + サイズ指定が必要（fill のため） */
  className?: string
  priority?: boolean
  /** next/image の sizes（レイアウト上の表示幅の目安）。既定 "160px" */
  sizes?: string
}

/**
 * キャラクターの立ち絵を表示する。master.portrait（/characters/{id}.png）を参照し、
 * 未定義時はデフォルト立ち絵にフォールバックする。
 * 親要素に `relative` とサイズ指定が必要（next/image の fill を使用）。
 */
export default function CharacterPortrait({ masterId, className, priority, sizes = '160px' }: Props) {
  const master = getCharacterMaster(masterId)
  const src = master?.portrait ? `${BASE_PATH}${master.portrait}` : FALLBACK
  return (
    <Image
      src={src}
      alt={master?.name ?? masterId}
      fill
      sizes={sizes}
      priority={priority}
      className={className ?? 'object-cover object-top'}
    />
  )
}
