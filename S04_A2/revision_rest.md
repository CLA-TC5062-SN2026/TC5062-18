# Revisión REST de la especificación OpenAPI

| Campo | Valor |
|---|---|
| **Borrador del agente** | Versión v0 generada por el agente (50 rutas, 59 operaciones) |
| **Contrato final** | `openapi.yaml` (57 rutas, 74 operaciones) |
| **Fecha** | 2026-10-11 |
| **Insumos** | SRS v2.0, `diagrama_clases.puml` y `diagrama_componentes.puml` de S04-A1 |

## Método

1. El agente generó el borrador v0 a partir de los RF, el diagrama de clases y el de componentes.
2. Se le pidió evaluar el borrador contra cuatro principios REST: verbos HTTP, naming de recursos (sustantivos, plural, minúsculas), idempotencia y códigos de estado. Se agregaron seguridad y completitud del contrato porque este YAML es la fuente para generar el código de S05-S06.
3. Se revisó con herramientas automáticas y contra el SRS:

| Herramienta | Qué verifica | v0 | Final |
|---|---|---|---|
| `openapi-spec-validator` (mismo esquema JSON de OAS 3.0 que usa Swagger Editor) | Sintaxis y estructura OpenAPI 3.0 | Válido | Válido |
| Redocly CLI (`recommended`) | Buenas prácticas de contrato | 102 avisos | 2 avisos intencionales* |
| Spectral (`spectral:oas`) | Buenas prácticas de contrato | 119 avisos | 0 |
| Script de cobertura (`x-acceptance-criteria` vs. SRS) | Criterios sin endpoint | 3 de 131 | 1 de 131 (frontend, documentado) |

\* `servers[0]` apunta a `localhost` (entorno Docker Compose) y `GET /categorias` no tiene respuesta 4xx porque es una lista pública sin parámetros.

4. Se eligieron las correcciones a aplicar (las 12) y se regeneró el contrato.

---

## Observaciones y acciones correctivas

### H1. Verbos en las rutas (principio: recursos como sustantivos)

**Observación del agente.** 14 rutas del v0 nombran acciones en vez de recursos: `/usuarios/{id}/desactivar`, `/usuarios/{id}/activar`, `/productos/{id}/desactivar`, `/ventas/{folio}/cancelar`, `/pedidos/{folio}/cancelar`, `/pedidos/{folio}/cambiar-estado`, `/pedidos/{folio}/pagar`, `/proveedores/sincronizar`, `/productosPorVincular/{id}/vincular`, `/pedidos/{folio}/faltantes/{id}/responder`, `/reembolsos/{id}/reintentar`, `/procesos/{nombre}/ejecutar`, `/auth/recuperar-contrasena` y `/auth/cambiar-contrasena`. En REST la acción la expresa el método HTTP; un verbo en la URI convierte la API en RPC y duplica rutas para lo mismo (activar y desactivar).

**Acción correctiva.** Cada acción se modeló como un cambio de estado (PATCH) o como la creación de un sub-recurso con nombre de sustantivo:

| v0 | Final | Razón |
|---|---|---|
| `POST /usuarios/{id}/activar` y `/desactivar` | `PATCH /usuarios/{usuarioId}` `{activo}` | Dos rutas para un solo atributo |
| `POST /productos/{id}/desactivar` | `PATCH /productos/{productoId}` `{activo: false}` | Igual |
| `POST /ventas/{folio}/cancelar` | `POST /ventas/{folio}/cancelacion` | Se crea **la** cancelación (sub-recurso único con motivo, usuario y fecha) |
| `POST /pedidos/{folio}/cambiar-estado` y `/cancelar` | `POST /pedidos/{folio}/transiciones` (+ `GET` para el historial) | Cada cambio crea un `CambioEstadoPedido` del diagrama de clases (D7) |
| `POST /pedidos/{folio}/pagar` | `POST /pedidos/{folio}/pagos` | Un pedido tiene 0..* pagos (D2) |
| `POST /proveedores/sincronizar` | `POST /sincronizaciones` + `GET /sincronizaciones/{id}` | La sincronización es un recurso con resumen consultable |
| `POST /productosPorVincular/{id}/vincular` | `POST /productos-por-vincular/{id}/vinculacion` | Sub-recurso único |
| `POST …/faltantes/{id}/responder` | `PUT /pedidos/{folio}/renglones/{renglonId}/faltante/respuesta` | El faltante pertenece al renglón (D6) |
| `POST /reembolsos/{id}/reintentar` | `POST /reembolsos/{reembolsoId}/reintentos` | Cada reintento es una nueva solicitud |
| `POST /procesos/{nombre}/ejecutar` | `POST /procesos/{proceso}/ejecuciones` + `GET …/{ejecucionId}` | Ejecución consultable |
| `POST /auth/recuperar-contrasena`, `/auth/cambiar-contrasena` | `POST /solicitudes-recuperacion`, `POST /restablecimientos-contrasena` | Recursos con nombre; el token viaja en el cuerpo, no en la URL |
| `POST /auth/login` | `POST /sesiones` | Se crea una sesión |

