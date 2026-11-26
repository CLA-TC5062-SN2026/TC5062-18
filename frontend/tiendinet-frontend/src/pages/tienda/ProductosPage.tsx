import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { avisar } from '@/lib/avisos'
import { formatearDinero } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { authService } from '@/services/authService'
import { useCambiarEstadoProducto, useProductos } from '@/services/productosService'
import { useSesion } from '@/stores/sesion'
import type { Esquema } from '@/types/api'
import { FormularioProducto } from './FormularioProducto'
import { enlacesTienda } from './navegacion'

type Producto = Esquema<'Producto'>
type Filtro = 'ACTIVO' | 'INACTIVO' | 'TODOS'

const TAMANO = 50

/** Fila con sus acciones. Dar de baja pide confirmación en la misma fila. */
function FilaProducto({ producto, onEditar }: { producto: Producto; onEditar: () => void }) {
  const cambiarEstado = useCambiarEstadoProducto()
  const [confirmando, setConfirmando] = useState(false)
  const activo = producto.estado === 'ACTIVO'
  const bajo = activo && producto.existenciaDisponible <= producto.prVigente

  function cambiar(estado: 'ACTIVO' | 'INACTIVO') {
    cambiarEstado.mutate(
      { id: producto.id, estado },
      {
        onSuccess: () => {
          setConfirmando(false)
          avisar(
            estado === 'INACTIVO'
              ? `${producto.nombre} quedó dado de baja. Sus ventas pasadas se conservan.`
              : `${producto.nombre} está activo otra vez.`,
            'info',
          )
        },
      },
    )
  }

  return (
    <TableRow className={cn(!activo && 'text-muted-foreground')}>
      <TableCell>
        <span className="font-medium text-foreground">{producto.nombre}</span>{' '}
        <span className="text-muted-foreground">{producto.presentacion}</span>
        <span className="block font-mono text-xs text-muted-foreground">
          {producto.codigoBarras ?? producto.codigoInterno}
        </span>
      </TableCell>
      <TableCell>{producto.categoria}</TableCell>
      <TableCell className="text-right tabular-nums">{formatearDinero(producto.precioVenta)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatearDinero(producto.costoReferencia)}</TableCell>
      <TableCell className={cn('text-right tabular-nums', bajo && 'font-semibold text-destructive')}>
        {producto.existenciaDisponible}
        {bajo && <span className="sr-only"> (en o bajo su punto de reorden)</span>}
      </TableCell>
      <TableCell className="text-right tabular-nums">{producto.prVigente}</TableCell>
      <TableCell>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            activo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {activo ? 'Activo' : 'De baja'}
        </span>
      </TableCell>
      <TableCell>
        {confirmando ? (
          <div className="flex flex-wrap items-center justify-end gap-2" role="group" aria-label={`Confirmar baja de ${producto.nombre}`}>
            <span className="text-sm">¿Dar de baja?</span>
            <Button
              size="sm"
              variant="destructive"
              loading={cambiarEstado.isPending}
              loadingText="Dando de baja…"
              onClick={() => cambiar('INACTIVO')}
            >
              Sí, dar de baja
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
              No
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onEditar} aria-label={`Editar ${producto.nombre} ${producto.presentacion}`}>
              Editar
            </Button>
            {activo ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmando(true)}
                aria-label={`Dar de baja ${producto.nombre} ${producto.presentacion}`}
              >
                Dar de baja
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                loading={cambiarEstado.isPending}
                loadingText="Activando…"
                onClick={() => cambiar('ACTIVO')}
                aria-label={`Reactivar ${producto.nombre} ${producto.presentacion}`}
              >
                Reactivar
              </Button>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}

/**
 * Portal Tienda: catálogo interno de productos (RF-04), solo para el Dueño.
 * Listar, dar de alta, editar y dar de baja (baja lógica, RNF-14) contra la API real.
 */
export function ProductosPage() {
  const usuario = useSesion((s) => s.usuario)
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('ACTIVO')
  const [pagina, setPagina] = useState(1)
  // null = sin formulario; 'nuevo' = alta; un producto = edición
  const [formulario, setFormulario] = useState<'nuevo' | Producto | null>(null)
  const q = useDeferredValue(busqueda.trim())

  const productos = useProductos({
    pagina,
    tamano: TAMANO,
    ...(q ? { q } : {}),
    ...(filtro !== 'TODOS' ? { estado: filtro } : {}),
  })
  const lista = productos.data?.datos ?? []
  const total = productos.data?.total ?? 0
  const paginas = Math.max(1, Math.ceil(total / TAMANO))

  function alGuardar(p: Producto) {
    avisar(formulario === 'nuevo' ? `${p.nombre} ${p.presentacion} se dio de alta.` : `${p.nombre} se actualizó.`, 'info')
    setFormulario(null)
  }

  let contenido
  if (productos.isLoading) {
    contenido = <p className="py-8 text-center text-sm text-muted-foreground">Cargando productos…</p>
  } else if (productos.error) {
    contenido = (
      <div className="flex flex-col items-center gap-3 py-8">
        <p role="alert" className="text-sm text-destructive">
          {productos.error.message}
        </p>
        <Button variant="secondary" onClick={() => productos.refetch()}>
          Reintentar
        </Button>
      </div>
    )
  } else if (lista.length === 0) {
    contenido = (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {q ? `Ningún producto coincide con «${q}».` : 'Todavía no hay productos. Da de alta el primero.'}
      </p>
    )
  } else {
    contenido = (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Disponible</TableHead>
              <TableHead className="text-right">
                <abbr title="Punto de reorden" className="no-underline">PR</abbr>
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((p) => (
              <FilaProducto key={p.id} producto={p} onEditar={() => setFormulario(p)} />
            ))}
          </TableBody>
        </Table>
        <div className="mt-4 flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {total} {total === 1 ? 'producto' : 'productos'}
          </span>
          {paginas > 1 && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={pagina === 1} onClick={() => setPagina((n) => n - 1)}>
                Anterior
              </Button>
              <span>
                Página {pagina} de {paginas}
              </span>
              <Button size="sm" variant="outline" disabled={pagina >= paginas} onClick={() => setPagina((n) => n + 1)}>
                Siguiente
              </Button>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <Navbar
        portal="Tienda"
        usuario={usuario}
        enlaces={enlacesTienda(usuario?.rol)}
        onIniciarSesion={() => navigate('/login')}
        onCerrarSesion={authService.logout}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">Productos</h1>
            <p className="text-sm text-muted-foreground">Precio, costo, existencia y punto de reorden de cada producto.</p>
          </div>
          {formulario === null && (
            <Button fullWidth="mobile" onClick={() => setFormulario('nuevo')}>
              <Plus aria-hidden="true" /> Nuevo producto
            </Button>
          )}
        </div>

        {formulario !== null && (
          <Card>
            <CardHeader>
              <CardTitle as="h2">
                {formulario === 'nuevo' ? 'Nuevo producto' : `Editar ${formulario.nombre} ${formulario.presentacion}`}
              </CardTitle>
              <CardDescription>Los campos con * son obligatorios.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormularioProducto
                key={formulario === 'nuevo' ? 'nuevo' : formulario.id}
                producto={formulario === 'nuevo' ? undefined : formulario}
                onSuccess={alGuardar}
                onCancelar={() => setFormulario(null)}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex w-full flex-col gap-2 sm:max-w-sm">
              <Label htmlFor="buscar-producto">Buscar</Label>
              <Input
                id="buscar-producto"
                type="search"
                placeholder="Nombre o código de barras"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setPagina(1)
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="filtro-estado">Mostrar</Label>
              <select
                id="filtro-estado"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={filtro}
                onChange={(e) => {
                  setFiltro(e.target.value as Filtro)
                  setPagina(1)
                }}
              >
                <option value="ACTIVO">Activos</option>
                <option value="INACTIVO">Dados de baja</option>
                <option value="TODOS">Todos</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>{contenido}</CardContent>
        </Card>
      </main>
    </div>
  )
}
