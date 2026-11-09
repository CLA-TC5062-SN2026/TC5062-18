import type { CuerpoDe, QueryDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Propuestas de orden de compra (Dueño). Ninguna operación mueve inventario (RF-14).

/** GET /propuestas-compra */
export async function listarPropuestasCompra(query: QueryDe<'listarPropuestasCompra'> = {}) {
  return datos(await api.GET('/propuestas-compra', { params: { query } }))
}

/** POST /propuestas-compra — 422 "No hay productos por reabastecer" si ninguno está en o bajo su PR. */
export async function generarPropuestaCompra() {
  return datos(await api.POST('/propuestas-compra'))
}

/** GET /propuestas-compra/{propuestaId} */
export async function obtenerPropuestaCompra(propuestaId: string) {
  return datos(await api.GET('/propuestas-compra/{propuestaId}', { params: { path: { propuestaId } } }))
}

/** PATCH /propuestas-compra/{propuestaId}/renglones/{renglonId} */
export async function actualizarRenglonPropuesta(
  propuestaId: string,
  renglonId: string,
  cuerpo: CuerpoDe<'actualizarRenglonPropuesta'>,
) {
  return datos(
    await api.PATCH('/propuestas-compra/{propuestaId}/renglones/{renglonId}', {
      params: { path: { propuestaId, renglonId } },
      body: cuerpo,
    }),
  )
}

/** DELETE /propuestas-compra/{propuestaId}/renglones/{renglonId} */
export async function eliminarRenglonPropuesta(propuestaId: string, renglonId: string) {
  return datos(
    await api.DELETE('/propuestas-compra/{propuestaId}/renglones/{renglonId}', {
      params: { path: { propuestaId, renglonId } },
    }),
  )
}
