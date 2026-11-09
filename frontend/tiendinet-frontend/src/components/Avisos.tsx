import { useSyncExternalStore } from 'react'
import { CircleAlert, Info, WifiOff, X } from 'lucide-react'
import { useAvisos } from '@/lib/avisos'
import { cn } from '@/lib/utils'

function suscribirConexion(alCambiar: () => void) {
  window.addEventListener('online', alCambiar)
  window.addEventListener('offline', alCambiar)
  return () => {
    window.removeEventListener('online', alCambiar)
    window.removeEventListener('offline', alCambiar)
  }
}

/** Avisos globales y barra de "sin conexión". Se monta una vez por portal, en Proveedores. */
export function Avisos() {
  const avisos = useAvisos((s) => s.avisos)
  const quitar = useAvisos((s) => s.quitar)
  const enLinea = useSyncExternalStore(suscribirConexion, () => navigator.onLine, () => true)

  return (
    <>
      {!enLinea && (
        <div
          role="alert"
          className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-sm font-medium text-white"
        >
          <WifiOff aria-hidden="true" className="size-4" />
          Sin conexión a internet. Revisa la red antes de cobrar o guardar cambios.
        </div>
      )}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            role={a.tipo === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-card p-4 text-sm shadow-lg',
              a.tipo === 'error' && 'border-destructive',
            )}
          >
            {a.tipo === 'error' ? (
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
            ) : (
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            )}
            <p className="flex-1">{a.mensaje}</p>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => quitar(a.id)}
              className="rounded-sm text-muted-foreground hover:text-foreground"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
