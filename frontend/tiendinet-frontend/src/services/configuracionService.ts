import type { CuerpoDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Configuración de la tienda y códigos postales (Dueño), y reglas públicas de entrega.

/** GET /configuracion */
export async function obtenerConfiguracion() {
  return datos(await api.GET('/configuracion'))
}

/** PATCH /configuracion — solo los campos que cambian (RF-28). */
export async function actualizarConfiguracion(cuerpo: CuerpoDe<'actualizarConfiguracion'>) {
  return datos(await api.PATCH('/configuracion', { body: cuerpo }))
}

/** GET /configuracion/codigos-postales */
export async function listarCodigosPostales() {
  return datos(await api.GET('/configuracion/codigos-postales'))
}

/** POST /configuracion/codigos-postales — 409 si ya existe. */
export async function agregarCodigoPostal(cuerpo: CuerpoDe<'agregarCodigoPostal'>) {
  return datos(await api.POST('/configuracion/codigos-postales', { body: cuerpo }))
}

/** GET /configuracion/codigos-postales/{codigo} */
export async function obtenerCodigoPostal(codigo: string) {
  return datos(await api.GET('/configuracion/codigos-postales/{codigo}', { params: { path: { codigo } } }))
}

/** PATCH /configuracion/codigos-postales/{codigo} — activar o desactivar. */
export async function cambiarEstadoCodigoPostal(codigo: string, cuerpo: CuerpoDe<'cambiarEstadoCodigoPostal'>) {
  return datos(
    await api.PATCH('/configuracion/codigos-postales/{codigo}', { params: { path: { codigo } }, body: cuerpo }),
  )
}

/** GET /configuracion/publica — pedido mínimo, envío, horario y códigos postales activos (público). */
export async function obtenerConfiguracionPublica() {
  return datos(await api.GET('/configuracion/publica'))
}
