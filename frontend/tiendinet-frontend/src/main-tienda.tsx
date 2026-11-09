// Punto de entrada del Portal Tienda (tienda/index.html → /tienda/).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { Proveedores } from '@/components/Proveedores'
import { RutaProtegida } from '@/components/RutaProtegida'
import { NoEncontradoPage } from '@/pages/NoEncontradoPage'
import { DashboardPage } from '@/pages/tienda/DashboardPage'
import { LoginPage, RUTA_DASHBOARD } from '@/pages/tienda/LoginPage'
import './index.css'

// Rutas del Portal Tienda (relativas a /tienda):
//   /login       pública
//   /dashboard   protegida (Dueño y Empleado)
//   /            redirige al dashboard; si no hay sesión, la ruta protegida manda al login
const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      element: <RutaProtegida roles={['DUENO', 'EMPLEADO']} />,
      children: [
        { path: '/', element: <Navigate to={RUTA_DASHBOARD} replace /> },
        { path: RUTA_DASHBOARD, element: <DashboardPage /> },
      ],
    },
    { path: '*', element: <NoEncontradoPage /> },
  ],
  { basename: '/tienda' },
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Proveedores>
      <RouterProvider router={router} />
    </Proveedores>
  </StrictMode>,
)
