import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // 画像の最適化サーバー（Next.js標準）を使わない設定（静的エクスポートでエラーを出さないため）
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

