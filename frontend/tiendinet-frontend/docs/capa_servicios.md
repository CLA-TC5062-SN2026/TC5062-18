# Capa de servicios — TiendiNet

| Campo | Valor |
|---|---|
| Carpeta | `frontend/src/services/` |
| Contrato | `contrato/openapi_equipo.yaml` 2.0.0 (109 operaciones) |
| Cliente HTTP | openapi-fetch (sobre `fetch` nativo) con tipos generados por openapi-typescript |
| Cobertura | 108 de 109 operaciones; el webhook de pagos lo llama Mercado Pago, no el navegador |
| Fecha | 8 de noviembre de 2026 |

Toda llamada a la API pasa por esta capa. Los componentes nunca usan `fetch` ni interpretan códigos HTTP: llaman a una función del servicio (por ejemplo `confirmarVenta`) y reciben los datos tipados o un `ErrorApi` con un mensaje listo para mostrar.

## Estructura

```
src/services/
├── api/
│   ├── cliente.ts          # cliente HTTP, interceptores y URL base
│   ├── errores.ts          # ErrorApi y traducción de errores HTTP y de red
│   ├── idempotencia.ts     # claves Idempotency-Key
│   └── cliente.test.ts     # pruebas de interceptores, errores y token
├── authService.ts          # /auth/*
├── clientesService.ts      # /clientes
├── usuariosService.ts      # /usuarios
├── productosService.ts     # /productos (ficha, PR, proveedor preferido)
├── inventarioService.ts    # lotes, movimientos, recepciones, ajustes, caducidades, alertas
├── proveedoresService.ts   # proveedores, sincronizaciones, vinculaciones
├── ofertasService.ts       # ofertas, comparación, sugerencia
├── comprasService.ts       # propuestas de compra
├── ventasService.ts        # POS: búsqueda, ventas, cobro, comprobante, cancelación, diferidas
├── cortesCajaService.ts    # cortes de caja
├── catalogoService.ts      # catálogo público
├── carritoService.ts       # carrito del cliente
├── pedidosService.ts       # /pedidos
├── misPedidosService.ts    # /mis-pedidos
├── pagosService.ts         # inicio del pago en línea
├── reembolsosService.ts    # reembolsos
├── configuracionService.ts # configuración y códigos postales
├── reportesService.ts      # reportes
├── tareasService.ts        # tareas del reloj bajo demanda
├── index.ts                # punto de importación único: import { … } from '@/services'
└── cobertura.test.ts       # cada operationId del contrato tiene su función
```

Hay un módulo por recurso del contrato, y **cada función lleva el nombre del `operationId`** (`iniciarSesion`, `confirmarVenta`, `listarCatalogo`…). Así cualquiera puede ir de la función al endpoint y a sus criterios de aceptación. La prueba `cobertura.test.ts` lee el contrato y falla si alguna operación no tiene función.

| Servicio | Operaciones | Quién las usa |
|---|---|---|
| authService | 4 (+ `cerrarSesion` local) | Todos |
| clientesService | 1 | Visitante |
| usuariosService | 5 | Dueño (activación: público) |
| productosService | 13 | Dueño |
| inventarioService | 11 | Dueño y Empleado |
| proveedoresService | 9 | Dueño |
| ofertasService | 5 | Dueño |
| comprasService | 5 | Dueño |
| ventasService | 11 | Dueño y Empleado |
| cortesCajaService | 4 | Dueño y Empleado |
| catalogoService | 2 | Público |
| carritoService | 5 | Cliente |
| pedidosService | 10 | Tienda; `crearPedido` y `decidirFaltante` son del Cliente |
| misPedidosService | 3 | Cliente |
| pagosService | 1 | Cliente |
| reembolsosService | 3 | Dueño |
| configuracionService | 7 | Dueño; `obtenerConfiguracionPublica` es pública |
| reportesService | 3 | Dueño |
| tareasService | 6 | Dueño |
| **Total** | **108** | |

## 1. Cliente HTTP: openapi-fetch

