import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Coolify nem sempre passa env vars como build-args mesmo com is_buildtime=true.
  // Forçar o inlining via next.config garante que NEXT_PUBLIC_API_URL chegue no bundle.
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      'https://bullq2-api.187.127.30.142.sslip.io/api/v1',
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
};

export default nextConfig;
