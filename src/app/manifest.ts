import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sharma Dairy',
    short_name: 'SharmaDairy',
    description: 'Dairy operations management',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#1d4ed8',
    icons: [
      {
        src: '/next.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
