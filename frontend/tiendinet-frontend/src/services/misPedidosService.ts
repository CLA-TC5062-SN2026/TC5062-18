import type { QueryDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Pedidos del cliente autenticado (rol Cliente): /mis-pedidos. El pedido de otro cliente responde 404.

/** GET /mis-pedidos — del más reciente al más antiguo (RF-26). */
export async function listarMisPedidos(query: QueryDe<'listarMisPedidos'> = {}) {
  return datos(await api.GET('/mis-pedidos', { params: { query } }))
}

/** GET /mis-pedidos/{pedidoId} */
export async function obtenerMiPedido(pedidoId: string) {
  return datos(await api.GET('/mis-pedidos/{pedidoId}', { params: { path: { pedidoId } } }))
}

/** POST /mis-pedidos/{pedidoId}/cancelaciones — solo en "Pagado"; 409 después (RF-26-AC-2, AC-3). */
export async function cancelarMiPedido(pedidoId: string) {
  return datos(await api.POST('/mis-pedidos/{pedidoId}/cancelaciones', { params: { path: { pedidoId } } }))
}
