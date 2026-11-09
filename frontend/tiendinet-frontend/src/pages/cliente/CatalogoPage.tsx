import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatearDinero } from '@/lib/formato'
import { useCatalogo } from '@/services/catalogoService'

/** Portal Cliente: catálogo público (GET /catalogo, sin sesión, RF-01-AC-6). */
export function CatalogoPage() {
  const { data: catalogo, isLoading, error, refetch, isFetching } = useCatalogo()
  const productos = catalogo?.datos

  return (
    <div className="min-h-svh">
      <Navbar
        portal="Catálogo"
        usuario={null}
        enlaces={[
          { etiqueta: 'Catálogo', href: '/' },
          { etiqueta: 'Componentes', href: '/componentes' },
        ]}
        acciones={
          <Button variant="outline" size="sm" asChild>
            <a href="/tienda/">Soy de la tienda</a>
          </Button>
        }
      />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <Card>
          <CardHeader>
            <CardTitle as="h1" className="text-xl sm:text-2xl">Catálogo de productos</CardTitle>
            <CardDescription>
              Haz tu pedido y recógelo en tienda o recíbelo en casa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-muted-foreground">Cargando catálogo…</p>}

            {error && (
              <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-4 sm:p-6">
                <p className="text-sm">{error.message}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={isFetching}
                  loadingText="Reintentando…"
                  onClick={() => refetch()}
                >
                  Reintentar
                </Button>
              </div>
            )}

            {productos && productos.length === 0 && (
              <p className="text-muted-foreground">No hay productos en el catálogo por ahora.</p>
            )}

            {productos && productos.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="hidden sm:table-cell">Presentación</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Disponibilidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-normal">
                        {p.nombre}
                        {p.perecedero && (
                          <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                            Perecedero
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{p.presentacion}</TableCell>
                      <TableCell className="text-right">{formatearDinero(p.precioVenta)}</TableCell>
                      <TableCell className="hidden text-right sm:table-cell">
                        {p.disponibilidad === 'DISPONIBLE' ? 'Disponible' : 'Agotado'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
