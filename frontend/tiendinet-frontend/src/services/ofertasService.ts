import type { CuerpoDe, QueryDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Ofertas de proveedor, comparación y sugerencia (Dueño; incluyen costos).

/** GET /productos/{productoId}/ofertas */
export async function listarOfertasProducto(productoId: string) {
  return datos(await api.GET('/productos/{productoId}/ofertas', { params: { path: { productoId } } }))
}

/** GET /productos/{productoId}/comparacion — ordenadas por costo por unidad base (RF-12). */
export async function compararOfertas(productoId: string) {
  return datos(await api.GET('/productos/{productoId}/comparacion', { params: { path: { productoId } } }))
}

/** GET /productos/{productoId}/sugerencia — con `urgencia` prioriza días de entrega (RF-13). */
export async function sugerirProveedor(productoId: string, query: QueryDe<'sugerirProveedor'> = {}) {
  return datos(await api.GET('/productos/{productoId}/sugerencia', { params: { path: { productoId }, query } }))
}

/** POST /ofertas — oferta manual de un proveedor sin base (RF-11). */
export async function crearOfertaManual(cuerpo: CuerpoDe<'crearOfertaManual'>) {
  return datos(await api.POST('/ofertas', { body: cuerpo }))
}

/** GET /ofertas/{ofertaId} */
export async function obtenerOferta(ofertaId: string) {
  return datos(await api.GET('/ofertas/{ofertaId}', { params: { path: { ofertaId } } }))
}
