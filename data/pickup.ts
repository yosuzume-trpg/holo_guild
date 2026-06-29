import { mulberry32 } from '@/utils/prng'

/** 文字列キーを uint32 ハッシュに変換する（FNV-1a）。 */
function hashKey(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * rotationIndex と key（地域id／装備プールキー）から、pool 内の1件を決定的に選ぶ。
 * 同じ rotationIndex・key なら必ず同じ要素を返すため、3サイクルのローテーション内では
 * ピックアップ対象がリロード・画面遷移をまたいでも固定される。
 * key を混ぜることで地域・プールごとに異なるピックアップになる。
 */
export function getPickup<T>(pool: T[], rotationIndex: number, key: string): T {
  const seed =
    (hashKey(key) ^ ((Math.max(0, rotationIndex) + 1) * 2654435761)) >>> 0
  const rng = mulberry32(seed)
  return pool[Math.floor(rng() * pool.length)]
}
