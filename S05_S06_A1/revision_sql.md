# Revisión del esquema de base de datos de TiendiNet

| Campo | Valor |
|---|---|
| Manejador | PostgreSQL 16 |
| Entradas | `diagrama_clases_equipo.puml`, `openapi_equipo.yaml` (2.0.0) |
| Salidas | `esquema_bd.sql`, `er_tiendinet.puml`, `pruebas_esquema.sql` |
| Resultado | 37 tablas, 1 vista, 60 llaves foráneas. Carga sin errores y pasa 30 de 30 pruebas de restricciones |

## Cómo se generó

Al agente se le dieron el diagrama de clases de equipo y el contrato OpenAPI con esta instrucción:

> Eres un ingeniero de bases de datos. A partir de `diagrama_clases_equipo.puml` y `openapi_equipo.yaml` genera `esquema_bd.sql` para PostgreSQL 16. Una tabla por clase con PRIMARY KEY, FOREIGN KEY según las asociaciones y multiplicidades, NOT NULL según los `required` y `nullable` del contrato, UNIQUE e índices donde el contrato pide un 409 o una búsqueda. Tipos coherentes con los schemas: UUID para ids, dinero en NUMERIC(12,2), enums con los mismos valores del contrato. Los atributos derivados (`/`) no se guardan. Agrega las restricciones de negocio que el SRS pide y que la base puede garantizar.

La primera versión se revisó contra las cinco preguntas de la actividad. Lo que se encontró y cómo quedó está abajo.

## Respuestas a las preguntas de revisión

**¿Están todas las entidades del diagrama?** Sí. El diagrama tenía 35 clases y 34 tienen tabla propia. La que falta, `Direccion`, es un objeto de valor y vive como columnas (`calle`, `codigo_postal`) dentro de `cliente`. La herencia `Usuario <|-- UsuarioTienda, Cliente` es una tabla por clase. Se agregaron tres tablas que el contrato necesita y el diagrama no tenía (ver la sección «Tablas nuevas»).

**¿Están todos los atributos?** Sí, con dos excepciones a propósito. Los atributos derivados del diagrama no son columnas: `/existenciaFisica`, `/apartado` y `/existenciaDisponible` salen de la vista `v_existencia_producto`; `/caducado`, `/costoPorUnidadBase`, `/vigente`, `/puedeReintentar` y `/codigosPostalesEntrega` se calculan al consultar. Y los nombres que el JSON repite (`proveedorNombre`, `usuarioNombre`, `nombreProducto`) salen de un JOIN, no se duplican.

**¿Las llaves foráneas reflejan las relaciones?** Sí. Multiplicidad `1` es FK `NOT NULL`; `0..1` es FK nula; una composición `0..1` (cancelación de venta, resolución de no recogido, carrito) usa la FK como llave primaria, así la base impide un segundo registro. Las partes de una composición (renglones, historial, rechazos, salidas de lote) usan `ON DELETE CASCADE`. Lo demás es `RESTRICT`, por RNF-14: un producto con ventas no se puede borrar.

**¿Los tipos son coherentes con el contrato?**

| Contrato | PostgreSQL |
|---|---|
| `string`, `format: uuid` | `UUID` con `gen_random_uuid()` |
| `Dinero` (`"38.50"`) | dominio `dinero` = `NUMERIC(12,2)` con `>= 0` |
| `DineroConSigno` (diferencia del corte) | dominio `dinero_con_signo` = `NUMERIC(12,2)` |
| `format: date-time` | `TIMESTAMPTZ` |
| `format: date` | `DATE` |
| `Hora` (`"18:00"`) | `TIME` |
| Código postal `^\d{5}$` | dominio `codigo_postal` = `CHAR(5)` con la misma expresión |
| Teléfono `^\d{10}$`, EAN-13 `^\d{13}$` | `CHAR(10)` y `CHAR(13)` con CHECK |
| Enums (`EstadoPedido`, `FormaPago`, etc.) | `VARCHAR` + `CHECK` con los mismos valores |
| `integer` con `minimum` | `INTEGER` con el mismo `CHECK` |

El dinero se guarda como número y el API lo convierte a texto con dos decimales al responder. Los enums van como `VARCHAR` + `CHECK` y no como `CREATE TYPE ... AS ENUM` porque agregar un valor después (por ejemplo un estado de pedido) es un `ALTER TABLE` sencillo, y el ORM los maneja como texto.

**¿Faltan restricciones que el negocio requiere?** En la primera versión sí. Esta es la lista de lo que se agregó.

