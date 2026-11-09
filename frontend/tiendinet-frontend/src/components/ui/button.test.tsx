// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button } from './button'

afterEach(cleanup)

describe('Button', () => {
  it('usa la variante primaria por defecto y acepta la secundaria', () => {
    render(
      <>
        <Button>Guardar</Button>
        <Button variant="secondary">Cancelar</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveClass('bg-primary')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveClass('bg-secondary')
  })

  it('en carga se desactiva, no dispara onClick y muestra loadingText', async () => {
    const onClick = vi.fn()
    render(
      <Button loading loadingText="Guardando…" onClick={onClick}>
        Guardar
      </Button>,
    )
    const boton = screen.getByRole('button', { name: /Guardando/ })
    expect(boton).toBeDisabled()
    await userEvent.click(boton)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('funciona con asChild y loading al mismo tiempo', () => {
    render(
      <Button asChild loading>
        <a href="/tienda/">Ir a la tienda</a>
      </Button>,
    )
    expect(screen.getByRole('link', { name: /Ir a la tienda/ })).toHaveAttribute('href', '/tienda/')
  })

  it('accesibilidad: en carga marca aria-busy y anuncia el estado', () => {
    render(<Button loading loadingText="Guardando…">Guardar</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Guardando…')
  })
})
