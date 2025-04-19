import withPWAInit from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // register: true, // Service workerを即時登録する場合はコメントを外す
  // scope: '/app', // PWAのスコープを指定する場合
  // sw: 'service-worker.js', // Service workerファイル名を変更する場合
});

export default withPWA(nextConfig);
