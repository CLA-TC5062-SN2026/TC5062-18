import { create } from 'zustand'

// Avisos globales (toasts). Los usa el manejo de errores centralizado para que un
// fallo de red o una sesión vencida siempre llegue al usuario, aunque la pantalla
// no muestre el error por su cuenta.

export interface Aviso {
  id: number
  tipo: 'error' | 'info'
  mensaje: string
}

interface EstadoAvisos {
  avisos: Aviso[]
  avisar: (mensaje: string, tipo?: Aviso['tipo']) => void
  quitar: (id: number) => void
}

let siguienteId = 1
const DURACION_MS = 7000

export const useAvisos = create<EstadoAvisos>()((set, get) => ({
  avisos: [],
  avisar: (mensaje, tipo = 'error') => {
    // No repetir el mismo aviso si ya está en pantalla (p. ej. varias consultas fallando a la vez).
    if (get().avisos.some((a) => a.mensaje === mensaje)) return
    const id = siguienteId++
    set((s) => ({ avisos: [...s.avisos, { id, tipo, mensaje }] }))
    setTimeout(() => get().quitar(id), DURACION_MS)
  },
  quitar: (id) => set((s) => ({ avisos: s.avisos.filter((a) => a.id !== id) })),
}))

export const avisar = (mensaje: string, tipo?: Aviso['tipo']) => useAvisos.getState().avisar(mensaje, tipo)
