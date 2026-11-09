// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmarVenta, iniciarSesion, listarCatalogo, listarProductos, obtenerSesionActual } from '@/services'
import { useSesion } from '@/stores/sesion'
import { urlBaseApi } from './cliente'
import { ErrorApi } from './errores'

const fetchSimulado = vi.fn<typeof fetch>()

function responder(estado: number, cuerpo?: unknown) {
  fetchSimulado.mockResolvedValueOnce(
    new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

const peticion = (n = 0) => fetchSimulado.mock.calls[n][0] as Request

function conSesion(expiraEnMs = 60 * 60_000) {
  useSesion.getState().iniciar({
    token: 'jwt-de-prueba',
    tipo: 'Bearer',
    expiraEn: new Date(Date.now() + expiraEnMs).toISOString(),
    usuario: { id: 'u1', nombre: 'Ana', correo: 'ana@t.mx', rol: 'DUENO', estado: 'ACTIVO' },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSimulado)
  useSesion.getState().cerrar()
})
afterEach(() => {
  fetchSimulado.mockReset()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('URL base', () => {
  it('se lee de VITE_API_URL (absoluta)', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.tiendinet.mx/')
    expect(urlBaseApi()).toBe('https://api.tiendinet.mx')
  })

  it('acepta una ruta relativa como /api (proxy de desarrollo)', () => {
    vi.stubEnv('VITE_API_URL', '/api')
    expect(urlBaseApi()).toBe(`${window.location.origin}/api`)
  })
})

describe('interceptor de autenticación', () => {
  it('agrega el JWT a las operaciones protegidas', async () => {
    conSesion()
    responder(200, { datos: [], pagina: 1, tamano: 20, total: 0 })
    await listarProductos()
    expect(peticion().headers.get('Authorization')).toBe('Bearer jwt-de-prueba')
  })

  it('no envía el JWT al iniciar sesión', async () => {
    conSesion()
    responder(200, { token: 't', tipo: 'Bearer', expiraEn: '2030-01-01T00:00:00Z', usuario: {} })
    await iniciarSesion({ correo: 'a@t.mx', contrasena: 'x' })
    expect(peticion().headers.has('Authorization')).toBe(false)
  })

  it('descarta un token vencido sin llamar a la API', async () => {
    conSesion(-1000)
    await expect(obtenerSesionActual()).rejects.toMatchObject({ estado: 401, codigo: 'SESION_VENCIDA' })
    expect(fetchSimulado).not.toHaveBeenCalled()
    expect(useSesion.getState().token).toBeNull()
  })

  it('envía Idempotency-Key en las operaciones que cobran', async () => {
    conSesion()
    responder(200, { id: 'v1', estado: 'COMPLETADA', diferida: false, total: '77.00', renglones: [] })
    await confirmarVenta('v1', { formaPago: 'EFECTIVO', montoRecibido: '100.00' }, 'clave-123')
    expect(peticion().headers.get('Idempotency-Key')).toBe('clave-123')
    expect(await peticion().json()).toEqual({ formaPago: 'EFECTIVO', montoRecibido: '100.00' })
  })
})

describe('manejo de errores centralizado', () => {
  it('un 401 con sesión la cierra y da un mensaje claro (cuenta desactivada, RF-03-AC-2)', async () => {
    conSesion()
    responder(401, { mensaje: 'Correo o contraseña incorrectos', codigo: 'NO_AUTORIZADO' })
    await expect(obtenerSesionActual()).rejects.toMatchObject({
      estado: 401,
      message: 'Tu sesión terminó. Inicia sesión de nuevo.',
    })
    expect(useSesion.getState().token).toBeNull()
  })

  it('en el login, un 401 conserva el mensaje de la API', async () => {
    responder(401, { mensaje: 'Correo o contraseña incorrectos', codigo: 'CREDENCIALES_INVALIDAS' })
    await expect(iniciarSesion({ correo: 'a@t.mx', contrasena: 'x' })).rejects.toMatchObject({
      message: 'Correo o contraseña incorrectos',
      codigo: 'CREDENCIALES_INVALIDAS',
    })
  })

  it('un 422 expone los errores por campo', async () => {
    conSesion()
    responder(422, {
      mensaje: 'Revisa los campos marcados.',
      codigo: 'DATOS_INVALIDOS',
      detalles: [{ campo: 'precioVenta', mensaje: 'El precio no puede ser negativo.' }],
    })
    const error = await listarProductos().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ErrorApi)
    expect((error as ErrorApi).mensajeDeCampo('precioVenta')).toBe('El precio no puede ser negativo.')
  })

  it('un 500 no muestra detalle interno', async () => {
    responder(500, { mensaje: 'psycopg.errors.UniqueViolation…' })
    await expect(listarCatalogo()).rejects.toMatchObject({
      message: 'Ocurrió un error en el servidor. Intenta de nuevo en un momento.',
    })
  })

  it('un fallo de red se convierte en un mensaje para el usuario', async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const error = (await listarCatalogo().catch((e: unknown) => e)) as ErrorApi
    expect(error.esDeRed).toBe(true)
    expect(error.message).toMatch(/No se pudo conectar con el servidor/)
  })

  it('el tiempo agotado tiene su propio mensaje', async () => {
    fetchSimulado.mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError'))
    await expect(listarCatalogo()).rejects.toMatchObject({ codigo: 'TIEMPO_AGOTADO', estado: 0 })
  })

  it('un 502 del proxy (backend apagado) se trata como falla de conexión', async () => {
    responder(502)
    await expect(listarCatalogo()).rejects.toMatchObject({ estado: 0, codigo: 'SERVIDOR_NO_DISPONIBLE' })
  })
})

describe('almacenamiento del token', () => {
  it('se guarda en sessionStorage, no en localStorage', () => {
    conSesion()
    const enSesion = Object.keys(sessionStorage).find((k) => k.startsWith('tiendinet-sesion'))
    expect(enSesion).toBeDefined()
    expect(sessionStorage.getItem(enSesion!)).toContain('jwt-de-prueba')
    expect(Object.keys(localStorage).some((k) => k.startsWith('tiendinet-sesion'))).toBe(false)
  })
})
