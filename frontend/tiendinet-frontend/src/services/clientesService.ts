import type { CuerpoDe } from '@/types/api'
import { api, datos } from './api/cliente'

// Clientes: /clientes

/** POST /clientes — registro de una cuenta con rol Cliente (RF-02). 409 si el correo ya existe. */
export async function registrarCliente(cuerpo: CuerpoDe<'registrarCliente'>) {
  return datos(await api.POST('/clientes', { body: cuerpo }))
}
