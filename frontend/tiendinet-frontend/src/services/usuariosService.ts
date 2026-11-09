import type { CuerpoDe, QueryDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Usuarios de la tienda (Dueño y Empleado): /usuarios

/** POST /usuarios/activacion — define la contraseña con el enlace de activación (RF-03-AC-1). */
export async function activarUsuario(cuerpo: CuerpoDe<'activarUsuario'>) {
  return datos(await api.POST('/usuarios/activacion', { body: cuerpo }))
}

/** GET /usuarios — Dueño. */
export async function listarUsuarios(query: QueryDe<'listarUsuarios'> = {}) {
  return datos(await api.GET('/usuarios', { params: { query } }))
}

/** POST /usuarios — Dueño crea un Dueño o Empleado; queda inactivo hasta activarse. */
export async function crearUsuario(cuerpo: CuerpoDe<'crearUsuario'>) {
  return datos(await api.POST('/usuarios', { body: cuerpo }))
}

/** GET /usuarios/{usuarioId} — Dueño. */
export async function obtenerUsuario(usuarioId: string) {
  return datos(await api.GET('/usuarios/{usuarioId}', { params: { path: { usuarioId } } }))
}

/** PATCH /usuarios/{usuarioId} — desactivar o reactivar (RF-03-AC-2, AC-3). */
export async function actualizarEstadoUsuario(usuarioId: string, cuerpo: CuerpoDe<'actualizarEstadoUsuario'>) {
  return datos(await api.PATCH('/usuarios/{usuarioId}', { params: { path: { usuarioId } }, body: cuerpo }))
}