Se eligió **openapi-fetch** sobre el `fetch` nativo del navegador. Es de los mismos autores de openapi-typescript, la herramienta que ya fijaba la decisión del stack para generar los tipos.

| Opción | Por qué sí o por qué no |
|---|---|
| **openapi-fetch** (elegida) | Usa `fetch` nativo, sin dependencias pesadas. Toma los tipos generados del contrato: la ruta, los parámetros, el cuerpo y la respuesta se revisan al compilar. Si alguien escribe `/producto` en lugar de `/productos`, o manda `precio` en lugar de `precioVenta`, TypeScript lo marca. Trae **middleware** (`onRequest`, `onResponse`, `onError`), que es el equivalente a los interceptores. |
| axios | Tiene interceptores, pero los tipos de cada endpoint habría que escribirlos a mano, duplicando el contrato y sin aviso cuando cambie. Agrega una dependencia que no hace falta, porque `fetch` ya está en todos los navegadores. |
| `fetch` sin librería | Funciona (era lo que tenía el scaffolding), pero había que construir a mano la cadena de interceptores y no tenía tipos por endpoint. |

Los tipos se generan con `npm run api:tipos`, que crea `src/types/api.generated.ts` desde `contrato/openapi_equipo.yaml`. Ese archivo no se edita a mano. `src/types/api.ts` agrega atajos: `Esquema<'Producto'>`, `QueryDe<'listarProductos'>` y `CuerpoDe<'crearProducto'>`.

## 2. Interceptores

Los interceptores están en `src/services/api/cliente.ts` y se registran una sola vez con `cliente.use(...)`. Toda petición pasa por ellos:

```
petición ─► 1. autenticación ─► 2. tiempo límite ─► fetch ─► 3. errores ─► servicio
```

| # | Interceptor | Momento | Qué hace |
|---|---|---|---|
| 1 | `interceptorAutenticacion` | `onRequest` | Agrega `Authorization: Bearer <JWT>`. No lo envía a `/auth/sesiones`, recuperación, restablecimiento ni activación. Si el token ya venció (según `expiraEn`), cierra la sesión y no llama a la API. |
| 2 | `interceptorTiempoLimite` | `onRequest` | Corta la petición a los 20 s con `AbortSignal.timeout`. La sincronización de proveedores tiene 70 s, porque puede tardar hasta 60 s (RNF-03). |
| 3 | `interceptorErrores` | `onResponse` y `onError` | Convierte cualquier 4xx o 5xx, y cualquier fallo de red, en `ErrorApi` y lo lanza. Con un 401 de una petición autenticada, cierra la sesión (token vencido o cuenta desactivada, RF-03-AC-2). |

Con esto, una función de servicio queda en una línea:

```ts
export async function obtenerProducto(productoId: string) {
  return datos(await api.GET('/productos/{productoId}', { params: { path: { productoId } } }))
}
```

### Idempotency-Key

Los siete POST que cobran o mueven existencia (confirmar venta, venta diferida, recepción, ajuste, corte, crear pedido e iniciar pago) reciben `claveIdempotencia` como parámetro **obligatorio**, para que nadie lo olvide. La clave se genera con `nuevaClaveIdempotencia()` cuando el usuario inicia la acción (presiona "Cobrar") y se reutiliza en los reintentos de esa misma acción. Si se pierde la respuesta por internet intermitente, el reintento no cobra dos veces.

## 3. Manejo de errores centralizado

Los errores se procesan en dos lugares, ambos únicos para toda la aplicación.

**a) Traducción, en el interceptor** (`errores.ts`). Todo error se convierte en `ErrorApi`, con:
- `message`: texto para el usuario. Si la API manda `mensaje` en español (como pide el contrato), se usa ese.
- `estado` (HTTP, o 0 si no hubo respuesta), `codigo` (del contrato o de red) y `detalles` (errores por campo de un 422).
- `mensajeDeCampo('precioVenta')`: el error de un campo, para pasarlo a `<Campo error={…} />`.
- `cuerpo`: la respuesta completa, para datos extra como el `faltante` de un pago insuficiente.

