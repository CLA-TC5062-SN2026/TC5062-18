// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import axe from 'axe-core'
import { createMemoryRouter, Navigate, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RutaProtegida } from '@/components/RutaProtegida'
import { queryClient } from '@/lib/query-client'
import { useSesion } from '@/stores/sesion'
import type { Esquema, Rol } from '@/types/api'
import { DashboardPage } from './DashboardPage'
import { LoginPage } from './LoginPage'
import { RUTA_PRODUCTOS } from './navegacion'
import { ProductosPage } from './ProductosPage'

// CRUD de productos (RF-04) con las mismas rutas que main-tienda.tsx y una API
// simulada en memoria que responde con la forma y los errores del contrato.

type Producto = Esquema<'Producto'>

function ficha(parcial: Partial<Producto> & Pick<Producto, 'id' | 'nombre' | 'presentacion'>): Producto {
  return {
    codigoInterno: `INT-${parcial.id}`,
    codigoBarras: null,
    categoria: 'Abarrotes',
    precioVenta: '10.00',
    costoReferencia: '7.00',
    prInicial: 5,
    prVigente: 5,
    origenPR: 'INICIAL',
    perecedero: false,
    restringido: false,
    estado: 'ACTIVO',
    marcaDescuadre: false,
    existenciaFisica: 20,
    apartado: 0,
    existenciaDisponible: 20,
    ...parcial,
  }
}

let productos: Producto[] = []
/** Cuerpos que recibió la API simulada, por método. */
let cuerpos: Record<string, unknown[]> = {}

const json = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } })

const apiSimulada = vi.fn(async (peticion: Request) => {
  const url = new URL(peticion.url)
  const ruta = url.pathname.replace(/^\/api/, '')
  const metodo = peticion.method
  const cuerpo = ['POST', 'PUT', 'PATCH'].includes(metodo) ? await peticion.json() : undefined
  if (cuerpo) (cuerpos[metodo] ??= []).push(cuerpo)

  if (ruta === '/auth/yo') return json(200, { id: '1', nombre: 'Rosa', correo: 'rosa@t.mx', rol: 'DUENO', estado: 'ACTIVO' })

  if (ruta === '/productos' && metodo === 'GET') {
    const estado = url.searchParams.get('estado')
    const q = url.searchParams.get('q')?.toLowerCase()
    const datos = productos.filter(
      (p) => (!estado || p.estado === estado) && (!q || p.nombre.toLowerCase().includes(q) || p.codigoBarras === q),
    )
    return json(200, { datos, pagina: 1, tamano: 50, total: datos.length })
  }

  if (ruta === '/productos' && metodo === 'POST') {
    if (cuerpo.codigoBarras && productos.some((p) => p.codigoBarras === cuerpo.codigoBarras)) {
      return json(409, { codigo: 'CODIGO_DUPLICADO', mensaje: 'Código duplicado' })
    }
    const nuevo = ficha({ ...cuerpo, id: `p${productos.length + 1}`, prVigente: cuerpo.prInicial, existenciaDisponible: 0 })
    productos.push(nuevo)
    return json(201, nuevo)
  }

  const id = ruta.match(/^\/productos\/([^/]+)/)?.[1]
  const producto = productos.find((p) => p.id === id)
  if (producto && metodo === 'PUT' && ruta === `/productos/${id}`) {
    Object.assign(producto, cuerpo)
    return json(200, producto)
  }
  if (producto && metodo === 'PATCH' && ruta === `/productos/${id}/estado`) {
    producto.estado = (cuerpo as { estado: Producto['estado'] }).estado
    return json(200, producto)
  }
  if (ruta === '/alertas') return json(200, { datos: [], pagina: 1, tamano: 5, total: 0 })
  if (ruta === '/cortes-caja/vista-previa') {
    return json(200, { fecha: '2026-11-25', efectivoEsperado: '0.00', totalTarjeta: '0.00', ventasEnLineaExcluidas: true })
  }
  return json(404, { mensaje: 'No encontrado' })
})

