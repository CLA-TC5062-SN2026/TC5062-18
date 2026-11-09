// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, Navigate, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RutaProtegida } from '@/components/RutaProtegida'
import { queryClient } from '@/lib/query-client'
import { useSesion } from '@/stores/sesion'
import type { Rol } from '@/types/api'
import { DashboardPage } from './DashboardPage'
import { LoginPage, RUTA_DASHBOARD } from './LoginPage'

// Flujo completo del Portal Tienda con las mismas rutas que main-tienda.tsx
// y una API simulada que responde con la forma del contrato.

const USUARIOS: Record<string, { token: string; nombre: string; rol: Rol }> = {
  'ana@t.mx': { token: 'jwt-dueno', nombre: 'Ana Ramírez', rol: 'DUENO' },
  'luis@t.mx': { token: 'jwt-empleado', nombre: 'Luis Pérez', rol: 'EMPLEADO' },
  'carla@t.mx': { token: 'jwt-cliente', nombre: 'Carla', rol: 'CLIENTE' },
}

const json = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } })

const usuarioDeToken = (auth: string | null) =>
  Object.entries(USUARIOS).find(([, u]) => auth === `Bearer ${u.token}`)

const apiSimulada = vi.fn(async (peticion: Request) => {
  const { pathname } = new URL(peticion.url)
  const ruta = pathname.replace(/^\/api/, '')
  const auth = peticion.headers.get('Authorization')

  if (ruta === '/auth/sesiones') {
    const { correo, contrasena } = await peticion.json()
    const u = USUARIOS[correo]
    if (!u || contrasena !== 'secreta1') {
      return json(401, { mensaje: 'Correo o contraseña incorrectos', codigo: 'CREDENCIALES_INVALIDAS' })
    }
    return json(200, {
      token: u.token,
      tipo: 'Bearer',
      expiraEn: new Date(Date.now() + 60 * 60_000).toISOString(),
      usuario: { id: correo, nombre: u.nombre, correo, rol: u.rol, estado: 'ACTIVO' },
    })
  }

  const sesion = usuarioDeToken(auth)
  if (!sesion) return json(401, { mensaje: 'No autorizado', codigo: 'NO_AUTORIZADO' })
  const [correo, u] = sesion

  if (ruta === '/auth/yo') return json(200, { id: correo, nombre: u.nombre, correo, rol: u.rol, estado: 'ACTIVO' })
  if (ruta === '/alertas') {
    return json(200, {
      datos: [{ id: 'a1', tipo: 'REORDEN', estado: 'ACTIVA', fecha: '2026-11-08T15:00:00Z', nombreProducto: 'Aceite vegetal 1 L', existenciaDisponible: 3, puntoReorden: 10 }],
      pagina: 1,
      tamano: 5,
      total: 1,
    })
  }
  if (ruta === '/cortes-caja/vista-previa') {
    return json(200, { fecha: '2026-11-08', efectivoEsperado: '1250.50', totalTarjeta: '300.00', ventasEnLineaExcluidas: true })
  }
  return json(404, { mensaje: 'No encontrado' })
})

function renderPortalTienda(rutaInicial: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RutaProtegida roles={['DUENO', 'EMPLEADO']} />,
        children: [
          { path: '/', element: <Navigate to={RUTA_DASHBOARD} replace /> },
          { path: RUTA_DASHBOARD, element: <DashboardPage /> },
        ],
      },
    ],
    { initialEntries: [rutaInicial] },
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

