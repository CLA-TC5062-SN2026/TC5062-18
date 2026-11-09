import { useMutation } from '@tanstack/react-query'
import { useSesion } from '@/stores/sesion'
import type { CredencialesSesion, SesionCreada, UsuarioActual } from '@/types/api'
import { llamarApi } from './api-client'

export function crearSesion(credenciales: CredencialesSesion) {
  return llamarApi<SesionCreada>('/auth/sesiones', { method: 'POST', cuerpo: credenciales })
}

export function obtenerUsuarioActual(token: string) {
  return llamarApi<UsuarioActual>('/auth/yo', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

/** Inicia sesión: POST /auth/sesiones y luego GET /auth/yo para conocer el rol. */
export function useIniciarSesion() {
  const iniciar = useSesion((s) => s.iniciar)

  return useMutation({
    mutationFn: async (credenciales: CredencialesSesion) => {
      const { token } = await crearSesion(credenciales)
      const usuario = await obtenerUsuarioActual(token)
      return { token, usuario }
    },
    onSuccess: ({ token, usuario }) => iniciar(token, usuario),
  })
}
