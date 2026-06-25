import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/holo_guild',
  images: {
    // このNextはローカル画像の既定 localPatterns が [{pathname:'**', search:''}] で
    // クエリ文字列を一切許可しない。立ち絵のキャッシュバスティング（?v=N）を使うため上書きする。
    localPatterns: [
      // クエリなしの通常画像（アイコン・guildRank・フォールバック等）すべて
      { pathname: '/holo_guild/**', search: '' },
      // 立ち絵は ?v=N 付き。search を省略して任意のバージョンを許可する
      // （ASSET_VERSION を上げてもこの設定の変更は不要。対象は characters 配下のみ）。
      { pathname: '/holo_guild/characters/**' },
    ],
  },
  // サーバー(nginx)が末尾スラッシュ付きで配信している。Next 既定では末尾スラッシュを
  // 除去するリダイレクトを行うため、サーバーの付与と衝突してリダイレクトループになる。
  // このフラグで Next 側の末尾スラッシュ付与/除去リダイレクトを一切無効化し、
  // 末尾スラッシュの扱いはサーバーに一任する（/_next/image への余計な308も防げる）。
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
