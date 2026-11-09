// Capa de servicios de TiendiNet: un módulo por recurso del contrato openapi_equipo.yaml.
// Cada función lleva el nombre del operationId del contrato.
//
//   import { confirmarVenta, nuevaClaveIdempotencia } from '@/services'

export * from './authService'
export * from './clientesService'
export * from './usuariosService'
export * from './productosService'
export * from './inventarioService'
export * from './proveedoresService'
export * from './ofertasService'
export * from './comprasService'
export * from './ventasService'
export * from './cortesCajaService'
export * from './catalogoService'
export * from './carritoService'
export * from './pedidosService'
export * from './misPedidosService'
export * from './pagosService'
export * from './reembolsosService'
export * from './configuracionService'
export * from './reportesService'
export * from './tareasService'

export { api, urlBaseApi } from './api/cliente'
export { ErrorApi } from './api/errores'
export { nuevaClaveIdempotencia } from './api/idempotencia'
