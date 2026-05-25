import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RapidStats MY — Malaysia Transit Dashboard',
    short_name: 'RapidStats',
    description:
      'Daily ridership analytics for Malaysia Klang Valley rail and bus networks from data.gov.my.',
    start_url: '/',
    display: 'standalone',
    background_color: '#070e07',
    theme_color: '#336443',
    orientation: 'portrait-primary',
    categories: ['transportation', 'data', 'analytics'],
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
