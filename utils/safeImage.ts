/**
 * 立ち絵アセットのキャッシュバスティング用バージョン。
 * 画像を差し替えたらこの数値を上げると、ブラウザが新しい画像を取得し直す。
 */
export const ASSET_VERSION = 1

/**
 * セーフモード時は画像パスの拡張子の前に `_safe` を付与する。
 * 例: /characters/r1_01.webp → /characters/r1_01_safe.webp
 * safeMode が false のときは元のパスをそのまま返す。
 */
export function withSafeSuffix(path: string, safeMode: boolean): string {
  if (!safeMode) return path
  const dot = path.lastIndexOf('.')
  if (dot === -1) return `${path}_safe`
  return `${path.slice(0, dot)}_safe${path.slice(dot)}`
}
