import { useMutation } from '@tanstack/react-query'
import { useSesion } from '@/stores/sesion'
import type { CredencialesSesion, CuerpoDe, Rol } from '@/types/api'
import { api, datos } from './api/cliente'
import { ErrorApi } from './api/errores'

// Autenticación: /auth/*

/** POST /auth/sesiones — devuelve token, expiración y usuario (RF-01). */
export async function iniciarSesion(credenciales: CredencialesSesion) {
  return datos(await api.POST('/auth/sesiones', { body: credenciales }))
}

/** GET /auth/yo — usuario de la sesión; 401 si la cuenta se desactivó (RF-03-AC-2). */
export async function obtenerSesionActual() {
  return datos(await api.GET('/auth/yo'))
}

/** POST /auth/recuperacion-contrasena — misma respuesta exista o no el correo (RF-02-AC-3). */
export async function solicitarRecuperacionContrasena(cuerpo: CuerpoDe<'solicitarRecuperacionContrasena'>) {
  return datos(await api.POST('/auth/recuperacion-contrasena', { body: cuerpo }))
}

/** POST /auth/restablecer-contrasena — enlace de un solo uso, 30 minutos. */
export async function restablecerContrasena(cuerpo: CuerpoDe<'restablecerContrasena'>) {
  return datos(await api.POST('/auth/restablecer-contrasena', { body: cuerpo }))
}

/** Cierra la sesión en este navegador. El contrato no tiene endpoint de cierre: el JWT caduca solo. */
export function cerrarSesion() {
  useSesion.getState().cerrar()
}

/**
 * Fachada del servicio de autenticación: `authService.login()`, `authService.logout()`…
 * Son las mismas funciones de arriba (nombradas por operationId) con nombres cortos.
 */
export const authService = {
  /** POST /auth/sesiones. */
  login: iniciarSesion,
  /** Borra la sesión del navegador. */
  logout: cerrarSesion,
  /** GET /auth/yo. */
  usuarioActual: obtenerSesionActual,
  solicitarRecuperacionContrasena,
  restablecerContrasena,
} as const

/**
 * Hook de inicio de sesión para un portal: llama a `authService.login()` y guarda la
 * sesión (token, expiración y usuario) en el store, que la copia en sessionStorage.
 * Si el rol no corresponde al portal
 * (p. ej. un Cliente en el Portal Tienda), no guarda la sesión.
 */
export function useIniciarSesion(rolesPermitidos: Rol[]) {
  const iniciar = useSesion((s) => s.iniciar)

  return useMutation({
    mutationFn: async (credenciales: CredencialesSesion) => {
      const sesion = await authService.login(credenciales)
      if (!rolesPermitidos.includes(sesion.usuario.rol)) {
        throw new ErrorApi({
          estado: 403,
          codigo: 'ROL_NO_PERMITIDO',
          mensaje: 'Esta cuenta no tiene acceso a este portal.',
        })
      }
      return sesion
    },
    onSuccess: iniciar,
    // El formulario muestra el error junto a los campos; no hace falta el aviso global.
    meta: { avisoGlobal: false },
  })
}
