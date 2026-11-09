import type { DetalleError } from '@/types/api'

// Manejo de errores centralizado. Toda respuesta de error de la API y todo fallo de
// red se convierte aquí en un ErrorApi con un mensaje listo para mostrar al usuario.
// Los componentes solo leen `error.message` (o `mensajeDeCampo`) y nunca interpretan
// códigos HTTP por su cuenta.

/** Estado 0 = no hubo respuesta HTTP (sin conexión, tiempo agotado, servidor caído). */
export const SIN_RESPUESTA = 0

export class ErrorApi extends Error {
  /** Código HTTP, o 0 si no hubo respuesta. */
  readonly estado: number
  /** Código de negocio del contrato (CREDENCIALES_INVALIDAS, SIN_EXISTENCIA…) o de red (SIN_CONEXION…). */
  readonly codigo?: string
  /** Errores por campo que la API manda en los 422. */
  readonly detalles: DetalleError[]
  /** Segundos de espera en un 429 (bloqueo del inicio de sesión). */
  readonly reintentaEnSegundos?: number
  /** Cuerpo completo de la respuesta, por si una pantalla necesita un dato extra (p. ej. `faltante`). */
  readonly cuerpo?: unknown

  constructor(opciones: {
    estado: number
    mensaje: string
    codigo?: string
    detalles?: DetalleError[]
    reintentaEnSegundos?: number
    cuerpo?: unknown
  }) {
    super(opciones.mensaje)
    this.name = 'ErrorApi'
    this.estado = opciones.estado
    this.codigo = opciones.codigo
    this.detalles = opciones.detalles ?? []
    this.reintentaEnSegundos = opciones.reintentaEnSegundos
    this.cuerpo = opciones.cuerpo
  }

  /** true si el problema fue la conexión y no una respuesta de la API. */
  get esDeRed(): boolean {
    return this.estado === SIN_RESPUESTA
  }

  /** Mensaje de error de un campo en un 422, para pasarlo a <Campo error={…} />. */
  mensajeDeCampo(campo: string): string | undefined {
    return this.detalles.find((d) => d.campo === campo)?.mensaje
  }
}

// Mensajes por estado, para cuando la API no manda `mensaje` o no conviene mostrarlo.
const MENSAJE_POR_ESTADO: Record<number, string> = {
  400: 'La solicitud no es válida. Revisa los datos e intenta de nuevo.',
  401: 'Tu sesión terminó. Inicia sesión de nuevo.',
  403: 'No tienes permiso para hacer esta operación.',
  404: 'No encontramos lo que buscas.',
  409: 'La operación chocó con otro cambio. Actualiza la pantalla e intenta de nuevo.',
  422: 'Revisa los campos marcados.',
  429: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
  500: 'Ocurrió un error en el servidor. Intenta de nuevo en un momento.',
}

const MENSAJE_SIN_SERVIDOR =
  'No se pudo conectar con el servidor de TiendiNet. Intenta de nuevo en un momento.'

// En estas rutas un 401 significa "credenciales incorrectas", no "sesión vencida":
// ahí sí se muestra el mensaje de la API.
const RUTAS_DE_CREDENCIALES = new Set(['/auth/sesiones'])

/** Convierte una respuesta HTTP de error en ErrorApi. */
export async function errorDesdeRespuesta(respuesta: Response, rutaContrato: string): Promise<ErrorApi> {
  const { status } = respuesta

  // El proxy de Vite (o un balanceador) responde 502/503/504 cuando FastAPI no está arriba.
  if (status === 502 || status === 503 || status === 504) {
    return new ErrorApi({ estado: SIN_RESPUESTA, codigo: 'SERVIDOR_NO_DISPONIBLE', mensaje: MENSAJE_SIN_SERVIDOR })
  }

  const cuerpo = (await respuesta
    .clone()
    .json()
    .catch(() => undefined)) as
    | { mensaje?: string; codigo?: string; detalles?: DetalleError[]; reintentaEnSegundos?: number }
    | undefined

  const generico = MENSAJE_POR_ESTADO[status] ?? MENSAJE_POR_ESTADO[status >= 500 ? 500 : 400]
  let mensaje = cuerpo?.mensaje || generico

  // Un 500 nunca muestra detalle interno; un 401 fuera del login es sesión vencida.
  if (status >= 500) mensaje = MENSAJE_POR_ESTADO[500]
  if (status === 401 && !RUTAS_DE_CREDENCIALES.has(rutaContrato)) mensaje = MENSAJE_POR_ESTADO[401]

  return new ErrorApi({
    estado: status,
    mensaje,
    codigo: cuerpo?.codigo,
    detalles: cuerpo?.detalles,
    reintentaEnSegundos: cuerpo?.reintentaEnSegundos,
    cuerpo,
  })
}

/** Convierte una excepción de fetch (sin respuesta HTTP) en ErrorApi. */
export function errorDeRed(error: unknown): ErrorApi {
  if (error instanceof ErrorApi) return error

  const nombre = (error as { name?: string } | undefined)?.name
  if (nombre === 'TimeoutError') {
    return new ErrorApi({
      estado: SIN_RESPUESTA,
      codigo: 'TIEMPO_AGOTADO',
      mensaje: 'El servidor tardó demasiado en responder. Revisa tu conexión e intenta de nuevo.',
    })
  }
  if (nombre === 'AbortError') {
    return new ErrorApi({ estado: SIN_RESPUESTA, codigo: 'CANCELADA', mensaje: 'La operación se canceló.' })
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new ErrorApi({
      estado: SIN_RESPUESTA,
      codigo: 'SIN_CONEXION',
      mensaje: 'No hay conexión a internet. Revisa la red e intenta de nuevo.',
    })
  }
  return new ErrorApi({ estado: SIN_RESPUESTA, codigo: 'SERVIDOR_NO_DISPONIBLE', mensaje: MENSAJE_SIN_SERVIDOR })
}
