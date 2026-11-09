// Punto de entrada del Portal Cliente (index.html → /).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Proveedores } from '@/components/Proveedores'
import { CatalogoPage } from '@/pages/cliente/CatalogoPage'
import { ComponentesPage } from '@/pages/cliente/ComponentesPage'
import { NoEncontradoPage } from '@/pages/NoEncontradoPage'
import './index.css'

const router = createBrowserRouter([
  { path: '/', element: <CatalogoPage /> },
  { path: '/componentes', element: <ComponentesPage /> },
  { path: '*', element: <NoEncontradoPage /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Proveedores>
      <RouterProvider router={router} />
    </Proveedores>
  </StrictMode>,
)
