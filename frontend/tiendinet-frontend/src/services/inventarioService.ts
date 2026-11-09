import { useQuery } from '@tanstack/react-query'
import type { CuerpoDe, QueryDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Inventario: lotes, movimientos, recepciones, ajustes, caducidades y alertas (Dueño y Empleado, sin costos).

/** GET /productos/{productoId}/lotes (RF-07-AC-1). */
export async function listarLotesProducto(productoId: string) {
  return datos(await api.GET('/productos/{productoId}/lotes', { params: { path: { productoId } } }))
}

/** GET /productos/{productoId}/movimientos */
export async function listarMovimientosProducto(productoId: string, query: QueryDe<'listarMovimientosProducto'> = {}) {
  return datos(await api.GET('/productos/{productoId}/movimientos', { params: { path: { productoId }, query } }))
}

/** GET /inventario/productos — productos con existencias, sin costo. */
export async function listarProductosInventario(query: QueryDe<'listarProductosInventario'> = {}) {
  return datos(await api.GET('/inventario/productos', { params: { query } }))
}

/** GET /recepciones */
export async function listarRecepciones(query: QueryDe<'listarRecepciones'> = {}) {
  return datos(await api.GET('/recepciones', { params: { query } }))
}

/**
 * POST /recepciones — crea el lote y suma existencia (RF-05).
 * @param claveIdempotencia una por recepción lógica; reutilízala al reintentar.
 */
export async function registrarRecepcion(cuerpo: CuerpoDe<'registrarRecepcion'>, claveIdempotencia: string) {
  return datos(
    await api.POST('/recepciones', { params: { header: { 'Idempotency-Key': claveIdempotencia } }, body: cuerpo }),
  )
}

/** GET /recepciones/{recepcionId} */
export async function obtenerRecepcion(recepcionId: string) {
  return datos(await api.GET('/recepciones/{recepcionId}', { params: { path: { recepcionId } } }))
}

/** GET /ajustes-inventario */
export async function listarAjustesInventario(query: QueryDe<'listarAjustesInventario'> = {}) {
  return datos(await api.GET('/ajustes-inventario', { params: { query } }))
}

/**
 * POST /ajustes-inventario — merma o conteo físico (RF-06).
 * @param claveIdempotencia una por ajuste lógico; reutilízala al reintentar.
 */
export async function registrarAjusteInventario(cuerpo: CuerpoDe<'registrarAjusteInventario'>, claveIdempotencia: string) {
  return datos(
    await api.POST('/ajustes-inventario', {
      params: { header: { 'Idempotency-Key': claveIdempotencia } },
      body: cuerpo,
    }),
  )
}

/** GET /caducidades — por caducar y caducados (RF-07). */
export async function consultarCaducidades(query: QueryDe<'consultarCaducidades'> = {}) {
  return datos(await api.GET('/caducidades', { params: { query } }))
}

/** GET /alertas — reorden y caducidad (RF-09). */
export async function listarAlertas(query: QueryDe<'listarAlertas'> = {}) {
  return datos(await api.GET('/alertas', { params: { query } }))
}

/** GET /alertas/{alertaId} */
export async function obtenerAlerta(alertaId: string) {
  return datos(await api.GET('/alertas/{alertaId}', { params: { path: { alertaId } } }))
}

// Hooks de lectura

/** Alertas de reorden activas (panel del dashboard). */
export function useAlertasReordenActivas(tamano = 5) {
  return useQuery({
    queryKey: ['alertas', { tipo: 'REORDEN', estado: 'ACTIVA', tamano }],
    queryFn: () => listarAlertas({ tipo: 'REORDEN', estado: 'ACTIVA', tamano }),
  })
}
