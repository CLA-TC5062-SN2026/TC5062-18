import { api, datos } from './api/cliente'

// Pagos en línea (rol Cliente). El webhook /webhooks/pagos lo llama Mercado Pago,
// no el navegador, así que no tiene función en el frontend.

/**
 * POST /pedidos/{pedidoId}/pago — devuelve la URL de Checkout Pro; el portal redirige ahí (RF-23-AC-7).
 * @param claveIdempotencia una por intento de pago; reutilízala al reintentar.
 */
export async function iniciarPagoPedido(pedidoId: string, claveIdempotencia: string) {
  return datos(
    await api.POST('/pedidos/{pedidoId}/pago', {
      params: { path: { pedidoId }, header: { 'Idempotency-Key': claveIdempotencia } },
    }),
  )
}
