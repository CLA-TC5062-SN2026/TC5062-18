import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from 'react-router'
import { authService } from '@/services/authService'
import { sesionVencida, useSesion } from '@/stores/sesion'
import type { Rol } from '@/types/api'

/** Estado que la ruta protegida pasa al login para regresar después a la página pedida. */
export interface EstadoRedireccion {
  desde?: string
}

interface Props {
  /** Roles que pueden entrar. */
  roles: Rol[]
  /** Ruta del login dentro del portal. */
  rutaLogin?: string
}

/**
 * Ruta protegida: si no hay sesión vigente o el rol no corresponde, redirige al login
 * y recuerda la página pedida para volver a ella después de iniciar sesión.
 *
 * Además confirma con GET /auth/yo que la cuenta siga activa: si el Dueño la
 * desactivó, la API responde 401, el interceptor cierra la sesión y esta ruta
 * redirige al login (RF-03-AC-2). La API valida el permiso de todos modos.
 *
 * Uso en el router:
 *   { element: <RutaProtegida roles={['DUENO', 'EMPLEADO']} />, children: [...] }
 */
export function RutaProtegida({ roles, rutaLogin = '/login' }: Props) {
  const usuario = useSesion((s) => s.usuario)
  const expiraEn = useSesion((s) => s.expiraEn)
  const actualizarUsuario = useSesion((s) => s.actualizarUsuario)
  const ubicacion = useLocation()
  const autorizado = Boolean(usuario) && !sesionVencida(expiraEn) && roles.includes(usuario!.rol)

  const { data: usuarioApi } = useQuery({
    queryKey: ['auth', 'yo'],
    queryFn: authService.usuarioActual,
    enabled: autorizado,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (usuarioApi) actualizarUsuario(usuarioApi)
  }, [usuarioApi, actualizarUsuario])

  if (!autorizado) {
    const estado: EstadoRedireccion = { desde: ubicacion.pathname + ubicacion.search }
    return <Navigate to={rutaLogin} replace state={estado} />
  }
  return <Outlet />
}
