import { useSesion } from '@/stores/sesion'

// Adaptador del frontend hacia el puerto REST del monolito (ADR-001).
// Todas las llamadas a la API pasan por aquí: agrega la URL base, el JWT y
// el manejo común de errores.

const URL_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class ErrorApi extends Error {
  readonly estado: number
  readonly detalle: unknown

  constructor(estado: number, mensaje: string, detalle?: unknown) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.detalle = detalle
  }
}

type Opciones = Omit<RequestInit, 'body'> & { cuerpo?: unknown }

export async function llamarApi<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const { cuerpo, headers, ...resto } = opciones
  const token = useSesion.getState().token

  let respuesta: Response
  try {
    respuesta = await fetch(`${URL_BASE}${ruta}`, {
      ...resto,
      headers: {
        Accept: 'application/json',
        ...(cuerpo !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con la API. ¿Está corriendo el backend?')
  }

  // Sesión vencida o cuenta inactiva: se cierra la sesión (RF-03-AC-2).
  // Al cerrarla, query-client.ts limpia la caché de TanStack Query.
  if (respuesta.status === 401 && token) {
    useSesion.getState().cerrar()
  }

  // En desarrollo, el proxy de Vite responde 502/504 si FastAPI no está corriendo.
  if (respuesta.status === 502 || respuesta.status === 504) {
    throw new ErrorApi(0, 'No se pudo conectar con la API. ¿Está corriendo el backend?')
  }

  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => undefined)
    throw new ErrorApi(respuesta.status, `La API respondió ${respuesta.status}`, detalle)
  }

  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}
