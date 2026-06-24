import { MATERIALS } from '@/data/materials'
import { RECIPES } from '@/data/recipes'
import {
  DELIVERY_ROTATION_CYCLES,
  DELIVERY_QUEST_COUNT,
  DELIVERY_REWARD_MULTIPLIER,
  DELIVERY_QTY_MIN,
  DELIVERY_QTY_MAX,
} from '@/data/constants'

export interface DeliveryQuest {
  /** ローテーション内のスロット番号（0..DELIVERY_QUEST_COUNT-1） */
  slot: number
  itemId: string
  name: string
  /** 必要納品数 */
  qty: number
  /** 報酬ゴールド = round(基準価格 × 倍率) × qty */
  reward: number
}

/**
 * 納品対象アイテムのプール。
 * 商人ギルドの売却対象（SELL_CANDIDATES）と同じ範囲：
 * 非ダンジョン生産素材 + 全レシピ（工芸品）。基準価格は素材の price / レシピの sellPrice。
 */
export const DELIVERABLE_ITEMS: { id: string; name: string; basePrice: number }[] = [
  ...MATERIALS.filter((m) => m.facility !== 'dungeon').map((m) => ({
    id: m.id, name: m.name, basePrice: m.price,
  })),
  ...RECIPES.map((r) => ({
    id: r.id, name: r.name, basePrice: r.sellPrice,
  })),
]

/** 総サイクル数から現在の納品ローテーション番号を求める（サイクル1〜3 → 0、4〜6 → 1 …）。 */
export function getDeliveryRotationIndex(cycleCount: number): number {
  return Math.floor((cycleCount - 1) / DELIVERY_ROTATION_CYCLES)
}

/** mulberry32: 軽量な決定的擬似乱数。seed から [0,1) を返す関数を生成する。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * rotationIndex を基準に決定的に納品クエストを生成する。
 * リロード・画面遷移をまたいでも同じ rotationIndex なら必ず同じ内容になる。
 */
export function generateDeliveryQuests(rotationIndex: number): DeliveryQuest[] {
  // 負のローテーション（理論上発生しないが安全策）は 0 として扱う
  const rng = mulberry32((Math.max(0, rotationIndex) + 1) * 2654435761)
  const pool = [...DELIVERABLE_ITEMS]
  const count = Math.min(DELIVERY_QUEST_COUNT, pool.length)
  const quests: DeliveryQuest[] = []

  for (let slot = 0; slot < count; slot++) {
    // 重複なしで選出（Fisher–Yates 的に末尾と入れ替えて取り出す）
    const idx = Math.floor(rng() * pool.length)
    const item = pool[idx]
    pool[idx] = pool[pool.length - 1]
    pool.pop()

    const span = DELIVERY_QTY_MAX - DELIVERY_QTY_MIN + 1
    const qty = DELIVERY_QTY_MIN + Math.floor(rng() * span)
    const reward = Math.round(item.basePrice * DELIVERY_REWARD_MULTIPLIER) * qty

    quests.push({ slot, itemId: item.id, name: item.name, qty, reward })
  }

  return quests
}
