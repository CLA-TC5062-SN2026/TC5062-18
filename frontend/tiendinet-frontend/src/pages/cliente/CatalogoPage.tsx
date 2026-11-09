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
import { useCatalogo } from '@/services/catalogo'

/** Portal Cliente: catálogo público (GET /catalogo, sin sesión, RF-01-AC-6). */
export function CatalogoPage() {
  const { data: productos, isLoading, error, refetch, isFetching } = useCatalogo()

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

            {productos && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Disponibilidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-normal">{p.nombre}</TableCell>
                      <TableCell className="text-right">{formatearDinero(p.precio)}</TableCell>
                      <TableCell className="hidden text-right sm:table-cell">
                        {p.disponible ? 'Disponible' : 'Agotado'}
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
