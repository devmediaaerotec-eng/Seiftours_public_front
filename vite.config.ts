import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Serves the Vercel Functions in api/ (e.g. api/mygo.ts -> /api/mygo) from the dev server,
// so `npm run dev` works without `vercel dev`.
function vercelApi(): Plugin {
  return {
    name: 'vercel-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
const url = new URL(req.url ?? '/', 'http://localhost')
if (!url.pathname.startsWith('/api/')) return next()
if (url.pathname.startsWith('/api/public/') || url.pathname.startsWith('/api/admin/')) return next()   // <- ICI
// No such function: 404 like Vercel
if (!fs.existsSync(path.join(server.config.root, `${url.pathname}.ts`))) {
          res.statusCode = 404
          return res.end()
        }
        try {
          const mod = await server.ssrLoadModule(`${url.pathname}.ts`)
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            return res.end()
          }
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const response: Response = await handler(
            new Request(url, {
              method: req.method,
              headers: { 'content-type': req.headers['content-type'] ?? '' },
              body: chunks.length ? Buffer.concat(chunks) : undefined,
            })
          )
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-only secrets (MYGO_*) for api/ functions; never exposed to the browser (no VITE_ prefix)
  Object.assign(process.env, loadEnv(mode, process.cwd(), 'MYGO_'))

  return {
    plugins: [react(), vercelApi()],
    resolve: {
      alias: [
        { find: '@/components', replacement: path.resolve(__dirname, 'src/component') },
        { find: '@/contexts', replacement: path.resolve(__dirname, 'src/contexts') },
        { find: '@', replacement: path.resolve(__dirname, 'src') },
      ],
    },

    server: {
    proxy: {
      '/api/public': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads':    { target: 'http://localhost:8000', changeOrigin: true },
    },
  },

  }
})
