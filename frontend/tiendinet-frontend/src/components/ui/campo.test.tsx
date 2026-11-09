// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Campo } from './campo'

afterEach(cleanup)

describe('Campo', () => {
  it('asocia la etiqueta con el input', () => {
    render(<Campo label="Correo" />)
    expect(screen.getByLabelText('Correo')).toBeInstanceOf(HTMLInputElement)
  })

  it('muestra el error en lugar de la ayuda', () => {
    render(<Campo label="Correo" ayuda="Tu correo de trabajo" error="Formato inválido" />)
    expect(screen.getByText('Formato inválido')).toBeInTheDocument()
    expect(screen.queryByText('Tu correo de trabajo')).not.toBeInTheDocument()
  })

  it('refleja el estado válido', () => {
    const { container } = render(<Campo label="Código" valido />)
    expect(container.firstChild).toHaveAttribute('data-estado', 'valido')
  })

  it('accesibilidad: conecta el error al input y lo marca inválido', () => {
    render(<Campo label="Correo" error="Formato inválido" />)
    const input = screen.getByLabelText('Correo')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Formato inválido')
  })
})
