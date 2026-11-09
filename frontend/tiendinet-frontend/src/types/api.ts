// Tipos del contrato openapi_equipo.yaml 2.0.0.
//
// api.generated.ts se genera con `npm run api:tipos` desde contrato/openapi_equipo.yaml.
// No lo edites a mano: si el contrato cambia, vuelve a generarlo y TypeScript marcará
// cada servicio o pantalla que haya que ajustar.

import type { components, operations, paths } from './api.generated'

export type { components, operations, paths }

/** Esquema del contrato por nombre: Esquema<'Producto'>, Esquema<'Venta'>… */
export type Esquema<N extends keyof components['schemas']> = components['schemas'][N]

/** Parámetros de query de una operación, por su operationId. */
export type QueryDe<O extends keyof operations> = NonNullable<operations[O]['parameters']['query']>

/** Cuerpo JSON de una operación, por su operationId. */
export type CuerpoDe<O extends keyof operations> = operations[O] extends {
  requestBody?: { content: { 'application/json': infer B } }
}
  ? B
  : never

// Alias de uso frecuente
export type Rol = Esquema<'Rol'>
/** Dinero como texto con dos decimales, p. ej. "38.50" (RD-07). */
export type Dinero = Esquema<'Dinero'>
export type Sesion = Esquema<'Sesion'>
export type UsuarioResumen = Esquema<'UsuarioResumen'>
/** Usuario de la sesión actual (lo que devuelven POST /auth/sesiones y GET /auth/yo). */
export type UsuarioActual = UsuarioResumen
export type CredencialesSesion = Esquema<'InicioSesion'>
export type ProductoCatalogo = Esquema<'ProductoCatalogo'>
export type ErrorContrato = Esquema<'Error'>
export type DetalleError = Esquema<'DetalleError'>
