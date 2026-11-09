// @vitest-environment jsdom
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as servicios from '@/services'

// Cada operationId del contrato debe tener una función con el mismo nombre en la capa
// de servicios. Si el contrato agrega un endpoint, esta prueba lo señala.

// El webhook lo llama Mercado Pago, no el navegador.
const FUERA_DEL_FRONTEND = new Set(['recibirWebhookPago'])

const contrato = readFileSync(resolve(process.cwd(), 'contrato/openapi_equipo.yaml'), 'utf8')
const operaciones = [...contrato.matchAll(/operationId:\s*(\w+)/g)].map((m) => m[1])

describe('cobertura del contrato', () => {
  it('lee las operaciones del contrato', () => {
    expect(operaciones.length).toBe(109)
  })

  it('cada operación tiene su función en la capa de servicios', () => {
    const faltantes = operaciones.filter(
      (op) => !FUERA_DEL_FRONTEND.has(op) && typeof (servicios as Record<string, unknown>)[op] !== 'function',
    )
    expect(faltantes).toEqual([])
  })
})
