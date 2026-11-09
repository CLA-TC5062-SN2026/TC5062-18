import type { CuerpoDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Carrito del cliente autenticado (rol Cliente): /carrito

/** GET /carrito */
export async function obtenerCarrito() {
  return datos(await api.GET('/carrito'))
}

/** DELETE /carrito — deja el carrito sin renglones. */
export async function vaciarCarrito() {
  return datos(await api.DELETE('/carrito'))
}

/** POST /carrito/renglones — 422 "Solo hay N disponibles", "Agotado" o "Producto no disponible en línea". */
export async function agregarRenglonCarrito(cuerpo: CuerpoDe<'agregarRenglonCarrito'>) {
  return datos(await api.POST('/carrito/renglones', { body: cuerpo }))
}

/** PATCH /carrito/renglones/{renglonId} */
export async function modificarRenglonCarrito(renglonId: string, cuerpo: CuerpoDe<'modificarRenglonCarrito'>) {
  return datos(await api.PATCH('/carrito/renglones/{renglonId}', { params: { path: { renglonId } }, body: cuerpo }))
}

/** DELETE /carrito/renglones/{renglonId} */
export async function eliminarRenglonCarrito(renglonId: string) {
  return datos(await api.DELETE('/carrito/renglones/{renglonId}', { params: { path: { renglonId } } }))
}
