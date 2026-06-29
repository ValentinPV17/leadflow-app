import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

function logoProxyPlugin(): Plugin {
  return {
    name: 'logo-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/logo')) return next()
        const qs = req.url.includes('?') ? req.url.split('?')[1] : ''
        const domainMatch = qs.match(/(?:^|&)domain=([^&]+)/)
        const domain = domainMatch ? decodeURIComponent(domainMatch[1]) : ''
        try {
          const upstream = await fetch(`https://logo.clearbit.com/${domain}?size=128`)
          if (upstream.ok) {
            const buf = await upstream.arrayBuffer()
            res.writeHead(200, {
              'Content-Type': upstream.headers.get('content-type') || 'image/png',
              'Cache-Control': 'public, max-age=86400',
            })
            res.end(Buffer.from(buf))
            return
          }
        } catch {}
        // fallback: Google favicon
        res.writeHead(302, { Location: `https://www.google.com/s2/favicons?domain=${domain}&sz=128` })
        res.end()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), logoProxyPlugin()],
  server: {
    proxy: {
      '/api/apollo': {
        target: 'https://api.apollo.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/apollo/, ''),
      },
      '/api/hubspot': {
        target: 'https://api.hubapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hubspot/, ''),
      },
    },
  },
})
