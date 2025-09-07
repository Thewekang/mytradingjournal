/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker image runtime
  output: 'standalone',
  // Add common security headers (CSP can be added via env to avoid breaking during development)
  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "font-src 'self' data:",
      "connect-src 'self' https: http:",
    ].join('; ');
    const enableCsp = process.env.ENABLE_CSP === '1';
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          ...(enableCsp ? [{ key: 'Content-Security-Policy', value: cspDirectives }] : []),
        ],
      },
    ];
  },
};
export default nextConfig;
