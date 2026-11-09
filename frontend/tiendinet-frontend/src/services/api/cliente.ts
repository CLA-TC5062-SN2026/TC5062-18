import createClient, { type Client, type Middleware } from 'openapi-fetch'
import { sesionVencida, useSesion } from '@/stores/sesion'
import type { paths } from '@/types/api'
import { ErrorApi, errorDeRed, errorDesdeRespuesta } from './errores'

// Cliente HTTP de TiendiNet: openapi-fetch (fetch nativo + tipos del contrato) con
// tres interceptores (middleware). Cada petición pasa por ellos en este orden:
//
//   onRequest:  autenticación → tiempo límite → fetch
//   onResponse: errores (convierte cualquier 4xx/5xx en ErrorApi y lo lanza)
//   onError:    errores (convierte fallos de red en ErrorApi con mensaje para el usuario)
//
// Los servicios (authService, productosService…) solo llaman a `api.GET/POST/…` y
// reciben datos tipados o una excepción ErrorApi. Ningún componente usa fetch directamente.

/** URL base de la API, desde VITE_API_URL (ver .env.example). Acepta rutas relativas como /api. */
export function urlBaseApi(): string {
  const configurada = import.meta.env.VITE_API_URL || '/api'
  const origen = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  return new URL(configurada, origen).href.replace(/\/$/, '')
}

// Rutas a las que nunca se envía el JWT: el inicio de sesión y los flujos con enlace de un uso.
const RUTAS_SIN_TOKEN = new Set([
  '/auth/sesiones',
  '/auth/recuperacion-contrasena',
  '/auth/restablecer-contrasena',
  '/usuarios/activacion',
])

// Tiempos límite. La sincronización de proveedores puede tardar hasta 60 s (RNF-03).
const TIEMPO_LIMITE_MS = 20_000
const TIEMPO_LIMITE_LARGO_MS: Record<string, number> = {
  '/sincronizaciones-proveedores': 70_000,
}

/** Interceptor 1: agrega `Authorization: Bearer <JWT>` y descarta tokens vencidos. */
export const interceptorAutenticacion: Middleware = {
  onRequest({ request, schemaPath }) {
    if (RUTAS_SIN_TOKEN.has(schemaPath)) return request

    const { token, expiraEn, cerrar } = useSesion.getState()
    if (!token) return request

    if (sesionVencida(expiraEn)) {
      cerrar('vencida')
      throw new ErrorApi({
        estado: 401,
        codigo: 'SESION_VENCIDA',
        mensaje: 'Tu sesión venció. Inicia sesión de nuevo.',
      })
    }
    request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
}

/** Interceptor 2: corta la petición si el servidor no responde a tiempo. */
export const interceptorTiempoLimite: Middleware = {
  onRequest({ request, schemaPath }) {
    const limite = TIEMPO_LIMITE_LARGO_MS[schemaPath] ?? TIEMPO_LIMITE_MS
    return new Request(request, {
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(limite)]),
    })
  },
}

/** Interceptor 3: manejo de errores centralizado (HTTP y red). */
export const interceptorErrores: Middleware = {
  async onResponse({ response, schemaPath, request }) {
    if (response.ok) return response

    const error = await errorDesdeRespuesta(response, schemaPath)

    // 401 con sesión: el token venció o el Dueño desactivó la cuenta (RF-03-AC-2).
    // Se cierra la sesión una sola vez, aquí, para todos los portales y pantallas.
    if (error.estado === 401 && request.headers.has('Authorization')) {
      useSesion.getState().cerrar('vencida')
    }
    throw error
  },
  onError({ error }) {
    return errorDeRed(error)
  },
}

/** Crea un cliente con los interceptores. Las pruebas pasan su propio `fetch`. */
export function crearClienteApi(opciones: { baseUrl?: string; fetch?: typeof fetch } = {}): Client<paths> {
  const cliente = createClient<paths>({
    baseUrl: opciones.baseUrl ?? urlBaseApi(),
    fetch: opciones.fetch,
    headers: { Accept: 'application/json' },
  })
  cliente.use(interceptorAutenticacion, interceptorTiempoLimite, interceptorErrores)
  return cliente
}

/** Cliente único que usan todos los servicios. */
export const api = crearClienteApi({
  // Se resuelve en cada llamada para que las pruebas puedan sustituir globalThis.fetch.
  fetch: (...args) => globalThis.fetch(...args),
})

/**
 * Devuelve los datos de una respuesta exitosa. Los errores ya se lanzaron en el
 * interceptor, así que aquí solo queda la rama de éxito.
 */
export function datos<T>(resultado: { data?: T }): T {
  return resultado.data as T
}
