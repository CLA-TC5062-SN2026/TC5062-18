import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatearDinero, formatearFecha } from '@/lib/formato'
import { authService } from '@/services/authService'
import { useVistaPreviaCorte } from '@/services/cortesCajaService'
import { useAlertasReordenActivas } from '@/services/inventarioService'
import type { ErrorApi } from '@/services/api/errores'
import { useSesion } from '@/stores/sesion'

interface Modulo {
  titulo: string
  descripcion: string
  soloDueno?: boolean
}

// El Empleado no ve costos, ofertas ni punto de reorden (RF-01-AC-3).
const MODULOS: Modulo[] = [
  { titulo: 'Mostrador', descripcion: 'Venta con lector y ticket' },
  { titulo: 'Pedidos', descripcion: 'Pedidos anticipados de clientes' },
  { titulo: 'Corte de caja', descripcion: 'Cierre del turno' },
  { titulo: 'Inventario y reorden', descripcion: 'Existencias y punto de reorden', soloDueno: true },
  { titulo: 'Costos y ofertas', descripcion: 'Precios de proveedores y promociones', soloDueno: true },
]

/** Contenido de una tarjeta de indicador según el estado de su consulta. */
function Indicador({
  cargando,
  error,
  reintentar,
  children,
}: {
  cargando: boolean
  error: ErrorApi | null
  reintentar: () => void
  children: ReactNode
}) {
  if (cargando) return <p className="text-sm text-muted-foreground">Cargando…</p>
  if (error) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-destructive">{error.message}</p>
        <Button size="sm" variant="secondary" onClick={reintentar}>
          Reintentar
        </Button>
      </div>
    )
  }
  return <>{children}</>
}

/** Portal Tienda: dashboard al que se llega después del login (ruta protegida). */
export function DashboardPage() {
  const usuario = useSesion((s) => s.usuario)
  const expiraEn = useSesion((s) => s.expiraEn)
  const navigate = useNavigate()
  const alertas = useAlertasReordenActivas()
  const corte = useVistaPreviaCorte()

  const modulos = MODULOS.filter((m) => !m.soloDueno || usuario?.rol === 'DUENO')
  const nombreCorto = usuario?.nombre.split(' ')[0]

  return (
    <div className="min-h-svh bg-muted/40">
      <Navbar
        portal="Tienda"
        usuario={usuario}
        enlaces={[{ etiqueta: 'Dashboard', href: '/dashboard', requiereSesion: true }]}
        onIniciarSesion={() => navigate('/login')}
        onCerrarSesion={authService.logout}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Hola, {nombreCorto}</h1>
          {expiraEn && (
            <p className="text-sm text-muted-foreground">Tu sesión vence: {formatearFecha(expiraEn)}</p>
          )}
        </div>

        <section aria-labelledby="titulo-indicadores" className="grid gap-4 sm:grid-cols-2">
          <h2 id="titulo-indicadores" className="sr-only">
            Indicadores de hoy
          </h2>

          <Card>
            <CardHeader>
              <CardTitle as="h3">Alertas de reorden</CardTitle>
              <CardDescription>Productos en o bajo su punto de reorden</CardDescription>
            </CardHeader>
            <CardContent>
              <Indicador cargando={alertas.isLoading} error={alertas.error} reintentar={() => alertas.refetch()}>
                <p className="text-3xl font-semibold">{alertas.data?.total ?? 0}</p>
                {alertas.data && alertas.data.datos.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1 text-sm">
                    {alertas.data.datos.map((a) => (
                      <li key={a.id} className="flex justify-between gap-2">
                        <span>{a.nombreProducto}</span>
                        <span className="text-muted-foreground">
                          {a.existenciaDisponible} disp. · PR {a.puntoReorden}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Indicador>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h3">Caja de hoy</CardTitle>
              <CardDescription>Ventas aún no incluidas en un corte</CardDescription>
            </CardHeader>
            <CardContent>
              <Indicador cargando={corte.isLoading} error={corte.error} reintentar={() => corte.refetch()}>
                {corte.data && (
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Efectivo esperado</dt>
                    <dd className="text-right text-lg font-semibold">{formatearDinero(corte.data.efectivoEsperado)}</dd>
                    <dt className="text-muted-foreground">Con tarjeta</dt>
                    <dd className="text-right">{formatearDinero(corte.data.totalTarjeta)}</dd>
                  </dl>
                )}
              </Indicador>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="titulo-modulos">
          <h2 id="titulo-modulos" className="mb-3 text-lg font-semibold">
            Módulos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modulos.map((m) => (
              <Card key={m.titulo}>
                <CardHeader>
                  <CardTitle as="h3">{m.titulo}</CardTitle>
                  <CardDescription>{m.descripcion}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