| Situación | Mensaje para el usuario |
|---|---|
| Sin internet (`navigator.onLine` falso) | No hay conexión a internet. Revisa la red e intenta de nuevo. |
| Servidor apagado (fetch falla, o el proxy responde 502, 503 o 504) | No se pudo conectar con el servidor de TiendiNet. Intenta de nuevo en un momento. |
| Tiempo agotado | El servidor tardó demasiado en responder. Revisa tu conexión e intenta de nuevo. |
| 401 en el login | El de la API: "Correo o contraseña incorrectos" |
| 401 en cualquier otra ruta | Tu sesión terminó. Inicia sesión de nuevo. (Además se cierra la sesión.) |
| 403 / 404 / 409 / 422 / 429 | El `mensaje` de la API ("Producto agotado", "Solo hay 3 disponibles"…). Si no viene, uno genérico por estado. |
| 5xx | Ocurrió un error en el servidor. Intenta de nuevo en un momento. (Nunca el detalle interno.) |

**b) Presentación, en el `QueryClient`** (`src/lib/query-client.ts`). Decide cuándo mostrar el error como aviso global (`src/components/Avisos.tsx`), para que ninguno se quede solo en la consola:
- **Consultas:** en la primera carga, la pantalla muestra el error en su lugar (estado `error` de `useQuery`). Si falla una recarga en segundo plano y ya había datos, sale un aviso.
- **Mutaciones:** siempre sale un aviso, salvo que la pantalla ya lo muestre (`meta: { avisoGlobal: false }`, como el formulario de login).
- **Sesión cerrada por la API:** un solo aviso, "Tu sesión terminó. Inicia sesión de nuevo.", y regreso al login.
- **Sin conexión:** una barra fija arriba ("Sin conexión a internet…") mientras el navegador esté sin red.
- **Reintentos:** las consultas se reintentan dos veces solo ante fallos de red o 5xx; un 4xx no cambia al reintentar. Las mutaciones no se reintentan por defecto; las que llevan `Idempotency-Key` pueden activar `retry`.
- **`networkMode: 'always'`:** por defecto, TanStack Query pausa las peticiones cuando no hay red y las reanuda solas al volver la conexión. En la prueba sin red, el botón se quedaba en "Entrando…" sin ningún mensaje. Con `'always'`, la operación falla de inmediato con el mensaje de "sin conexión". En un mostrador es preferible que un cobro falle a la vista que se reanude solo minutos después.

## 4. Almacenamiento del token

El token vive en **memoria** (store de Zustand) con copia en **`sessionStorage`**, en `src/stores/sesion.ts`.

| Decisión | Motivo |
|---|---|
| `sessionStorage`, no `localStorage` | La sesión se borra al cerrar la pestaña o el navegador. En la computadora compartida del mostrador, el siguiente turno no hereda la sesión. Además, un token robado deja de servir antes. |
| Una clave por portal (`tiendinet-sesion-tienda`, `tiendinet-sesion-cliente`) | Un token de Cliente nunca se manda desde el Portal Tienda. Además, el login de la tienda rechaza las cuentas con rol Cliente sin guardarlas (RF-01-AC-4). |
| Se guarda `expiraEn` | Viene de `POST /auth/sesiones`. Un token vencido (60 min en tienda, 24 h en cliente, RNF-04) se descarta antes de enviarse, y al recargar no se restaura. |
| Se verifica la cuenta con `GET /auth/yo` | `RutaProtegida` lo consulta al entrar al Portal Tienda (cada 5 min como máximo). Si el Dueño desactivó la cuenta, la API responde 401 y se cierra la sesión (RF-03-AC-2). |
| Al cerrar sesión se vacía la caché | Así el siguiente usuario no ve datos del anterior. |
| Solo se persisten `token`, `expiraEn` y `usuario` | El motivo del cierre y las funciones no se escriben en el almacenamiento. |