function conSesion(rol: Rol) {
  useSesion.getState().iniciar({
    token: `jwt-${rol}`,
    tipo: 'Bearer',
    expiraEn: new Date(Date.now() + 60 * 60_000).toISOString(),
    usuario: { id: '1', nombre: rol === 'DUENO' ? 'Rosa' : 'Luis', correo: 'x@t.mx', rol, estado: 'ACTIVO' },
  })
}

function renderPortalTienda(rutaInicial: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RutaProtegida roles={['DUENO', 'EMPLEADO']} />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
        ],
      },
      { element: <RutaProtegida roles={['DUENO']} />, children: [{ path: RUTA_PRODUCTOS, element: <ProductosPage /> }] },
    ],
    { initialEntries: [rutaInicial] },
  )
  const vista = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, ...vista }
}

const peticiones = (metodo: string) => apiSimulada.mock.calls.map(([p]) => p).filter((p) => p.method === metodo)

beforeEach(() => {
  productos = [
    ficha({ id: 'p1', nombre: 'Aceite vegetal', presentacion: '1 L', codigoBarras: '7501000001019', precioVenta: '38.50', prVigente: 10, existenciaDisponible: 27 }),
    ficha({ id: 'p2', nombre: 'Frijol negro', presentacion: '1 kg', precioVenta: '42.00', prVigente: 8, existenciaDisponible: 8 }),
  ]
  cuerpos = {}
  vi.stubGlobal('fetch', apiSimulada)
  useSesion.getState().cerrar()
  queryClient.clear()
  sessionStorage.clear()
  apiSimulada.mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('pantalla de productos', () => {
  it('sin sesión redirige al login', () => {
    const { router } = renderPortalTienda(RUTA_PRODUCTOS)
    expect(router.state.location.pathname).toBe('/login')
  })

  it('el Empleado no entra: regresa al dashboard sin ciclarse con el login (RF-01-AC-3)', async () => {
    conSesion('EMPLEADO')
    const { router } = renderPortalTienda(RUTA_PRODUCTOS)
    expect(await screen.findByRole('heading', { name: 'Hola, Luis' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard')
    expect(screen.queryByRole('link', { name: 'Productos' })).not.toBeInTheDocument()
  })

  it('el Dueño llega desde el dashboard y ve los productos de la API', async () => {
    conSesion('DUENO')
    const { router } = renderPortalTienda('/dashboard')
    await userEvent.click(await screen.findByRole('link', { name: /Inventario y reorden/ }))
    expect(router.state.location.pathname).toBe(RUTA_PRODUCTOS)

    const fila = (await screen.findByText('Aceite vegetal')).closest('tr')!
    expect(within(fila).getByText('$38.50')).toBeInTheDocument()
    expect(within(fila).getByText('7501000001019')).toBeInTheDocument()
    expect(screen.getByText('2 productos')).toBeInTheDocument()
    expect(peticiones('GET').find((p) => p.url.includes('/productos'))!.headers.get('Authorization')).toBe('Bearer jwt-DUENO')
  })

  it('muestra el estado vacío cuando la búsqueda no encuentra nada', async () => {
    conSesion('DUENO')
    renderPortalTienda(RUTA_PRODUCTOS)
    await screen.findByText('Aceite vegetal')
    await userEvent.type(screen.getByLabelText('Buscar'), 'cerveza')
    expect(await screen.findByText('Ningún producto coincide con «cerveza».')).toBeInTheDocument()
  })

  it('valida el formulario antes de llamar a la API', async () => {
    conSesion('DUENO')
    renderPortalTienda(RUTA_PRODUCTOS)
    await userEvent.click(await screen.findByRole('button', { name: /Nuevo producto/ }))
    await userEvent.type(screen.getByLabelText(/Precio de venta/), '38,50')
    await userEvent.click(screen.getByRole('button', { name: 'Crear producto' }))

    expect(screen.getByText('Escribe el nombre del producto.')).toBeInTheDocument()
    expect(screen.getByText('Usa un monto como 38.50, sin signo de pesos.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre/)).toHaveFocus()
    expect(peticiones('POST')).toHaveLength(0)
  })

  it('da de alta un producto y aparece en la lista (RF-04-AC-1)', async () => {
    conSesion('DUENO')
    renderPortalTienda(RUTA_PRODUCTOS)
    await userEvent.click(await screen.findByRole('button', { name: /Nuevo producto/ }))
    await userEvent.type(screen.getByLabelText(/Nombre/), 'Avena en hojuelas')
    await userEvent.type(screen.getByLabelText(/Presentación/), '400 g')
    await userEvent.type(screen.getByLabelText(/Categoría/), 'Abarrotes')
    await userEvent.type(screen.getByLabelText(/Precio de venta/), '27')
    await userEvent.type(screen.getByLabelText(/Costo de referencia/), '20.5')
    await userEvent.type(screen.getByLabelText(/Punto de reorden inicial/), '4')
    await userEvent.click(screen.getByRole('button', { name: 'Crear producto' }))

    expect(await screen.findByText('Avena en hojuelas')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Nuevo producto' })).not.toBeInTheDocument()
    expect(cuerpos.POST[0]).toMatchObject({ nombre: 'Avena en hojuelas', precioVenta: '27.00', costoReferencia: '20.50', prInicial: 4, codigoBarras: null })
  })

  it('muestra el 409 de la API cuando el código de barras ya existe (RF-04-AC-2)', async () => {
    conSesion('DUENO')
    renderPortalTienda(RUTA_PRODUCTOS)
    await userEvent.click(await screen.findByRole('button', { name: /Nuevo producto/ }))
    await userEvent.type(screen.getByLabelText(/Nombre/), 'Aceite de oliva')
    await userEvent.type(screen.getByLabelText(/Presentación/), '500 ml')
    await userEvent.type(screen.getByLabelText(/Categoría/), 'Abarrotes')
    await userEvent.type(screen.getByLabelText(/Precio de venta/), '120')
    await userEvent.type(screen.getByLabelText(/Costo de referencia/), '90')
    await userEvent.type(screen.getByLabelText(/Punto de reorden inicial/), '2')
    await userEvent.type(screen.getByLabelText(/Código de barras/), '7501000001019')
    await userEvent.click(screen.getByRole('button', { name: 'Crear producto' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Código duplicado')
    expect(screen.getByLabelText(/Código de barras/)).toHaveAccessibleDescription('Ya está registrado en otro producto.')
    expect(screen.getByRole('form', { name: 'Nuevo producto' })).toBeInTheDocument()
    expect(productos).toHaveLength(2)
  })

  it('edita el precio de un producto', async () => {
    conSesion('DUENO')
    renderPortalTienda(RUTA_PRODUCTOS)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Frijol negro 1 kg' }))
    const precio = screen.getByLabelText(/Precio de venta/)
    expect(precio).toHaveValue('42.00')
    await userEvent.clear(precio)
    await userEvent.type(precio, '44.50')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const fila = (await screen.findByText('$44.50')).closest('tr')!
    expect(within(fila).getByText('Frijol negro')).toBeInTheDocument()
    expect(cuerpos.PUT[0]).not.toHaveProperty('prInicial')
  })

  it('da de baja con confirmación y el producto sale de los activos (RF-04-AC-5)', async () => {
    conSesion('DUENO')
    renderPortalTienda(RUTA_PRODUCTOS)
    await userEvent.click(await screen.findByRole('button', { name: 'Dar de baja Frijol negro 1 kg' }))
    expect(peticiones('PATCH')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Sí, dar de baja' }))
    await waitFor(() => expect(screen.queryByText('Frijol negro')).not.toBeInTheDocument())
    expect(productos.find((p) => p.id === 'p2')!.estado).toBe('INACTIVO')

    await userEvent.selectOptions(screen.getByLabelText('Mostrar'), 'INACTIVO')
    expect(await screen.findByRole('button', { name: 'Reactivar Frijol negro 1 kg' })).toBeInTheDocument()
  })

  it('accesibilidad: sin violaciones de axe-core con el formulario abierto', async () => {
    conSesion('DUENO')
    const { container } = renderPortalTienda(RUTA_PRODUCTOS)
    await screen.findByText('Aceite vegetal')
    await userEvent.click(screen.getByRole('button', { name: /Nuevo producto/ }))
    // jsdom no calcula colores ni dibuja en canvas: el contraste se revisó en el navegador (docs/accesibilidad.md).
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const resultado = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })
})
