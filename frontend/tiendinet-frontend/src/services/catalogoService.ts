import { useQuery } from '@tanstack/react-query'
import type { QueryDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Catálogo en línea (público, sin sesión; RF-21, RF-01-AC-6).

/** GET /catalogo — sin restringidos, inactivos, costo ni existencia exacta. */
export async function listarCatalogo(query: QueryDe<'listarCatalogo'> = {}) {
  return datos(await api.GET('/catalogo', { params: { query } }))
}

/** GET /catalogo/{productoId} — 404 si es restringido o inactivo. */
export async function obtenerProductoCatalogo(productoId: string) {
  return datos(await api.GET('/catalogo/{productoId}', { params: { path: { productoId } } }))
}

// Hooks de lectura. Patrón: una llave de consulta por recurso y parámetros.
export function useCatalogo(query: QueryDe<'listarCatalogo'> = {}) {
  return useQuery({
    queryKey: ['catalogo', query],
    queryFn: () => listarCatalogo(query),
  })
}
