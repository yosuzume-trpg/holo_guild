'use client'

import { useGameStore } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useFacilityStore } from '@/store/facilityStore'
import { useDungeonStore } from '@/store/dungeonStore'
import { useManualProductionStore } from '@/store/manualProductionStore'
import { useProductionFracStore } from '@/store/productionFracStore'
import { useTavernStore } from '@/store/tavernStore'

// 全ストアの永続化キーはこの接頭辞（holo-guild-game / -characters / -inventory /
// -facilities / -dungeon / -manual-prod / -prod-frac / -tavern）。接頭辞で一括して扱う。
export const SAVE_PREFIX = 'holo-guild-'

// 永続化される全ストア。ロード/インポート後の再ハイドレートやセーブ前のフラッシュに使う。
// 新しい永続ストアを追加したらここにも追加すること。
const PERSISTED_STORES: {
  persist: { rehydrate: () => unknown }
  setState: (partial: Record<string, never>) => void
}[] = [
  useGameStore, useCharacterStore, useInventoryStore, useFacilityStore,
  useDungeonStore, useManualProductionStore, useProductionFracStore, useTavernStore,
]

/** localStorage から holo-guild-* の値を集める */
export function collectLocalSave(): Record<string, string> {
  const data: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(SAVE_PREFIX)) data[k] = localStorage.getItem(k) ?? ''
  }
  return data
}

/**
 * セーブ/エクスポート用にデータを収集する。
 *
 * 収集前に各ストアへ空更新（setState({})）を流して「いま表示しているこのタブの状態」を
 * localStorage に確実に書き出す。これにより、別タブが古い状態を書き戻して localStorage が
 * 食い違っていても（例: 旧タブのティックで characters が巻き戻る）、クラウドセーブが
 * 空/古いキャラデータを保存してしまうのを防ぐ。
 */
export function captureLocalSave(): Record<string, string> {
  for (const s of PERSISTED_STORES) s.setState({})
  return collectLocalSave()
}

/** 既存の holo-guild-* を消してから data を書き戻す（リロードは呼び出し側で行う） */
export function applyLocalSave(data: Record<string, string>): void {
  const stale: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(SAVE_PREFIX)) stale.push(k)
  }
  for (const k of stale) localStorage.removeItem(k)
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith(SAVE_PREFIX) && typeof v === 'string') localStorage.setItem(k, v)
  }
}

/** スロット一覧に表示するメタ情報を現在のゲーム状態から取得 */
export function readSaveMeta(): { cycleCount: number; gold: number; guildRank: number } {
  const s = useGameStore.getState()
  return { cycleCount: s.cycleCount, gold: s.gold, guildRank: s.guildRank }
}

/**
 * ロード/インポートしたデータで localStorage を復元し、リロードする。
 *
 * applyLocalSave 直後に（await を挟まず同期で）全ストアを再ハイドレートしてから
 * reload するのが要点。こうしないと、書き込み〜リロード完了までの数ミリ秒の間に
 * GameShell のティック（サイクル/生産/heartbeat 等）が発火し、メモリ上の古い状態が
 * 一部ストアの localStorage を書き戻して「一部だけ巻き戻る」現象が起きる。
 * 同期で再ハイドレートしてメモリ状態を復元内容に揃えておけば、以降どのティックが
 * 発火しても書き戻されるのは復元後の値になる。
 */
export function restoreLocalSaveAndReload(data: Record<string, string>): void {
  applyLocalSave(data)
  for (const s of PERSISTED_STORES) s.persist.rehydrate()
  location.reload()
}
