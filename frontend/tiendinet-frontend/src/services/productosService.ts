import type { CuerpoDe, QueryDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Ficha de productos: /productos (Dueño; un Empleado recibe 403 porque incluye costos, RF-01-AC-3).

const ruta = (productoId: string) => ({ params: { path: { productoId } } })

/** GET /productos — fichas con costo. */
export async function listarProductos(query: QueryDe<'listarProductos'> = {}) {
  return datos(await api.GET('/productos', { params: { query } }))
}

/** POST /productos — 409 por código o nombre+presentación duplicados (RF-04). */
export async function crearProducto(cuerpo: CuerpoDe<'crearProducto'>) {
  return datos(await api.POST('/productos', { body: cuerpo }))
}

/** GET /productos/{productoId} */
export async function obtenerProducto(productoId: string) {
  return datos(await api.GET('/productos/{productoId}', ruta(productoId)))
}

/** PUT /productos/{productoId} — edita ficha, precio y costo. */
export async function reemplazarProducto(productoId: string, cuerpo: CuerpoDe<'reemplazarProducto'>) {
  return datos(await api.PUT('/productos/{productoId}', { ...ruta(productoId), body: cuerpo }))
}

/** PATCH /productos/{productoId}/estado — activar o desactivar (RF-04-AC-5). */
export async function cambiarEstadoProducto(productoId: string, cuerpo: CuerpoDe<'cambiarEstadoProducto'>) {
  return datos(await api.PATCH('/productos/{productoId}/estado', { ...ruta(productoId), body: cuerpo }))
}

/** GET /productos/{productoId}/costo */
export async function obtenerCostoProducto(productoId: string) {
  return datos(await api.GET('/productos/{productoId}/costo', ruta(productoId)))
}

/** GET /productos/{productoId}/punto-reorden — detalle y origen del PR (RF-08). */
export async function obtenerPuntoReorden(productoId: string) {
  return datos(await api.GET('/productos/{productoId}/punto-reorden', ruta(productoId)))
}

/** PATCH /productos/{productoId}/punto-reorden — PR inicial. */
export async function actualizarPuntoReordenInicial(
  productoId: string,
  cuerpo: CuerpoDe<'actualizarPuntoReordenInicial'>,
) {
  return datos(await api.PATCH('/productos/{productoId}/punto-reorden', { ...ruta(productoId), body: cuerpo }))
}

/** PUT /productos/{productoId}/punto-reorden-manual — PR manual con vigencia (RF-08-AC-5). */
export async function fijarPuntoReordenManual(productoId: string, cuerpo: CuerpoDe<'fijarPuntoReordenManual'>) {
  return datos(await api.PUT('/productos/{productoId}/punto-reorden-manual', { ...ruta(productoId), body: cuerpo }))
}

/** DELETE /productos/{productoId}/punto-reorden-manual */
export async function quitarPuntoReordenManual(productoId: string) {
  return datos(await api.DELETE('/productos/{productoId}/punto-reorden-manual', ruta(productoId)))
}

/** PUT /productos/{productoId}/proveedor-preferido (RF-13-AC-4). */
export async function asignarProveedorPreferido(productoId: string, cuerpo: CuerpoDe<'asignarProveedorPreferido'>) {
  return datos(await api.PUT('/productos/{productoId}/proveedor-preferido', { ...ruta(productoId), body: cuerpo }))
}

/** DELETE /productos/{productoId}/proveedor-preferido */
export async function quitarProveedorPreferido(productoId: string) {
  return datos(await api.DELETE('/productos/{productoId}/proveedor-preferido', ruta(productoId)))
}

/** PATCH /productos/{productoId}/dias-entrega-respaldo (RF-08-AC-6). */
export async function actualizarDiasEntregaRespaldo(
  productoId: string,
  cuerpo: CuerpoDe<'actualizarDiasEntregaRespaldo'>,
) {
  return datos(await api.PATCH('/productos/{productoId}/dias-entrega-respaldo', { ...ruta(productoId), body: cuerpo }))
}
