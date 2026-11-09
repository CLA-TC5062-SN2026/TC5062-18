import { useQuery } from '@tanstack/react-query'
import type { CuerpoDe, QueryDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Cortes de caja (Dueño y Empleado). Las ventas en línea no entran al corte (RF-20).

/** GET /cortes-caja/vista-previa — efectivo esperado antes de cerrar. */
export async function vistaPreviaCorteCaja(query: QueryDe<'vistaPreviaCorteCaja'> = {}) {
  return datos(await api.GET('/cortes-caja/vista-previa', { params: { query } }))
}

/** GET /cortes-caja */
export async function listarCortesCaja(query: QueryDe<'listarCortesCaja'> = {}) {
  return datos(await api.GET('/cortes-caja', { params: { query } }))
}

/**
 * POST /cortes-caja — cierra el corte; sus ventas ya no se pueden cancelar.
 * @param claveIdempotencia una por corte; reutilízala al reintentar.
 */
export async function crearCorteCaja(cuerpo: CuerpoDe<'crearCorteCaja'>, claveIdempotencia: string) {
  return datos(
    await api.POST('/cortes-caja', { params: { header: { 'Idempotency-Key': claveIdempotencia } }, body: cuerpo }),
  )
}

/** GET /cortes-caja/{corteId} */
export async function obtenerCorteCaja(corteId: string) {
  return datos(await api.GET('/cortes-caja/{corteId}', { params: { path: { corteId } } }))
}

// Hooks de lectura

/** Efectivo esperado del día antes de cerrar el corte (panel del dashboard). */
export function useVistaPreviaCorte() {
  return useQuery({
    queryKey: ['cortes-caja', 'vista-previa'],
    queryFn: () => vistaPreviaCorteCaja(),
  })
}