## Correcciones y ajustes

| # | Hallazgo | Ajuste | Origen |
|---|---|---|---|
| 1 | El correo era `UNIQUE` sensible a mayúsculas: `Ana@x.mx` y `ana@x.mx` pasaban como dos cuentas | Índice único sobre `lower(correo)` | RF-02, RF-03 (409) |
| 2 | El 409 de producto es por nombre + presentación «sin distinguir mayúsculas ni espacios extremos». Un `UNIQUE (nombre, presentacion)` no lo cubre | Índice único sobre `f_normaliza(nombre), f_normaliza(presentacion)`; la función quita acentos, mayúsculas y espacios | RF-04 |
| 3 | La búsqueda del POS es parcial y sin acentos. Un índice B-tree sobre `nombre` no sirve para `LIKE '%lech%'` | Índice GIN de trigramas (`pg_trgm`) sobre `f_normaliza(nombre)` | RF-15-AC-1 |
| 4 | Con una sola tabla `usuario` nada impedía que un pedido apuntara a un empleado o que una venta la cobrara un cliente | Herencia en tres tablas con FK compuesta `(usuario_id, tipo)`. `pedido.cliente_id` apunta a `cliente` y `venta.usuario_responsable_id` a `usuario_tienda` | Conflicto C1 de `diferencias_clases.md` |
| 5 | `passwordHash` era `NOT NULL`, pero el Dueño crea cuentas de la tienda sin contraseña hasta que se activan | Nulo permitido, con `CHECK (estado = 'INACTIVO' OR password_hash IS NOT NULL)` | RF-03-AC-1 |
| 6 | El diagrama dice `RenglonPropuesta → Proveedor` con multiplicidad `1`, pero el contrato tiene `proveedorId` nulo cuando no hay proveedor con existencia | FK nula. Se corrigió el diagrama a `0..1` | RF-13-AC-5 |
| 7 | El diagrama guarda `precioUnitario` y `subtotal` en el renglón del carrito. Si el Dueño cambia el precio, el carrito mostraría el viejo | Solo se guarda la cantidad; precio y subtotal se leen del producto. El pedido sí congela el precio al crearse. Se marcaron como derivados en el diagrama | RF-22 |
| 8 | `Venta.usuarioResponsableId` era `[0..1]` en el atributo pero `1` en la asociación | `NOT NULL`: el borrador ya lo abre un usuario de la tienda. Se corrigió el atributo | RF-18-AC-4 |
| 9 | Nada impedía un borrador con folio, una venta con tarjeta y cambio, o un efectivo menor al total | `CHECK` de estado: borrador sin folio ni forma de pago; confirmada con folio, forma de pago y fecha; tarjeta sin recibido ni cambio; efectivo con `recibido >= total` y `cambio = recibido - total` | RF-16-AC-3, AC-4 |
| 10 | Subtotales y totales podían no cuadrar | `subtotal = cantidad * precio_unitario` en renglones; `total = subtotal + costo_envio` en pedido; `diferencia = contado - esperado` en el corte; `delta = nueva - anterior` en el ajuste | RD-07 |
| 11 | Podían existir dos alertas activas de reorden del mismo producto | Índice único parcial `(producto_id) WHERE tipo = 'REORDEN' AND estado = 'ACTIVA'` | RF-09-AC-4 |
| 12 | La merma podía registrarse sin lote | `CHECK` en `ajuste`: si es MERMA lleva lote, delta negativo y no cuenta para el CDP | RF-06 |
| 13 | Un reembolso podía apuntar al pago de otro pedido | FK compuesta `(pago_id, pedido_id)` hacia `pago (id, pedido_id)` | C12 |
| 14 | El mismo aviso de Mercado Pago, repetido, podía crear dos pagos | `referencia_servicio` único en `pago` | RF-23 |
| 15 | `SalidaLote` con `{xor}` solo existía como nota | `CHECK (num_nonnulls(renglon_venta_id, renglon_pedido_id) = 1)` | RF-18-AC-1 |
| 16 | La auditoría se podía modificar o borrar | Triggers que rechazan `UPDATE`, `DELETE` y `TRUNCATE` en `registro_auditoria`. Los valores anterior y nuevo pasan a `JSONB` | RNF-07 |
| 17 | La configuración admitía varias filas y 20 días de seguridad | `CHECK (id = 1)` y `dias_seguridad BETWEEN 0 AND 14`; horario fin mayor que inicio y hora límite dentro del horario | RF-28-AC-2 |
| 18 | El nombre de proveedor activo podía repetirse | Índice único parcial sobre el nombre normalizado `WHERE activo` | 409 de `POST /proveedores` |
| 19 | Las existencias del producto eran columnas, y se desincronizarían de los lotes | Vista `v_existencia_producto`: física = suma de lotes; disponible = física menos caducado menos apartado. Un lote que caduca hoy sigue disponible | RF-07-AC-4, C5 |
| 20 | Los folios no tenían de dónde salir | Secuencias: `PRD-000001` (código interno), `VTA-000001` (se asigna al confirmar, como el ejemplo `VTA-000128` del contrato) y `PED-000001` | RF-16, RF-22 |