### H2. Mayúsculas, camelCase y singular en las rutas (principio: naming)

**Observación del agente.** El v0 mezcla convenciones: `/Configuracion`, `/productos/{id}/Lotes`, `/ajusteInventario`, `/propuestaCompra`, `/productosPorVincular`, `/reportes/ventasDiarias`. Las URI distinguen mayúsculas; mezclar estilos provoca 404 difíciles de detectar y rutas inconsistentes en el código generado.

**Acción correctiva.** Todas las rutas en minúsculas, kebab-case y plural para colecciones: `/configuracion` (singleton), `/productos/{productoId}/lotes`, `/ajustes-inventario`, `/propuestas-compra`, `/productos-por-vincular`, `/reportes/ventas-diarias`. Los parámetros de ruta pasaron de `{id}` genérico a nombres explícitos (`{productoId}`, `{usuarioId}`) para que no choquen en rutas anidadas.

### H3. Lectura con POST (principio: verbos seguros)

**Observación del agente.** `POST /productos/buscar` es una consulta: debe ser **segura** (sin efectos) e **idempotente**, y con POST no se puede cachear ni compartir como URL. Además, el v0 responde 404 cuando no hay coincidencias, cuando una búsqueda vacía es un resultado válido.

**Acción correctiva.** `GET /productos?q=frij` o `GET /productos?codigoBarras=7501055300075`, con 200 y `datos: []` si no hay coincidencias; el portal muestra "Producto no encontrado" (RF-15-AC-3). El caso que sí exige 404 (un pedido ajeno) quedó en `GET /pedidos/{folio}`.

### H4. PUT para cambios parciales (principio: semántica de PUT vs. PATCH)

**Observación del agente.** `PUT /productos/{id}`, `PUT /Configuracion` y `PUT /productos/{id}/punto-reorden` reciben solo algunos campos. PUT significa **reemplazo completo**: un cliente que envíe solo `precioVenta` borraría los demás campos si el servidor lo implementa al pie de la letra.

**Acción correctiva.** Las actualizaciones parciales usan `PATCH` con `application/merge-patch+json` y esquemas `*Actualizar` con `minProperties: 1`: `PATCH /productos/{productoId}`, `PATCH /productos/{productoId}/punto-reorden`, `PATCH /configuracion`, `PATCH /usuarios/{usuarioId}`, `PATCH /ofertas/{ofertaId}`, `PATCH /pedidos/{folio}`. PUT queda solo para reemplazos completos e idempotentes: la lista de renglones de una propuesta (`PUT /propuestas-compra/{id}/renglones`), la cantidad de un producto en el carrito y el faltante de un renglón.

### H5. Códigos de estado incorrectos o ausentes (principio: códigos de estado)

