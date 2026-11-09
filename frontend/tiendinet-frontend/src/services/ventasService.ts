import type { CuerpoDe, QueryDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Punto de venta: búsqueda, venta en curso, cobro, comprobante, cancelación y venta diferida.

const ruta = (ventaId: string) => ({ params: { path: { ventaId } } })

/** GET /pos/productos — por `codigoBarras` exacto (lector USB) o `q` por nombre, sin costo (RF-15). */
export async function buscarProductosPos(query: QueryDe<'buscarProductosPos'>) {
  return datos(await api.GET('/pos/productos', { params: { query } }))
}

/** GET /ventas — con `folio` localiza la venta impresa. */
export async function listarVentas(query: QueryDe<'listarVentas'> = {}) {
  return datos(await api.GET('/ventas', { params: { query } }))
}

/** POST /ventas — abre un borrador; no toca existencias. */
export async function crearVenta() {
  return datos(await api.POST('/ventas'))
}

/** GET /ventas/{ventaId} */
export async function obtenerVenta(ventaId: string) {
  return datos(await api.GET('/ventas/{ventaId}', ruta(ventaId)))
}

/** POST /ventas/{ventaId}/renglones — 422 si la cantidad no es entero > 0 (RF-16-AC-7). */
export async function agregarRenglonVenta(ventaId: string, cuerpo: CuerpoDe<'agregarRenglonVenta'>) {
  return datos(await api.POST('/ventas/{ventaId}/renglones', { ...ruta(ventaId), body: cuerpo }))
}

/** PATCH /ventas/{ventaId}/renglones/{renglonId} */
export async function modificarRenglonVenta(
  ventaId: string,
  renglonId: string,
  cuerpo: CuerpoDe<'modificarRenglonVenta'>,
) {
  return datos(
    await api.PATCH('/ventas/{ventaId}/renglones/{renglonId}', {
      params: { path: { ventaId, renglonId } },
      body: cuerpo,
    }),
  )
}

/** DELETE /ventas/{ventaId}/renglones/{renglonId} */
export async function eliminarRenglonVenta(ventaId: string, renglonId: string) {
  return datos(
    await api.DELETE('/ventas/{ventaId}/renglones/{renglonId}', { params: { path: { ventaId, renglonId } } }),
  )
}

/**
 * POST /ventas/{ventaId}/confirmaciones — cobra y descuenta con FEFO (RF-16).
 * 409 "Producto agotado" (ver `error.cuerpo` para producto y disponible);
 * 422 PAGO_INSUFICIENTE con `faltante` en `error.cuerpo`.
 * @param claveIdempotencia una por cobro; reutilízala al reintentar para no cobrar dos veces.
 */
export async function confirmarVenta(ventaId: string, cuerpo: CuerpoDe<'confirmarVenta'>, claveIdempotencia: string) {
  return datos(
    await api.POST('/ventas/{ventaId}/confirmaciones', {
      params: { path: { ventaId }, header: { 'Idempotency-Key': claveIdempotencia } },
      body: cuerpo,
    }),
  )
}

/** GET /ventas/{ventaId}/comprobante — comprobante no fiscal (RF-17). */
export async function obtenerComprobante(ventaId: string) {
  return datos(await api.GET('/ventas/{ventaId}/comprobante', ruta(ventaId)))
}

/** POST /ventas/{ventaId}/cancelaciones — exige motivo; 409 si ya está cancelada o en corte cerrado (RF-18). */
export async function cancelarVenta(ventaId: string, cuerpo: CuerpoDe<'cancelarVenta'>) {
  return datos(await api.POST('/ventas/{ventaId}/cancelaciones', { ...ruta(ventaId), body: cuerpo }))
}

/**
 * POST /ventas-diferidas — venta hecha sin conexión, de los últimos 3 días (RF-19).
 * @param claveIdempotencia una por venta diferida; reutilízala al reintentar.
 */
export async function capturarVentaDiferida(cuerpo: CuerpoDe<'capturarVentaDiferida'>, claveIdempotencia: string) {
  return datos(
    await api.POST('/ventas-diferidas', { params: { header: { 'Idempotency-Key': claveIdempotencia } }, body: cuerpo }),
  )
}