### Tablas nuevas

Tres cosas que el contrato exige no tenían dónde guardarse. Se agregaron como clases internas, sin schema de respuesta, igual que `Pago` y `RegistroAuditoria`:

| Tabla | Para qué | Criterio |
|---|---|---|
| `token_cuenta` | Enlaces de un solo uso: activación de cuentas de la tienda y recuperación de contraseña (30 min). Guarda el hash SHA-256 del token, no el token | RF-02-AC-3, RF-03-AC-1 |
| `intento_inicio_sesion` | Contar fallos de correo + IP para el 429 de 15 minutos | RF-01-AC-5 |
| `registro_idempotencia` | Guardar la `Idempotency-Key` con el hash del cuerpo y la respuesta, para devolver lo mismo en un reintento durante 24 horas | Encabezado `Idempotency-Key` del contrato |

El candado de «una sincronización a la vez» no necesita tabla: es un `pg_try_advisory_lock` de PostgreSQL.

### Reglas que la base no puede garantizar sola

Se dejan al servicio, dentro de la misma transacción, porque cruzan tablas o dependen de la hora:

- Un producto perecedero exige fecha de caducidad al recibir (está en `producto`, la fecha en `lote`).
- Una venta de un corte cerrado no se cancela.
- El total de la venta es la suma de sus renglones.
- La venta diferida no puede ser de hace más de 3 días.
- No desactivar al último Dueño activo.

## Archivos que se actualizaron por estos cambios

| Archivo | Cambio |
|---|---|
| `diagrama_clases_equipo.puml` | Clases `TokenCuenta`, `IntentoInicioSesion`, `RegistroIdempotencia`; `RenglonPropuesta → Proveedor` en `0..1`; precio y subtotales del carrito derivados; `Venta.usuarioResponsableId` obligatorio; `passwordHash` opcional; auditoría en JSON |
| `verificar_coherencia.py` | Reconoce las tres clases internas nuevas. La verificación sigue limpia: todo atributo tiene campo en su schema, salvo `passwordHash` y las clases internas |
| `openapi_equipo.yaml` | Sin cambios. Los ajustes ya coincidían con el contrato (por ejemplo, `proveedorId` ya era nulo); lo que se corrigió fue el diagrama |

## Evidencia

Carga del esquema y listado de tablas:

```
psql -h localhost -U tiendinet -d tiendinet -f esquema_bd.sql
psql -h localhost -U tiendinet -d tiendinet -c '\dt'
```

Resultado: 37 tablas (`ajuste` … `vinculacion_pendiente`), sin errores.

Pruebas de restricciones (`pruebas_esquema.sql`, corre dentro de una transacción y la revierte): 30 casos, 30 correctos. Ejemplos: correo repetido con otras mayúsculas, producto duplicado con acentos y espacios, 20 días de seguridad, dos alertas activas, venta en efectivo con recibido menor al total, pedido de un empleado, aviso de Mercado Pago repetido, borrar auditoría, borrar un producto con ventas. El detalle está en `pruebas_esquema_resultado.txt`.

## Correcciones al código generado

El agente generó la API con FastAPI, SQLAlchemy 2 y PostgreSQL a partir de `openapi_equipo.yaml` y `esquema_bd.sql`, sin seguridad. La instrucción fue:

> Eres un desarrollador Python. A partir de `openapi_equipo.yaml` y `esquema_bd.sql` genera una API REST con FastAPI, SQLAlchemy 2 y psycopg 3 sobre PostgreSQL 16. Un router por módulo de la arquitectura de equipo (acceso, productos e inventario, proveedores, configuración, punto de venta, carrito). Conexión por variables de entorno con `.env.example`. Rutas, métodos, códigos y cuerpos exactos del contrato, incluido el schema `Error`. 404 si el recurso no existe y 422 con el campo si los datos son inválidos. Por ahora NO uses JWT ni roles.

