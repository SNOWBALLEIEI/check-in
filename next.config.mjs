/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/members',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
