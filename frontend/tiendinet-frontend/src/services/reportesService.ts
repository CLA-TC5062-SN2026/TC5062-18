import type { QueryDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Reportes (Dueño; un Empleado recibe 403). RF-29.

/** GET /reportes/diario?fecha= */
export async function reporteDiario(query: QueryDe<'reporteDiario'>) {
  return datos(await api.GET('/reportes/diario', { params: { query } }))
}

/** GET /reportes/rotacion?desde=&hasta= */
export async function reporteRotacion(query: QueryDe<'reporteRotacion'>) {
  return datos(await api.GET('/reportes/rotacion', { params: { query } }))
}

/** GET /reportes/indicadores?desde=&hasta= */
export async function reporteIndicadores(query: QueryDe<'reporteIndicadores'>) {
  return datos(await api.GET('/reportes/indicadores', { params: { query } }))
}
