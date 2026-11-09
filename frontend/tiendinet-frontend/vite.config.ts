import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Dos portales en un mismo proyecto Vite (modo multipágina):
//   /         -> Portal Cliente (index.html, catálogo público)
//   /tienda/  -> Portal Tienda  (tienda/index.html, exige sesión)
// Cada portal genera su propio bundle: el código de la tienda no se descarga en el catálogo.

// En desarrollo, cualquier ruta /tienda/... sirve tienda/index.html para que
// React Router resuelva rutas internas al recargar la página.
function rutasPortalTienda(): Plugin {
  return {
    name: 'tiendinet:rutas-portal-tienda',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? ''
        const esRutaDeTienda = url === '/tienda' || url.startsWith('/tienda/')
        const esArchivo = /\.[a-z0-9]+(\?.*)?$/i.test(url)
        if (esRutaDeTienda && !esArchivo) req.url = '/tienda/index.html'
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const destinoApi = env.API_PROXY_TARGET || 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss(), rutasPortalTienda()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      // GitHub Codespaces publica el puerto en https://<codespace>-5173.app.github.dev.
      // Sin esto, Vite responde "Blocked request. This host is not allowed".
      allowedHosts: ['.app.github.dev'],
      // VITE_API_URL=/api en desarrollo: el proxy reenvía a FastAPI y evita configurar CORS.
      proxy: {
        '/api': {
          target: destinoApi,
          changeOrigin: true,
          rewrite: (ruta) => ruta.replace(/^\/api/, ''),
        },
      },
    },
    preview: {
      allowedHosts: ['.app.github.dev'],
    },
    build: {
      rollupOptions: {
        input: {
          cliente: fileURLToPath(new URL('./index.html', import.meta.url)),
          tienda: fileURLToPath(new URL('./tienda/index.html', import.meta.url)),
        },
      },
    },
  }
})
