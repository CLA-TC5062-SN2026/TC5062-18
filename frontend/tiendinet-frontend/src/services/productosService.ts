import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

// Hooks de la pantalla de productos (Dueño)

/** Lista de fichas con búsqueda y filtro por estado (RF-04-AC-1). */
export function useProductos(query: QueryDe<'listarProductos'> = {}) {
  return useQuery({
    queryKey: ['productos', query],
    queryFn: () => listarProductos(query),
    placeholderData: keepPreviousData,
  })
}

/** Crea (sin id) o reemplaza (con id) una ficha. El formulario muestra sus errores. */
export function useGuardarProducto() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (entrada: { id?: string; cuerpo: CuerpoDe<'crearProducto'> }) => {
      if (!entrada.id) return crearProducto(entrada.cuerpo)
      // PUT no recibe el PR inicial ni los días de respaldo: se cambian en su propio endpoint.
      const { prInicial: _pr, diasEntregaRespaldo: _dias, ...reemplazo } = entrada.cuerpo
      return reemplazarProducto(entrada.id, reemplazo)
    },
    meta: { avisoGlobal: false },
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['productos'] }),
  })
}

/** Activa o desactiva una ficha. La baja es lógica: las ventas pasadas se conservan (RNF-14). */
export function useCambiarEstadoProducto() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'ACTIVO' | 'INACTIVO' }) =>
      cambiarEstadoProducto(id, { estado }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['productos'] }),
  })
}
