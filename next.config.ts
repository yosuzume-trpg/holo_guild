import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/holo_guild',
  images: {
    // next/image はローカル画像でクエリ文字列を使う場合 localPatterns の許可が必要。
    // 立ち絵のキャッシュバスティング（?v=N）を使うため、その分を明示的に許可する。
    localPatterns: [
      // クエリなしの通常画像（アイコン・guildRank・フォールバック等）すべて
      { pathname: '/holo_guild/**', search: '' },
      // 立ち絵はバージョン付き（utils/safeImage.ts の ASSET_VERSION と一致させること）
      { pathname: '/holo_guild/characters/**', search: '?v=1' },
    ],
  },
  // サーバー(nginx)が末尾スラッシュ付きで配信している。Next 既定では末尾スラッシュを
  // 除去するリダイレクトを行うため、サーバーの付与と衝突してリダイレクトループになる。
  // このフラグで Next 側の末尾スラッシュ付与/除去リダイレクトを一切無効化し、
  // 末尾スラッシュの扱いはサーバーに一任する（/_next/image への余計な308も防げる）。
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
