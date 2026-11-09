// Tipos PROVISIONALES del contrato openapi_equipo.yaml 2.0.0.
//
// Cuando el contrato esté en el repositorio, genera los tipos reales con:
//   npm run api:tipos
// (crea src/types/api.generated.ts) y reemplaza estas definiciones por alias
// de los esquemas generados. Ajusta los nombres de campos a lo que diga el contrato.

export type Rol = 'DUENO' | 'EMPLEADO' | 'CLIENTE'

/** Dinero como texto con dos decimales, p. ej. "38.50" (RD-07). */
export type Dinero = string

export interface CredencialesSesion {
  correo: string
  contrasena: string
}

/** Respuesta de POST /auth/sesiones. */
export interface SesionCreada {
  token: string
}

/** Respuesta de GET /auth/yo. */
export interface UsuarioActual {
  id: string
  nombre: string
  rol: Rol
}

/** Elemento de GET /catalogo (público). */
export interface ProductoCatalogo {
  id: string
  nombre: string
  precio: Dinero
  disponible: boolean
}
