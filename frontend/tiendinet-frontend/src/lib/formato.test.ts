import { describe, expect, it } from 'vitest'
import { formatearDinero } from './formato'

describe('formatearDinero', () => {
  it('muestra el monto del contrato como pesos mexicanos', () => {
    expect(formatearDinero('38.50')).toBe('$38.50')
  })

  it('agrega separador de miles', () => {
    expect(formatearDinero('1250.00')).toBe('$1,250.00')
  })
})
