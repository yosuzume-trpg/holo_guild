/**
 * 立ち絵アセットのキャッシュバスティング用バージョン。
 * 画像を差し替えたらこの数値を上げると、ブラウザが新しい画像を取得し直す。
 */
export const ASSET_VERSION = 1

/**
 * 画像パスの拡張子の直前に任意の接尾辞を挿入する。
 * 例: withSuffix('/characters/r1_01.webp', '_icon') → '/characters/r1_01_icon.webp'
 */
export function withSuffix(path: string, suffix: string): string {
  const dot = path.lastIndexOf('.')
  if (dot === -1) return `${path}${suffix}`
  return `${path.slice(0, dot)}${suffix}${path.slice(dot)}`
}

/**
 * セーフモード時は画像パスの拡張子の前に `_safe` を付与する。
 * 例: /characters/r1_01.webp → /characters/r1_01_safe.webp
 * safeMode が false のときは元のパスをそのまま返す。
 */
export function withSafeSuffix(path: string, safeMode: boolean): string {
  return safeMode ? withSuffix(path, '_safe') : path
}