**Observación del agente.**
- Todas las creaciones del v0 (clientes, usuarios, productos, recepciones, ventas, pedidos, ofertas, cortes…) responden **200** en vez de **201** con `Location`.
- Usa **400** para validaciones donde el SRS especifica **422** (RF-04-AC-4, RF-05-AC-2, RF-08-AC-2, RF-19-AC-3, RF-22-AC-3/4/9, RF-28-AC-2).
- No declara **409** (código duplicado RF-04-AC-2, producto agotado RF-16-AC-5/6, cancelación doble RF-18-AC-2, corte cerrado RF-18-AC-3, transiciones RF-24, último Dueño RF-03-AC-3), ni **429** (RF-01-AC-5), ni **500**.
- `GET /pedidos/{folio}` de otro cliente responde **403**, pero RF-26-AC-4 exige **404** (no revelar que el pedido existe).
- `DELETE /carrito/{productoId}` responde 200 con cuerpo en vez de 204.
- 401 y 403 se declaran en pocas operaciones.

**Acción correctiva.** Política uniforme documentada en `info.description`: **400** JSON mal formado, **401** sin sesión o cuenta inactiva, **403** rol sin permiso, **404** no existe o no es tuyo, **409** choca con el estado actual, **410** enlace expirado, **422** regla de negocio, **429** límite de intentos, **500** error interno; **201 + Location** al crear, **202** para operaciones asíncronas (sincronización, procesos, reintento de reembolso, solicitud de recuperación) y **204** sin contenido. El generador agrega 401, 403 y 500 a toda operación protegida.

### H6. Idempotencia (principio: idempotencia)

**Observación del agente.** `POST /ventas`, `POST /pedidos` y `POST /pedidos/{folio}/pagar` no son idempotentes y el SRS dice que el internet de la tienda es intermitente (§2.4). Si la respuesta de una venta se pierde y el POS reintenta, se registran **dos ventas** y se descuenta el inventario dos veces, justo lo que RNF-06 prohíbe. Además, el webhook de Mercado Pago puede llegar duplicado (RF-23-AC-5) y el v0 no dice cómo se trata.

**Acción correctiva.**
- Encabezado obligatorio `Idempotency-Key` (UUID del portal) en `POST /ventas`, `POST /pedidos`, `POST /pedidos/{folio}/pagos`, `POST /recepciones`, `POST /ajustes-inventario` y `POST /cortes`. Misma clave y mismo cuerpo devuelven la respuesta original; misma clave con otro cuerpo responde 422.
- El webhook registra el id de cada notificación: un duplicado responde 200 sin cambios ni segundo correo.
- Las operaciones únicas por diseño (`/cancelacion`, `/resolucion`, `/vinculacion`) responden 409 al repetirse, así que no pueden aplicarse dos veces (RF-18-AC-2, RF-27-AC-4).
- Las asignaciones absolutas usan métodos idempotentes: `PUT /carrito/renglones/{productoId}` **fija** la cantidad en vez de sumarla, y `PUT …/faltante` puede repetirse sin efecto adicional.

### H7. Esquemas de seguridad mal aplicados

**Observación del agente.** El v0 declara `bearerAuth` global y lo hereda el webhook: Mercado Pago no puede enviar un JWT, así que todas las notificaciones fallarían. El catálogo también lo hereda, cuando RF-01-AC-6 y S-08 piden que sea **público**.

**Acción correctiva.** `security: []` en el catálogo, categorías, registro, inicio de sesión y recuperación. Nuevo esquema `firmaMercadoPago` (`x-signature`, HMAC) solo para el webhook, con 401 si la firma no corresponde (RF-23-AC-5). Cada operación declara `x-roles` con los roles de la matriz SRS §3.4.

### H8. Exposición de datos sensibles

**Observación del agente.** El esquema `Producto` del v0 incluye `costoReferencia` y se devuelve en la búsqueda del POS, así que un Empleado vería costos (incumple RD-06 y RF-01-AC-3). `Pedido` incluye siempre nombre, teléfono y dirección del cliente (incumple RNF-10).

**Acción correctiva.** `Producto` ya no contiene costos; el costo vive en `GET /productos/{productoId}/costo` y las ofertas en `GET /productos/{productoId}/ofertas`, ambos solo para el Dueño (403 al Empleado). `Lote` tampoco expone su costo. En `Pedido`, los datos personales se movieron a `contacto`, que solo se llena para la tienda en los estados permitidos por RNF-10. `ProductoCatalogo` es una proyección pública sin existencia exacta ni proveedor (RF-21-AC-1).

