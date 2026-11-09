import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UsuarioActual } from '@/types/api'

// Estado de sesión (Zustand). La duración (60 min tienda, 24 h cliente, RNF-04)
// la impone el JWT que emite la API: cuando expira, la API responde 401 y
// api-client cierra la sesión. Los datos de negocio NO van aquí: viven en la API
// y se leen con TanStack Query.

interface EstadoSesion {
  token: string | null
  usuario: UsuarioActual | null
  iniciar: (token: string, usuario: UsuarioActual) => void
  cerrar: () => void
}

export const useSesion = create<EstadoSesion>()(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      iniciar: (token, usuario) => set({ token, usuario }),
      cerrar: () => set({ token: null, usuario: null }),
    }),
    { name: 'tiendinet-sesion' },
  ),
)
