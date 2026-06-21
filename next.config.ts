import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/holo_guild',
  // サーバー(nginx)が末尾スラッシュ付きで配信している。Next 既定では末尾スラッシュを
  // 除去するリダイレクトを行うため、サーバーの付与と衝突してリダイレクトループになる。
  // このフラグで Next 側の末尾スラッシュ付与/除去リダイレクトを一切無効化し、
  // 末尾スラッシュの扱いはサーバーに一任する（/_next/image への余計な308も防げる）。
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
