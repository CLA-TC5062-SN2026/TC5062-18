import type { QueryDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Reembolsos (Dueño): /reembolsos

/** GET /reembolsos — los fallidos traen `puedeReintentar` (RF-27-AC-2). */
export async function listarReembolsos(query: QueryDe<'listarReembolsos'> = {}) {
  return datos(await api.GET('/reembolsos', { params: { query } }))
}

/** GET /reembolsos/{reembolsoId} */
export async function obtenerReembolso(reembolsoId: string) {
  return datos(await api.GET('/reembolsos/{reembolsoId}', { params: { path: { reembolsoId } } }))
}

/** POST /reembolsos/{reembolsoId}/reintentos — solo un reembolso "Fallido". */
export async function reintentarReembolso(reembolsoId: string) {
  return datos(await api.POST('/reembolsos/{reembolsoId}/reintentos', { params: { path: { reembolsoId } } }))
}
