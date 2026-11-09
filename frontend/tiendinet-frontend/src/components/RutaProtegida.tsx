import { Navigate, Outlet } from 'react-router'
import { useSesion } from '@/stores/sesion'
import type { Rol } from '@/types/api'

interface Props {
  roles: Rol[]
}

/**
 * Deja pasar solo a usuarios con sesión y con uno de los roles indicados.
 * Es una comodidad de interfaz: la API valida el permiso de todos modos.
 */
export function RutaProtegida({ roles }: Props) {
  const usuario = useSesion((s) => s.usuario)

  if (!usuario || !roles.includes(usuario.rol)) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
