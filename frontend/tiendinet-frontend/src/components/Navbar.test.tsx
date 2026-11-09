// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Navbar, type NavbarProps } from './Navbar'

afterEach(cleanup)

const enlaces: NavbarProps['enlaces'] = [
  { etiqueta: 'Catálogo', href: '/' },
  { etiqueta: 'Mis pedidos', href: '/pedidos', requiereSesion: true },
]

function renderNavbar(props: Partial<NavbarProps>) {
  return render(
    <MemoryRouter>
      <Navbar portal="Prueba" usuario={null} enlaces={enlaces} {...props} />
    </MemoryRouter>,
  )
}

describe('Navbar', () => {
  it('sin sesión oculta los enlaces privados y ofrece iniciar sesión', () => {
    renderNavbar({ onIniciarSesion: vi.fn() })
    expect(screen.queryByText('Mis pedidos')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('con sesión muestra enlaces privados, el usuario y Salir', () => {
    renderNavbar({ usuario: { id: '1', nombre: 'Ana', rol: 'DUENO' }, onCerrarSesion: vi.fn() })
    expect(screen.getByText('Mis pedidos')).toBeInTheDocument()
    expect(screen.getByText('Ana · Dueño')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument()
  })

  it('no muestra Iniciar sesión si no hay manejador', () => {
    renderNavbar({})
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
  })

  it('accesibilidad: el botón del menú móvil tiene nombre, aria-expanded y cierra con Escape', async () => {
    renderNavbar({})
    const boton = screen.getByRole('button', { name: 'Abrir menú' })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(boton)
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveFocus()
  })
})
