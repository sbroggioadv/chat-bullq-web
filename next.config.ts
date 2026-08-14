import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Coolify nem sempre passa env vars como build-args mesmo com is_buildtime=true.
  // Forçar o inlining via next.config garante que NEXT_PUBLIC_API_URL chegue no bundle.
  // Fallback aponta pro FQDN canônico iacombativa.com — sslip.io removido em S17/C2
  // (2026-05-13). Não há mais DNS sslip.io ativo apontando pro app de prod.
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      'https://api.bullq.iacombativa.com/api/v1',
  },
  async redirects() {
    return [
      {
        source: '/settings',
        destination: '/settings/channels',
        permanent: false,
      },
    ];
  },
  async headers() {
    // Document HTML was going out with s-maxage=31536000. After a deploy
    // Chrome kept the old /inbox document + old chunk hashes → 404 or the
    // crashed bundle, and the tab died as "This page couldn't load".
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
