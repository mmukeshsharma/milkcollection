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
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
