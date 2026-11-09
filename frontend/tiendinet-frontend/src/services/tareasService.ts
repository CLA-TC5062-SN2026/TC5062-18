import type { CuerpoDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Tareas del reloj que el Dueño puede ejecutar bajo demanda. Con `fechaReferencia`
// la tarea toma ese instante como "ahora" (útil para verificar criterios con fecha fija).

type Reloj = CuerpoDe<'calcularPuntosReorden'>

/** POST /tareas/calcular-puntos-reorden (RF-08). */
export async function calcularPuntosReorden(cuerpo: Reloj = {}) {
  return datos(await api.POST('/tareas/calcular-puntos-reorden', { body: cuerpo }))
}

/** POST /tareas/avisos-caducidad (RF-07). */
export async function enviarAvisosCaducidad(cuerpo: Reloj = {}) {
  return datos(await api.POST('/tareas/avisos-caducidad', { body: cuerpo }))
}

/** POST /tareas/expirar-pedidos (RF-22-AC-8). */
export async function expirarPedidos(cuerpo: Reloj = {}) {
  return datos(await api.POST('/tareas/expirar-pedidos', { body: cuerpo }))
}

/** POST /tareas/conciliar-pagos (RF-23-AC-3). */
export async function conciliarPagos(cuerpo: Reloj = {}) {
  return datos(await api.POST('/tareas/conciliar-pagos', { body: cuerpo }))
}

/** POST /tareas/marcar-no-recogidos (RF-24-AC-7). */
export async function marcarNoRecogidos(cuerpo: Reloj = {}) {
  return datos(await api.POST('/tareas/marcar-no-recogidos', { body: cuerpo }))
}

/** POST /tareas/resolver-faltantes-vencidos (RF-25-AC-4). */
export async function resolverFaltantesVencidos(cuerpo: Reloj = {}) {
  return datos(await api.POST('/tareas/resolver-faltantes-vencidos', { body: cuerpo }))
}

