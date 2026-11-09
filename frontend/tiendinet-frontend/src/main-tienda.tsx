// Punto de entrada del Portal Tienda (tienda/index.html → /tienda/).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Proveedores } from '@/components/Proveedores'
import { RutaProtegida } from '@/components/RutaProtegida'
import { NoEncontradoPage } from '@/pages/NoEncontradoPage'
import { InicioPage } from '@/pages/tienda/InicioPage'
import { LoginPage } from '@/pages/tienda/LoginPage'
import './index.css'

const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      element: <RutaProtegida roles={['DUENO', 'EMPLEADO']} />,
      children: [{ path: '/', element: <InicioPage /> }],
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