### H9. Colecciones sin paginación ni filtros

**Observación del agente.** `GET /ventas`, `/pedidos`, `/alertas`, `/reembolsos` y `/productos` devuelven arreglos completos. Con 200 ventas al día (SRS §2.5), en un año son unas 73,000 ventas en una sola respuesta, lo que rompe RNF-01 y RNF-02 en el celular.

**Acción correctiva.** Parámetros `page` y `pageSize` (máx. 100) y respuesta `{datos, paginacion}` en 12 colecciones. Filtros por los campos que piden los criterios: `estado`, `desde`/`hasta`, `metodoPago`, `diferida` y `sinCorte` en ventas; `estado`, `modalidad`, `fechaProgramada` y `empleadoAsignadoId` en pedidos (la lista "Por preparar" de RF-22-AC-7 es un filtro, no un endpoint aparte); `bajoPuntoReorden` en productos; `estadoCaducidad` en lotes (sustituye a `/caducidades`).

### H10. Esquemas incompletos

**Observación del agente.** Ningún esquema del v0 declara `required`; los estados son `string` libres; no hay `operationId` (58 avisos de Redocly); el error es un `{error: string}` sin estructura; faltan formatos y rangos. Un generador de código produciría modelos con todo opcional y no validaría nada de lo que pide el SRS (teléfono de 10 dígitos, contraseña con letra y número, días de seguridad 0 a 14, cantidades enteras positivas).

**Acción correctiva.**
- `required`, `minimum`, `pattern`, `format` y `minProperties` en todos los esquemas; `readOnly` en los campos derivados (`disponible`, `apartado`).
- Las 13 enumeraciones del diagrama de clases (`EstadoPedido`, `MetodoPago`, `TipoProveedor`…) como esquemas reutilizables.
- `operationId` en camelCase en las 74 operaciones, para nombrar las funciones generadas.
- Errores con Problem Details (RFC 7807, `application/problem+json`): `codigo` estable para el frontend y las pruebas, `detail` con el mensaje del SRS, `errores` por campo y `productosAgotados` para RF-16-AC-5.

### H11. Sin versionado

**Observación del agente.** El servidor del v0 es `/api`. Cualquier cambio incompatible rompería ambos portales sin forma de convivir con la versión anterior.

**Acción correctiva.** Versión en la ruta base: `/api/v1`, más un segundo servidor para el piloto por túnel HTTPS. `info.version` sigue SemVer (1.0.0).

### H12. Criterios sin endpoint

**Observación del agente.** El script de cobertura encontró tres criterios del SRS sin operación en el v0: RF-07-AC-4 (vender un lote que caduca hoy), RF-16-AC-2 (recalcular el total al editar la venta en curso) y RF-18-AC-4 (no se puede modificar el responsable ni la fecha de una venta).

**Acción correctiva.**
- RF-07-AC-4 → `POST /ventas`: la regla FEFO incluye los lotes que caducan hoy.
- RF-18-AC-4 → `GET /ventas/{folio}`: la venta es inmutable **por diseño**; no existen PUT, PATCH ni DELETE y el servidor responde 405. La prueba verifica ese 405.
- RF-16-AC-2 → se documenta como **fuera del alcance de la API**: la venta en curso vive en el Portal Tienda hasta confirmarse, con los precios obtenidos de `GET /productos`. Ver la sección A de `decisiones_y_trazabilidad.md`.

---

## Resultado

| Principio | v0 | Final |
|---|---|---|
| Rutas con verbos | 14 | 0 |
| Rutas fuera de minúsculas / kebab-case | 6 | 0 |
| Creaciones que responden 201 + Location | Ninguna | Todas |
| Operaciones con `Idempotency-Key` | 0 | 6 |
| Colecciones paginadas | 0 | 12 |
| Operaciones con `operationId` | 0 de 59 | 74 de 74 |
| Criterios del SRS con endpoint | 128 de 131 | 130 de 131 (1 de frontend, documentado) |
