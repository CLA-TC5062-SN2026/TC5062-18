import { useState } from 'react'
import { Save } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { UsuarioActual } from '@/types/api'

// Galería de los componentes base. Sirve para revisarlos y para la auditoría de
// accesibilidad. Quitar la ruta /componentes antes de producción.

const USUARIO_DEMO: UsuarioActual = {
  id: 'demo',
  nombre: 'Ana',
  correo: 'ana@tiendinet.local',
  rol: 'DUENO',
  estado: 'ACTIVO',
}

export function ComponentesPage() {
  const [cargando, setCargando] = useState(false)
  const [usuario, setUsuario] = useState<UsuarioActual | null>(null)
  const [cantidad, setCantidad] = useState('')
  const [tocado, setTocado] = useState(false)

  const errorCantidad =
    tocado && (cantidad === '' || Number(cantidad) <= 0)
      ? 'Escribe una cantidad mayor a cero.'
      : undefined

  function simularCarga() {
    setCargando(true)
    setTimeout(() => setCargando(false), 1500)
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <Navbar
        portal="Componentes"
        usuario={usuario}
        enlaces={[
          { etiqueta: 'Catálogo', href: '/' },
          { etiqueta: 'Componentes', href: '/componentes' },
          { etiqueta: 'Mis pedidos', href: '/pedidos', requiereSesion: true },
        ]}
        onIniciarSesion={() => setUsuario(USUARIO_DEMO)}
        onCerrarSesion={() => setUsuario(null)}
      />

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:py-10">
        <h1 className="text-2xl font-semibold">Componentes base</h1>

        <Card>
          <CardHeader>
            <CardTitle>1. Botón</CardTitle>
            <CardDescription>Variantes primario y secundario, y estado de carga.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button fullWidth="mobile">Primario</Button>
            <Button fullWidth="mobile" variant="secondary">
              Secundario
            </Button>
            <Button fullWidth="mobile" variant="outline">
              Contorno
            </Button>
            <Button fullWidth="mobile" loading={cargando} loadingText="Guardando…" onClick={simularCarga}>
              <Save /> Guardar (prueba la carga)
            </Button>
            <Button fullWidth="mobile" variant="secondary" loading>
              Cargando
            </Button>
            <Button fullWidth="mobile" disabled>
              Deshabilitado
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Campo de entrada</CardTitle>
            <CardDescription>Con etiqueta, ayuda y validación visual.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nombre del producto" placeholder="Leche entera 1 L" ayuda="Como aparece en el ticket." />
            <Campo
              label="Cantidad"
              type="number"
              inputMode="numeric"
              required
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              onBlur={() => setTocado(true)}
              error={errorCantidad}
              valido={tocado && !errorCantidad}
            />
            <Campo label="Correo (con error)" defaultValue="ana@" error="El correo no tiene un formato válido." />
            <Campo label="Código de barras (válido)" defaultValue="7501055300075" valido />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>3. Tarjeta</CardTitle>
              <CardDescription>Turno matutino · 8 de noviembre</CardDescription>
              <CardAction>
                <Button size="sm" variant="outline">
                  Ver detalle
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Ventas</dt>
                <dd className="text-right font-medium">42</dd>
                <dt className="text-muted-foreground">Total</dt>
                <dd className="text-right font-medium">$3,415.50</dd>
              </dl>
            </CardContent>
            <CardFooter>
              <Button fullWidth="mobile">Cerrar corte</Button>
              <Button fullWidth="mobile" variant="secondary">
                Imprimir
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Barra de navegación</CardTitle>
              <CardDescription>
                Estado actual: {usuario ? 'autenticado' : 'no autenticado'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Usa el botón de la barra superior para cambiar entre estados. Con sesión aparece el
              enlace “Mis pedidos” y el nombre del usuario. En pantallas chicas, los enlaces pasan
              al menú.
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
