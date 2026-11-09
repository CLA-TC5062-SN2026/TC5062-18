import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Sesion, UsuarioActual } from '@/types/api'

// Sesión del portal (Zustand).
//
// Dónde vive el token: en memoria (este store) con copia en sessionStorage.
// - sessionStorage, no localStorage: la sesión muere al cerrar la pestaña o el navegador.
//   Es lo esperado en la computadora compartida del mostrador, y reduce el tiempo que un
//   token robado sigue sirviendo.
// - Una clave distinta por portal: un token de Cliente no se reutiliza en el Portal Tienda
//   ni al revés.
// - Se guarda `expiraEn` (de POST /auth/sesiones): un token vencido se descarta antes de
//   enviarlo (60 min en tienda, 24 h en cliente, RNF-04).
// La API no admite cookies httpOnly (el contrato pide Authorization: Bearer); ver capa_servicios.md.

const CLAVE_ALMACENAMIENTO =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/tienda')
    ? 'tiendinet-sesion-tienda'
    : 'tiendinet-sesion-cliente'

/** Por qué terminó la sesión: el usuario salió, o la API la dio por vencida (401 / expiración). */
export type MotivoCierre = 'salida' | 'vencida'

interface EstadoSesion {
  token: string | null
  expiraEn: string | null
  usuario: UsuarioActual | null
  motivoCierre: MotivoCierre | null
  iniciar: (sesion: Sesion) => void
  actualizarUsuario: (usuario: UsuarioActual) => void
  cerrar: (motivo?: MotivoCierre) => void
}

export const useSesion = create<EstadoSesion>()(
  persist(
    (set) => ({
      token: null,
      expiraEn: null,
      usuario: null,
      motivoCierre: null,
      iniciar: ({ token, expiraEn, usuario }) => set({ token, expiraEn, usuario, motivoCierre: null }),
      actualizarUsuario: (usuario) => set({ usuario }),
      cerrar: (motivo = 'salida') => set({ token: null, expiraEn: null, usuario: null, motivoCierre: motivo }),
    }),
    {
      name: CLAVE_ALMACENAMIENTO,
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ token, expiraEn, usuario }) => ({ token, expiraEn, usuario }),
      // Al recargar la página, una sesión ya vencida no se restaura.
      onRehydrateStorage: () => (estado) => {
        if (estado?.token && sesionVencida(estado.expiraEn)) estado.cerrar('vencida')
      },
    },
  ),
)

/** true si la fecha de expiración ya pasó (con 30 s de margen por diferencias de reloj). */
export function sesionVencida(expiraEn: string | null, ahora = Date.now()): boolean {
  if (!expiraEn) return false
  return new Date(expiraEn).getTime() - 30_000 <= ahora
}

/** Token listo para enviar, o null si no hay sesión o ya venció. */
export function tokenVigente(): string | null {
  const { token, expiraEn } = useSesion.getState()
  if (!token || sesionVencida(expiraEn)) return null
  return token
}
