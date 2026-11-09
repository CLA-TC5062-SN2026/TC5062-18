import { useNavigate } from 'react-router'
import { Navbar } from '@/components/Navbar'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

/** Portal Tienda: pantalla de inicio después del login. */
export function InicioPage() {
  const usuario = useSesion((s) => s.usuario)
  const cerrar = useSesion((s) => s.cerrar)
  const navigate = useNavigate()

  const modulos = MODULOS.filter((m) => !m.soloDueno || usuario?.rol === 'DUENO')

  return (
    <div className="min-h-svh">
      <Navbar
        portal="Tienda"
        usuario={usuario}
        enlaces={[{ etiqueta: 'Inicio', href: '/', requiereSesion: true }]}
        onIniciarSesion={() => navigate('/login')}
        onCerrarSesion={cerrar}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <h1 className="mb-4 text-xl font-semibold sm:text-2xl">Módulos de la tienda</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map((m) => (
          <Card key={m.titulo}>
            <CardHeader>
              <CardTitle>{m.titulo}</CardTitle>
              <CardDescription>{m.descripcion}</CardDescription>
            </CardHeader>
          </Card>
        ))}
        </div>
      </main>
    </div>
  )
}
