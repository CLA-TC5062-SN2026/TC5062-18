import type { CuerpoDe, QueryDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Proveedores, sincronización y productos por vincular (Dueño).

/** GET /proveedores */
export async function listarProveedores() {
  return datos(await api.GET('/proveedores'))
}

/** POST /proveedores — solo MANUAL_RUTA u OTRO_RUTA. */
export async function crearProveedor(cuerpo: CuerpoDe<'crearProveedor'>) {
  return datos(await api.POST('/proveedores', { body: cuerpo }))
}

/** GET /proveedores/{proveedorId} */
export async function obtenerProveedor(proveedorId: string) {
  return datos(await api.GET('/proveedores/{proveedorId}', { params: { path: { proveedorId } } }))
}

/** GET /sincronizaciones-proveedores */
export async function listarSincronizaciones(query: QueryDe<'listarSincronizaciones'> = {}) {
  return datos(await api.GET('/sincronizaciones-proveedores', { params: { query } }))
}

/**
 * POST /sincronizaciones-proveedores — puede tardar hasta 60 s (RNF-03); el cliente
 * le da 70 s de tiempo límite. Responde 201 aunque un proveedor falle (RF-10-AC-5).
 */
export async function sincronizarProveedores(cuerpo: CuerpoDe<'sincronizarProveedores'> = {}) {
  return datos(await api.POST('/sincronizaciones-proveedores', { body: cuerpo }))
}

/** GET /sincronizaciones-proveedores/{sincronizacionId} */
export async function obtenerSincronizacion(sincronizacionId: string) {
  return datos(
    await api.GET('/sincronizaciones-proveedores/{sincronizacionId}', { params: { path: { sincronizacionId } } }),
  )
}

/** GET /vinculaciones — productos del proveedor sin ficha (RF-10-AC-4). */
export async function listarVinculaciones(query: QueryDe<'listarVinculaciones'> = {}) {
  return datos(await api.GET('/vinculaciones', { params: { query } }))
}

/** POST /vinculaciones/{vinculacionId}/asociaciones — vincula a una ficha existente. */
export async function asociarVinculacion(vinculacionId: string, cuerpo: CuerpoDe<'asociarVinculacion'>) {
  return datos(
    await api.POST('/vinculaciones/{vinculacionId}/asociaciones', { params: { path: { vinculacionId } }, body: cuerpo }),
  )
}

/** POST /vinculaciones/{vinculacionId}/fichas — crea la ficha desde la vinculación. */
export async function confirmarAltaVinculacion(vinculacionId: string, cuerpo: CuerpoDe<'confirmarAltaVinculacion'>) {
  return datos(
    await api.POST('/vinculaciones/{vinculacionId}/fichas', { params: { path: { vinculacionId } }, body: cuerpo }),
  )
}