**Alternativas consideradas.**
- **Cookie `httpOnly`:** es la opción más segura contra XSS, porque JavaScript no puede leerla. Pero el contrato define `Authorization: Bearer <JWT>` y la API no emite cookies. Adoptarla requiere cambiar el backend y agregar protección CSRF. Queda como mejora posible si el equipo decide cambiar el contrato.
- **Solo en memoria:** también protege contra XSS persistente, pero obliga a iniciar sesión en cada recarga de página, lo que no es viable en el mostrador.

**Riesgo que queda.** Un script inyectado (XSS) podría leer `sessionStorage`. Se mitiga así: React escapa todo el texto por defecto, el proyecto no usa `dangerouslySetInnerHTML` y el token dura poco. Al desplegar conviene agregar una cabecera Content-Security-Policy.

**Cierre de sesión.** El contrato no tiene endpoint para cerrar sesión. `cerrarSesion()` borra el token del navegador y el JWT caduca solo.

## 5. URL base

La URL base se lee de **`VITE_API_URL`**, la misma variable del scaffolding, en `urlBaseApi()` dentro de `cliente.ts`. Acepta:
- una ruta relativa, como `/api` en desarrollo: el proxy de Vite la reenvía a `API_PROXY_TARGET` (`http://localhost:8000`) y no hace falta configurar CORS;
- una URL absoluta, como `https://tiendinet.example.com` en producción.

Si la variable no está definida, se usa `/api`.

## 6. Cambios en el resto del frontend

- **Tipos:** `src/types/api.ts` ya no tiene tipos provisionales; ahora son alias del contrato generado.
- **Login:** `POST /auth/sesiones` devuelve token, expiración y usuario, así que el login ya no llama a `/auth/yo`. Los errores 422 por campo se muestran en cada `<Campo>`.
- **Catálogo:** usa la forma real del contrato (`ListaCatalogo` con `datos`, `precioVenta`, `disponibilidad` y `perecedero`) y muestra la etiqueta "Perecedero".
- **Navbar:** solo pide `nombre` y `rol` del usuario. Los botones Salir e Iniciar sesión ya no pasan el evento del clic al manejador.
- **Se eliminaron** `services/api-client.ts`, `services/auth.ts` y `services/catalogo.ts`. Los reemplazan `api/cliente.ts`, `authService.ts` y `catalogoService.ts`.

## 7. Cómo agregar o cambiar un endpoint

1. Actualiza `contrato/openapi_equipo.yaml` y corre `npm run api:tipos`.
2. `npm run typecheck` marca los servicios y pantallas afectados por el cambio.
3. Agrega la función al servicio del recurso, con el nombre del `operationId`, y expórtala en `index.ts` si es un módulo nuevo.
4. `npm test`: la prueba de cobertura confirma que ninguna operación quedó sin función.

## 8. Verificación

- **Pruebas automáticas (`npm test`, 30 en verde).** Incluyen 16 de la capa de servicios:
  - URL base, relativa y absoluta;
  - JWT agregado en rutas protegidas y omitido en el login;
  - token vencido descartado sin llamar a la API;
  - `Idempotency-Key` y cuerpo en el cobro;
  - 401 que cierra la sesión, y 401 del login con el mensaje de la API;
  - errores por campo de un 422;
  - 500 sin detalle interno;
  - fallo de red, tiempo agotado y 502 del proxy;
  - token en `sessionStorage` y no en `localStorage`;
  - cobertura de las 108 operaciones.
- **En Chrome, contra una API simulada con las respuestas del contrato:**
  - el catálogo muestra los datos;
  - credenciales incorrectas muestran el mensaje de la API;
  - una cuenta de Cliente se rechaza en el Portal Tienda sin guardar sesión;
  - después del login, el token está en `sessionStorage` y `GET /auth/yo` lleva el Bearer;
  - al desactivar la cuenta, la app regresa al login con el aviso "Tu sesión terminó";
  - sin red aparece la barra y el login dice "No hay conexión a internet".
  - No hubo errores de JavaScript.
- **Accesibilidad:** axe-core no reporta violaciones en el catálogo, el login con error, la barra sin conexión ni el aviso global.
- **Calidad:** `npm run typecheck` y `npm run lint` sin errores.
