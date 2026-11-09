import type { CuerpoDe, QueryDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Pedidos anticipados: /pedidos
// La mayoría son del Portal Tienda (Dueño y Empleado). Se indica cuando es del Cliente.

const ruta = (pedidoId: string) => ({ params: { path: { pedidoId } } })

/** GET /pedidos — `cola=POR_PREPARAR` o `REEMBOLSOS_POR_DECIDIR`. */
export async function listarPedidos(query: QueryDe<'listarPedidos'> = {}) {
  return datos(await api.GET('/pedidos', { params: { query } }))
}

/**
 * POST /pedidos — [Cliente] crea el pedido desde el carrito y aparta 15 minutos (RF-22).
 * @param claveIdempotencia una por pedido; reutilízala al reintentar.
 */
export async function crearPedido(cuerpo: CuerpoDe<'crearPedido'>, claveIdempotencia: string) {
  return datos(
    await api.POST('/pedidos', { params: { header: { 'Idempotency-Key': claveIdempotencia } }, body: cuerpo }),
  )
}

/** GET /pedidos/{pedidoId} */
export async function obtenerPedido(pedidoId: string) {
  return datos(await api.GET('/pedidos/{pedidoId}', ruta(pedidoId)))
}

/** GET /pedidos/{pedidoId}/historial (RF-24-AC-3). */
export async function obtenerHistorialPedido(pedidoId: string) {
  return datos(await api.GET('/pedidos/{pedidoId}/historial', ruta(pedidoId)))
}

/** POST /pedidos/{pedidoId}/asignacion — asigna empleado y pasa a preparación. */
export async function asignarPedido(pedidoId: string, cuerpo: CuerpoDe<'asignarPedido'>) {
  return datos(await api.POST('/pedidos/{pedidoId}/asignacion', { ...ruta(pedidoId), body: cuerpo }))
}

/** POST /pedidos/{pedidoId}/transiciones — 409 si la transición no es válida (RF-24). */
export async function transicionarPedido(pedidoId: string, cuerpo: CuerpoDe<'transicionarPedido'>) {
  return datos(await api.POST('/pedidos/{pedidoId}/transiciones', { ...ruta(pedidoId), body: cuerpo }))
}

/** POST /pedidos/{pedidoId}/cancelaciones — [Dueño] cancela un pedido pagado o en preparación. */
export async function cancelarPedidoTienda(pedidoId: string, cuerpo: CuerpoDe<'cancelarPedidoTienda'>) {
  return datos(await api.POST('/pedidos/{pedidoId}/cancelaciones', { ...ruta(pedidoId), body: cuerpo }))
}

/** POST /pedidos/{pedidoId}/faltantes — marca un faltante al preparar (RF-25-AC-1). */
export async function reportarFaltante(pedidoId: string, cuerpo: CuerpoDe<'reportarFaltante'>) {
  return datos(await api.POST('/pedidos/{pedidoId}/faltantes', { ...ruta(pedidoId), body: cuerpo }))
}

/** POST /pedidos/{pedidoId}/faltantes/{renglonId}/decision — [Cliente] reembolso o sustituto. */
export async function decidirFaltante(pedidoId: string, renglonId: string, cuerpo: CuerpoDe<'decidirFaltante'>) {
  return datos(
    await api.POST('/pedidos/{pedidoId}/faltantes/{renglonId}/decision', {
      params: { path: { pedidoId, renglonId } },
      body: cuerpo,
    }),
  )
}

/** POST /pedidos/{pedidoId}/resolucion — [Dueño] reembolso de un pedido no recogido (RF-27). */
export async function resolverNoRecogido(pedidoId: string, cuerpo: CuerpoDe<'resolverNoRecogido'>) {
  return datos(await api.POST('/pedidos/{pedidoId}/resolucion', { ...ruta(pedidoId), body: cuerpo }))
}
