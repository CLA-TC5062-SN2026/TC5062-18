import { QueryClient } from '@tanstack/react-query'
import { ErrorApi } from '@/services/api-client'
import { useSesion } from '@/stores/sesion'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // No reintentar errores del cliente (401, 403, 404): solo fallas de red o del servidor.
      retry: (intentos, error) =>
        !(error instanceof ErrorApi && error.estado > 0 && error.estado < 500) && intentos < 2,
    },
  },
})

// Al cerrar sesión (botón Salir o 401 de la API) se borran los datos en caché
// para que el siguiente usuario no vea información del anterior.
useSesion.subscribe((actual, anterior) => {
  if (anterior.token && !actual.token) queryClient.clear()
})