El código se revisó de dos formas. La primera fue leerlo contra el contrato: las filas 1 a 5 y la 8 y 9 son comportamientos por defecto de FastAPI y SQLAlchemy que no coinciden con lo especificado. La segunda fue `api/verificar_api.py`, que lanza 83 peticiones y valida cada respuesta contra el contrato: que la ruta exista, que el código HTTP esté declarado y que el cuerpo cumpla el schema. Su primera corrida dio 91 de 104 y destapó las filas 6 y 7.

| # | Divergencia | Corrección |
|---|---|---|
| 1 | Los errores de validación salían con el formato de FastAPI (`{"detail": [...]}`) y no con el schema `Error` del contrato (`mensaje`, `codigo`, `detalles[{campo, mensaje}]`) | Manejador propio en `app/errores.py`, con mensajes en español. Cuando el SRS da el texto, se usa ese: «La cantidad debe ser un número entero mayor a 0», «Los días de seguridad deben estar entre 0 y 14» |
| 2 | Un JSON mal formado y un parámetro de consulta inválido respondían 422. El contrato declara 400 (`PeticionInvalida`) | 400 `PETICION_INVALIDA` en esos dos casos. Las reglas del cuerpo siguen en 422 |
| 3 | Un id mal formado en la ruta (`/productos/abc`) respondía 422, que esos GET no declaran | 404 `NO_ENCONTRADO`, igual que un id que no existe |
| 4 | Pydantic en modo flexible aceptaba `"2"` y `2.0` como cantidad entera. El contrato pide 422 ante un decimal | Tipos estrictos (`StrictInt`, `StrictBool`) y `extra="forbid"` para el `additionalProperties: false` |
| 5 | Las rutas inexistentes y los métodos no permitidos respondían `{"detail": ...}` | Mismo schema `Error` (`NO_ENCONTRADO`, `METODO_NO_PERMITIDO`) |
| 6 | El borrador de venta devolvía `"fechaHora": null`, y el schema `Venta` no la declara nula | Se omite mientras la venta no se confirma; no es campo obligatorio |
| 7 | `formaPago` y `cancelacion` salían como `null`. El contrato los declara con `nullable: true` junto a `allOf: [$ref]`, y en OpenAPI 3.0 `nullable` no aplica dentro del `allOf`, así que un validador estricto rechaza el `null` | Se omiten cuando no tienen valor. **Pendiente para el contrato:** declarar `formaPago` como `type: string, enum: [...], nullable: true` sin `allOf`, o pasar el contrato a OpenAPI 3.1 con `oneOf: [{$ref}, {type: 'null'}]` |
| 8 | El modelo ORM mandaba `codigo_interno = NULL` al insertar un producto y chocaba con el `NOT NULL`. El valor lo genera la secuencia de la base | Columna marcada como `FetchedValue()`: el ORM no la envía y la lee después del INSERT |
| 9 | Los renglones de venta y de carrito salían en orden aleatorio, porque se ordenaban por un UUID v4 | Ids UUID v7, ordenados por tiempo: los renglones salen en el orden en que se capturaron |

De las 13 fallas, 12 eran las filas 6 y 7. La otra era de la prueba y no del código: esperaba que «BIMBO  ruta», con doble espacio interno, chocara con «Bimbo ruta». La regla del contrato solo ignora mayúsculas y espacios en los extremos. Se corrigió la prueba.

Resultado final: 104 de 104. Son 83 peticiones que cumplen código y schema, más 21 comprobaciones de reglas y de datos en la base: FEFO, folio, idempotencia, auditoría y persistencia.

### Decisiones de la Parte 2

- **Sin seguridad.** El encabezado opcional `X-Usuario-Id` dice quién opera, porque varias reglas dependen del rol. Por ejemplo, si un Empleado envía costo, se ignora (RF-05-AC-3). Sin el encabezado opera la Dueña sembrada.
- **Delete.** Producto, proveedor, usuario y código postal no se borran (RNF-14); su baja es `PATCH` de estado. Los `DELETE` del contrato (renglones de venta y del carrito, vaciar carrito) sí borran.
- **Transacciones.** Recibir, confirmar venta y cambiar el último Dueño bloquean las filas con `SELECT ... FOR UPDATE`, en orden de id. La auditoría y la clave de idempotencia se guardan en la misma transacción que la operación.