async function iniciarSesion(correo: string, contrasena = 'secreta1') {
  await userEvent.type(screen.getByLabelText(/Correo/), correo)
  await userEvent.type(screen.getByLabelText(/Contraseña/), contrasena)
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

const peticionesA = (ruta: string) =>
  apiSimulada.mock.calls.map(([p]) => p).filter((p) => new URL(p.url).pathname.endsWith(ruta))

beforeEach(() => {
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

describe('ruta protegida', () => {
  it('sin sesión, redirige al login', () => {
    const router = renderPortalTienda('/dashboard')
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.getByRole('heading', { name: 'TiendiNet' })).toBeInTheDocument()
  })

  it('con la sesión vencida, redirige al login', () => {
    useSesion.getState().iniciar({
      token: 'jwt-dueno',
      tipo: 'Bearer',
      expiraEn: new Date(Date.now() - 1000).toISOString(),
      usuario: { id: '1', nombre: 'Ana', correo: 'ana@t.mx', rol: 'DUENO', estado: 'ACTIVO' },
    })
    const router = renderPortalTienda('/dashboard')
    expect(router.state.location.pathname).toBe('/login')
  })
})

describe('flujo de login', () => {
  it('inicia sesión, guarda el token y entra al dashboard protegido con datos de la API', async () => {
    const router = renderPortalTienda('/dashboard')
    await iniciarSesion('ana@t.mx')

    // Redirección al dashboard
    expect(await screen.findByRole('heading', { name: 'Hola, Ana' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard')

    // Token almacenado en sessionStorage
    expect(useSesion.getState().token).toBe('jwt-dueno')
    expect(sessionStorage.getItem('tiendinet-sesion-cliente') ?? sessionStorage.getItem('tiendinet-sesion-tienda')).toContain('jwt-dueno')

    // La ruta protegida consume la API con el JWT
    expect(await screen.findByText('Aceite vegetal 1 L')).toBeInTheDocument()
    expect(await screen.findByText('$1,250.50')).toBeInTheDocument()
    expect(peticionesA('/alertas')[0].headers.get('Authorization')).toBe('Bearer jwt-dueno')
    expect(peticionesA('/auth/yo')[0].headers.get('Authorization')).toBe('Bearer jwt-dueno')

    // El Dueño ve los módulos de costos
    expect(screen.getByRole('heading', { name: 'Costos y ofertas' })).toBeInTheDocument()
  })

  it('después del login regresa a la página que se pidió', async () => {
    const router = renderPortalTienda('/dashboard?vista=caja')
    await iniciarSesion('luis@t.mx')
    await screen.findByRole('heading', { name: 'Hola, Luis' })
    expect(router.state.location.pathname + router.state.location.search).toBe('/dashboard?vista=caja')
  })

  it('el Empleado no ve los módulos de costos ni de reorden (RF-01-AC-3)', async () => {
    renderPortalTienda('/login')
    await iniciarSesion('luis@t.mx')
    await screen.findByRole('heading', { name: 'Hola, Luis' })
    expect(screen.queryByRole('heading', { name: 'Costos y ofertas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Inventario y reorden' })).not.toBeInTheDocument()
  })

  it('con credenciales incorrectas muestra el mensaje y no guarda sesión', async () => {
    const router = renderPortalTienda('/login')
    await iniciarSesion('ana@t.mx', 'equivocada')
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos')
    expect(router.state.location.pathname).toBe('/login')
    expect(useSesion.getState().token).toBeNull()
  })

  it('una cuenta de Cliente no entra al Portal Tienda', async () => {
    renderPortalTienda('/login')
    await iniciarSesion('carla@t.mx')
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta cuenta no tiene acceso a este portal.')
    expect(useSesion.getState().token).toBeNull()
  })

  it('valida el formulario antes de llamar a la API', async () => {
    renderPortalTienda('/login')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByText('Escribe tu correo.')).toBeInTheDocument()
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Correo/)).toHaveFocus()
    expect(apiSimulada).not.toHaveBeenCalled()
  })

  it('al salir, la ruta protegida vuelve a pedir el login', async () => {
    const router = renderPortalTienda('/login')
    await iniciarSesion('ana@t.mx')
    await screen.findByRole('heading', { name: 'Hola, Ana' })
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(useSesion.getState().token).toBeNull()
  })
})
