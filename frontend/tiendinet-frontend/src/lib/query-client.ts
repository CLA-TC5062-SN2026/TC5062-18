import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { avisar } from '@/lib/avisos'
import { ErrorApi } from '@/services/api/errores'
import { useSesion } from '@/stores/sesion'

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ErrorApi
    mutationMeta: {
      /** false = la pantalla ya muestra el error (p. ej. en el formulario); no mostrar aviso global. */
      avisoGlobal?: boolean
    }
  }
}

// Segunda mitad del manejo de errores centralizado: el interceptor convierte cada
// fallo en ErrorApi con un mensaje para el usuario, y aquí se decide cuándo mostrarlo
// como aviso global, para que ningún error se quede solo en la consola.

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Un 401 lo avisa la suscripción a la sesión (abajo), una sola vez.
      if (error.estado === 401) return
      // Si la pantalla ya tenía datos, el error de una recarga en segundo plano no se vería: se avisa.
      if (query.state.data !== undefined) avisar(error.message)
      // En la primera carga, la pantalla muestra el error en su lugar (estado `error` de useQuery).
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _contexto, mutation) => {
      if (mutation.meta?.avisoGlobal === false || error.estado === 401) return
      avisar(error.message)
    },
  }),
  defaultOptions: {
    queries: {
      // 'always': sin red, la consulta se intenta y falla con un mensaje claro en vez de
      // quedarse en pausa sin avisar (el modo por defecto de TanStack Query es 'online').
      networkMode: 'always',
      staleTime: 30_000,
      // Reintenta solo fallos de red o del servidor; un 4xx no cambia al reintentar.
      retry: (intentos, error) =>
        intentos < 2 && error instanceof ErrorApi && (error.esDeRed || error.estado >= 500) && error.codigo !== 'CANCELADA',
    },
    mutations: {
      // Igual que en las consultas: un cobro sin red falla de inmediato y no se reanuda
      // solo más tarde, cuando el cajero ya no lo espera.
      networkMode: 'always',
      // Las mutaciones no se reintentan por defecto. Las que llevan Idempotency-Key pueden
      // activar `retry` en su useMutation, porque el reintento no repite la operación.
      retry: false,
    },
  },
})

// Al cerrar sesión (botón Salir o 401 de la API) se borran los datos en caché
// para que el siguiente usuario no vea información del anterior. Si la cerró la API
// (token vencido o cuenta desactivada, RF-03-AC-2), se avisa al usuario por qué.
useSesion.subscribe((actual, anterior) => {
  if (!anterior.token || actual.token) return
  queryClient.clear()
  if (actual.motivoCierre === 'vencida') avisar('Tu sesión terminó. Inicia sesión de nuevo.')
})
