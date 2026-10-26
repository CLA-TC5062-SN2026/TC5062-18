# Diferencias de diseño — TiendiNet

| Campo | Valor |
|---|---|
| Equipo | Adrián Alberto Cortés Alvarez, Ángel Vega Martínez, Víctor Manuel Jurado Herrera, José |
| Artefactos | Contrato OpenAPI, diagrama de clases, arquitectura |
| Criterio | SRS de equipo 2.0. Ante dos diseños del mismo propósito se conservó el que permite verificar el criterio `RF-XX-AC-Y` sin mezclar roles, códigos ni entidades. |
| Fecha | 24/10/2026 |

Este archivo resume qué aportó cada integrante en los tres artefactos, qué conflictos aparecieron y cómo se resolvieron. El análisis completo de consenso, gaps y conflictos de cada artefacto está en `diferencias_openapi.md`, `diferencias_clases.md` y `diferencias_arquitectura.md`.

Resultados:

| Artefacto | Archivo de equipo | Análisis de diferencias |
|---|---|---|
| Contrato | `openapi_equipo.yaml` (87 paths, 109 operaciones, 131 criterios) | `diferencias_openapi.md` |
| Clases | `diagrama_clases_equipo.puml` | `diferencias_clases.md` |
| Arquitectura | `arquitectura_equipo.md`, `diagrama_contenedores_equipo.puml`, `diagrama_componentes_equipo.puml` | `diferencias_arquitectura.md` |

## Qué aportó cada integrante

### Adrián Alberto Cortés Alvarez

Su contrato es la base del OpenAPI de equipo. Cubre los 131 criterios en operaciones separadas, con esquemas cerrados y con el código HTTP que el SRS nombra (201, 401, 403, 409, 422, 429). De ahí salen el borrador de venta, la venta diferida aparte, el carrito, `/mis-pedidos` separado de la cola de la tienda, el costo como recurso propio, el punto de reorden manual, la comparación de ofertas, la sincronización con resumen 201 y los tres reportes.

En clases aportó el vocabulario que el contrato confirma: `correo`, `estado`, `codigoInterno`, punto de reorden con origen y vigencia, `perecedero`, `restringido`, `marcaDescuadre`, alerta única, configuración tipada, historial con un estado y la máquina completa del pedido. `FormaPago` queda en `EFECTIVO` y `TARJETA_TERMINAL`.

En arquitectura aportó los dos portales (React, Vite, TypeScript), la API FastAPI con SQLAlchemy y Alembic, PostgreSQL con bloqueo por fila, el proveedor A en PostgreSQL y el B en SQLite o MySQL, el webhook de vuelta con firma, y SMTP con Mailpit. Su archivo se llama diagrama de componentes y en realidad es C4 de contenedores. Esos contenedores son el nivel de despliegue del equipo.

### Ángel Vega Martínez

En el OpenAPI cubrió el propósito de los 29 requerimientos del MVP, uno por requisito, con los identificadores `RF-XX-AC-Y`. Esa trazabilidad por requisito sirvió para comprobar que ningún RF del MVP se quedara sin operación. El diseño de esos endpoints (inglés, `/api/v1`, un cuerpo genérico y los mismos códigos en todas las rutas) no pasó al contrato.

En clases aportó el esqueleto que los tres comparten: usuario con dos subtipos, producto, lote, movimiento, proveedor, oferta, propuesta, venta, corte, pedido, pago, reembolso y auditoría, con las composiciones de renglones y lotes. Los nombres en inglés y el apartado puesto en el lote no se conservaron.

En arquitectura es quien dibuja el interior del monolito. De ahí salen los módulos de acceso, inventario, proveedores, POS, pedidos, administración y auditoría, y la idea de puertos. POS habla con inventario al vender; pedidos habla con inventario al apartar y entregar; cada módulo escribe auditoría. El puerto de pagos conserva su nombre, `ServicioPagos`. El de proveedores se llama `FuenteProveedor` y el de correo `ServicioCorreo`.

### Víctor Manuel Jurado Herrera

En el OpenAPI aportó lo que el texto del SRS pide como cambio parcial y no como reemplazo: `PATCH /configuracion`, el recurso de códigos postales y `fechaReferencia` para clavar la fecha de una tarea. También aportó la búsqueda de la venta por folio, el encabezado `Idempotency-Key` en los POST que cobran o mueven existencia, y el webhook con el formato real de Mercado Pago (`x-signature` y consulta del pago). Su contrato trae 130 de 131 criterios; falta RF-18-AC-4, que el de equipo cubre dejando usuario, fecha y hora de la venta en solo lectura.

En clases aportó `CodigoPostalEntrega`, la sincronización con su resultado y sus rechazos, los paquetes por módulo, `puedeVerCostos()`, la multiplicidad del corte en `0..1` y las notas de una sola alerta activa y de venta dentro de un corte cerrado. Sus enums venían en `diagrama_clases_enumeraciones.puml`, que no llegó; los valores del diagrama de equipo salen del OpenAPI.

En arquitectura aportó el worker del reloj, con el mismo código y APScheduler, los horarios de las 5:00 y de la conciliación cada 10 minutos, y la salida del cliente hacia Checkout Pro. La API no recibe la tarjeta. La nota de componentes compartidos entre portales se conservó, sin fundir los dos portales en un solo SPA.

### José

En el OpenAPI trae 57 paths, 74 operaciones y 130 de 131 criterios; le falta RF-16-AC-2, porque confirma la venta en un solo POST sin borrador ni vista previa que recalcule el total. Al contrato de equipo aportó dos confirmaciones: el webhook que recibe el aviso de Mercado Pago (`x-signature`) y consulta el pago antes de actuar, y `Idempotency-Key` en recepciones, ajustes, ventas, cortes, pedidos y pagos. Con él, ninguna de las dos decisiones es de un solo integrante. Coincide con Víctor en la sincronización asíncrona (202, y 409 si hay otra en curso), en `/api/v1` en el servidor, en el folio como llave del path y en un dispatcher único de procesos.

En clases aportó `SalidaLote`: cada renglón de venta o de pedido guarda de qué lote salió cada unidad. Es lo que permite reintegrar "a los lotes de los que salieron" (RF-18-AC-1); el diagrama de equipo anterior no tenía cómo saberlo. También marca como derivadas las existencias del producto y el `caducado` del lote, con sus fórmulas; liga cada `Reembolso` al `Pago` que devuelve, que es el id que pide Mercado Pago para reembolsar; y asocia la auditoría a un `Usuario` opcional, porque el worker también escribe registros.

En arquitectura es el único que separa los dos niveles C4 (contenedores y componentes de la API). De ahí salen las operaciones de los puertos (`ServicioPagos`: `crearPreferencia`, `verificarFirma`, `consultarPago`, `reembolsar`; `leerOfertas` del adaptador de proveedor), el adaptador simulado como componente y no como contenedor, y los componentes transversales de seguridad, unidad de trabajo y auditoría.

## Conflictos y cómo se resolvieron

### Un requisito, una operación, o un recurso por acción

Ángel agrupa cada RF en un endpoint. Adrián y Víctor separan alta, consulta, cambio de estado y cancelación.

Se conservó el recurso por acción. Un 409 de "Código duplicado", un 422 de caducidad y un 403 del empleado que cancela un pedido son pruebas distintas. Colgar los criterios de un solo POST impide nombrar la prueba como pide RNF-16.

### Idioma, dinero y códigos HTTP

Ángel usa inglés (`email`, `OWNER`, `PICKUP`), dinero como `number` y la lista 200, 400, 401, 403, 409, 422, 500 en las 29 operaciones. Adrián y Víctor usan español, dinero en texto con dos decimales y solo el código que aplica. El login de Ángel no declara 429. José usa español, pero pagina con `page` y `pageSize` y responde los errores en `application/problem+json` (RFC 7807).

Se conservó el español del SRS, la cadena `"38.50"` (RD-07) y los códigos precisos. La única excepción es el cuerpo del webhook, que conserva los nombres de Mercado Pago (`type`, `data.id`) porque ese formato lo define el servicio externo. El 429 vive solo en el inicio de sesión (RF-01-AC-5). El alta de cliente responde 201 (RF-02-AC-1). Se mantuvieron el esquema `Error` propio, más simple que RFC 7807, y la paginación `pagina` y `tamano`.

### Dónde vive la versión de la API

Ángel pone `/api/v1` en cada path. Víctor y José lo ponen en el servidor. Adrián no usa prefijo.

La versión queda en `info.version` (`2.0.0`). Unir el prefijo de Ángel con el servidor de Víctor lo duplicaría. Hay dos servidores: `http://localhost:8000` y el túnel HTTPS del SRS para webhooks.

### Venta en borrador, venta diferida y folio

Adrián abre un borrador, agrega renglones y confirma en otra operación. Ángel y Víctor confirman en un POST. Víctor mete la venta diferida en ese mismo POST mediante `fechaHoraReal`, y usa el folio como llave del path. Adrián y Ángel tienen un recurso de venta diferida. En clases, Víctor identifica venta y pedido solo con un folio entero; Adrián usa UUID y folio de texto. El estado de Adrián no incluye `BORRADOR`. José confirma en un solo POST con `fechaHoraReal`, como Víctor, con el folio en el path; por eso su contrato no cubre RF-16-AC-2.

El borrador se conservó: RF-16-AC-2 recalcula el total sin mover existencia, y el borrador puede no tener renglones. La venta diferida es `POST /ventas-diferidas`, para que el 422 de "últimos 3 días" no salga en un cobro normal. La llave del recurso es el id. El folio es texto, nace al confirmar y se busca con `GET /ventas?folio=`. El diagrama agrega `BORRADOR` porque el contrato lo tiene. RF-18-AC-4 queda cubierto: no hay operación que cambie al vendedor, la fecha o la hora.

### Costos y búsqueda del POS

Víctor busca el POS en el mismo `GET /productos` que devuelve costos, y dice que el empleado recibe la ficha sin ellos. Adrián y Ángel tienen `GET /pos/productos`. José usa un solo `GET /productos`, pero nunca con costos: el costo vive en `/productos/{id}/costo`, como en Adrián. En clases, Ángel pone el apartado en el lote; Adrián y Víctor lo calculan en el producto.

La búsqueda del mostrador es otro recurso, sin costo. El 403 de RF-01-AC-3 se prueba en `GET /productos/{id}/costo`. `existenciaFisica`, `apartado` y `existenciaDisponible` son atributos del producto, como el schema. El lote no aparta.

### Punto de reorden, alertas y caducidad

Adrián separa el PR inicial del PR manual. Víctor los manda en un PATCH. Ángel usa un PUT para los siete criterios, cálculo incluido. Víctor parte las alertas en dos rutas y, en clases, en dos subclases. Adrián usa una alerta con `tipo`.

El inicial se guarda en `PATCH .../punto-reorden`. El manual, con vigencia, tiene su recurso (RF-08-AC-5). El cálculo de las 6:00 es una tarea, no un PUT del dueño. La alerta es una clase y un listado `GET /alertas?tipo`. La caducidad del día se consulta en `GET /caducidades`; vender un lote que caduca hoy se prueba al confirmar la venta (RF-07-AC-4).

### Proveedores, sincronización y propuesta

Víctor sincroniza a un proveedor y responde 202. José sincroniza los dos y también responde 202, con 409 si hay una en curso. Adrián sincroniza uno o los dos y responde 201 con el resumen. En clases, Víctor parte el proveedor en sincronizado y manual; Adrián y Ángel usan un `tipo`. Víctor además edita y borra la oferta manual. Al quitar un renglón de la propuesta, Adrián responde 200 y Víctor 204. Ángel y Adrián le ponen estado a la propuesta; el schema no.

La sincronización de equipo es la de Adrián: 201 y resumen, porque RF-10-AC-2 y AC-5 piden la lista de rechazos y el error de conexión en esa respuesta. El proveedor es un enum `CON_BD`, `MANUAL_RUTA`, `OTRO_RUTA`. La oferta manual solo se captura. Borrar una oferta choca con RNF-14. Al quitar un renglón se devuelve la propuesta (200), para ver que el inventario no cambió. La propuesta no tiene estado: `inventarioModificado` y `enviadaAlProveedor` quedan en falso.

Se conservó el 201 con tres condiciones, porque RNF-03 acepta hasta 60 segundos y el túnel HTTPS corta las peticiones largas. Los dos proveedores se sincronizan en paralelo, para que el peor caso no se sume. Cada conexión a una base de proveedor tiene un límite de 10 segundos, y al excederlo ese proveedor queda como "Error de conexión" sin tocar sus ofertas previas (RF-10-AC-5). Y una sincronización nueva responde 409 si ya hay otra en curso, como en los contratos de Víctor y José. Si en pruebas la sincronización se acerca a los 60 segundos, se cambiará al 202 con consulta posterior de Víctor.

En arquitectura, Víctor conectaba la API solo al proveedor A, y José dejaba la sincronización solo al worker. El contrato permite sincronizar los dos bajo demanda, así que la API y el worker alcanzan a las dos bases. El worker sigue corriendo la de las 5:00.

### Pedido, carrito y pago

Adrián tiene carrito, `/mis-pedidos` y cancelación de tienda distinta de la del cliente. Víctor usa `/pedidos` para el cliente y para la tienda, con el folio en el path. Ángel mete crear, expirar y pagar en un POST, y cambiar estado y cancelar en un PATCH. El webhook de Adrián trae monto y firma propia. El de Víctor copia el cuerpo de Mercado Pago, y el de José también recibe el aviso de Mercado Pago y consulta el pago antes de actuar. En clases, Adrián liga un solo pago al pedido; Ángel, Víctor y José admiten varios.

Se conservan el carrito y las dos colecciones de pedidos. El pedido de otro cliente responde 404 (RF-26-AC-4). Asignar, transicionar y cancelar son operaciones distintas: el empleado que cancela recibe 403 (RF-24-AC-8), no 409. Un pedido puede tener varios pagos, porque un rechazo deja el pedido pendiente (RF-23-AC-4). El webhook es el de Víctor y José. Mercado Pago llama directamente a ese endpoint con su propio cuerpo (`type`, `data.id`) y la firma `x-signature`; un cuerpo normalizado con monto y estado, como el de Adrián, nunca llegaría desde el servicio real. La API verifica la firma, consulta el pago en `ServicioPagos` con `data.id` y de ahí toma monto, estado y folio (`external_reference`), sin confiar en el cuerpo del aviso. El adaptador simulado envía avisos con el mismo formato y responde la consulta con el monto y el estado que fija cada prueba, así las pruebas siguen sin llamar a Mercado Pago.

Solo José dibujaba ese adaptador simulado (`PagosSimulado`), como componente que implementa `ServicioPagos`. Se conserva así, dentro de la API y no como contenedor, porque el SRS lo pide en la sección 2.1 y en RNF-15.

### Idempotencia

Víctor y José exigían `Idempotency-Key` en los POST que crean ventas, pedidos, pagos, recepciones, ajustes y cortes. Adrián y Ángel no tenían un mecanismo contra reintentos.

Se recuperó. El SRS reconoce internet intermitente (por eso existe la venta diferida): si se pierde la respuesta y el cajero vuelve a cobrar, sin idempotencia la venta se duplica y la existencia se descuenta dos veces. El bloqueo por fila no lo evita, porque son dos transacciones válidas. El encabezado se exige en confirmar venta, venta diferida, recepción, ajuste, corte, crear pedido e iniciar pago. Un reintento con la misma clave y el mismo cuerpo devuelve la respuesta original con `Idempotency-Replayed: true`; la misma clave con otro cuerpo responde 409 `IDEMPOTENCIA_CONFLICTO`.

### Configuración y códigos postales

Adrián y Ángel reemplazan toda la configuración con PUT. Víctor hace PATCH de los escalares y un subrecurso de códigos. José hace PATCH de toda la configuración, con los códigos dentro como arreglo. En clases, Adrián embebe los códigos en un arreglo; Víctor los modela como `CodigoPostalEntrega`; su configuración general es un mapa clave-valor.

Quedó el PATCH de Víctor más el subrecurso de códigos. `GET /configuracion` sigue devolviendo el objeto completo, y `/codigosPostalesEntrega` es la proyección de los códigos activos. Los parámetros tienen nombre y tipo, no una clave libre, para que 20 días de seguridad respondan 422 con el mensaje del SRS (RF-28-AC-2).

### Reloj

Adrián define seis `POST /tareas` sin cuerpo y, en arquitectura, mete los jobs en la API. Víctor define un solo `POST /tareas-programadas/{tarea}/ejecuciones` con `fechaReferencia` y, en arquitectura, un worker. José, como Víctor, usa una ruta única (`POST /procesos/{proceso}/ejecuciones`) que responde 202 y se consulta después. Ángel no dibuja el reloj ni las tareas.

Quedaron las seis tareas, cada una con `fechaReferencia` opcional, y el worker de Víctor ejecutando esos mismos casos. Una sola ruta cargaba criterios de caducidad, PR, conciliación y faltantes. El worker no es un segundo backend: es el mismo código, disparado por horario.

### Dos portales o un SPA

Adrián y Ángel dibujan Portal Tienda y Portal Clientes. Víctor dibuja un SPA para ambos. José dibuja los dos portales detrás de un proxy inverso (Caddy) que sirve las SPA y enruta `/api`.

Quedaron dos contenedores. El catálogo es público y el portal de tienda exige sesión (RF-01-AC-6). Comparten componentes de React, como pide la tabla de tecnología del SRS. El proxy de José queda como decisión de despliegue, fuera del diagrama de contenedores. El cliente sale del portal hacia Checkout Pro; Mercado Pago regresa a la API por el webhook.

### Corte de caja

Ángel modela apertura y cierre, como un turno. El SRS dice que el corte no es por turno (S-06). Adrián obliga a que toda venta esté en un corte (`1` a `1..*`). Víctor y José dejan la venta fuera del corte hasta que este cierra (`0..1`).

El corte de equipo tiene fecha, hora y montos, sin apertura de turno. Una venta tiene `corteId` nulo hasta el cierre. Por eso la multiplicidad es `0..1` a `0..*`, y una venta de un corte cerrado ya no se cancela (RF-18-AC-3).

### Usuario: herencia o rol

Adrián, Ángel y Víctor modelan `Usuario` con dos subclases (tienda y cliente). José usa un solo `Usuario` con un enum `Rol` y un `PerfilCliente` opcional.

Se conservó la herencia. El usuario de la tienda y el cliente tienen datos y permisos distintos, y así un `Pedido` solo puede ligarse a un `Cliente` y una `Venta` solo a un `UsuarioTienda`; con un rol libre esa regla queda fuera del modelo.

### Trazabilidad de lotes y existencias

Adrián liga `RenglonVenta` a los lotes, Víctor liga el movimiento al renglón y José crea `SalidaLote`. El diagrama de equipo anterior no tenía ninguna de las tres, y guardaba las existencias del producto como atributos.

Se adoptó `SalidaLote` de José: cubre venta y entrega de pedido con una sola clase y deja saber a qué lote regresa cada unidad al cancelar (RF-18-AC-1). Las existencias del producto y `caducado` del lote pasan a ser derivadas (`/`), como en Adrián, Víctor y José: se calculan de lotes y renglones, para que no se desincronicen en la base de datos. El contrato las sigue devolviendo en sus respuestas. La auditoría queda ligada a un `Usuario` opcional, y cada `Reembolso` a su `Pago`.

### Clases que el contrato tiene y nadie dibujó

El diagrama de equipo agrega `Direccion`, `Carrito`, `RenglonCarrito`, `Recepcion`, `Ajuste`, `VinculacionPendiente`, `Descuadre`, `CancelacionVenta` y `ResolucionNoRecogido`. Sus atributos coinciden con los schemas. Los nombres que el JSON repite (`proveedorNombre`, `usuarioNombre`, `nombreProducto`) no se duplican: salen de la asociación.

`passwordHash` y `RegistroAuditoria` están en los tres diagramas y en el SRS, y no tienen response. Se conservan. `Pago` tampoco tiene schema: se llena con la consulta del pago en `ServicioPagos` que hace el webhook o la conciliación.

## Verificación

- `openapi_equipo.yaml` pasa la validación de OpenAPI 3.0 (`openapi-spec-validator`). Tiene 87 paths y 109 operaciones; todas declaran `x-acceptance-criteria`, y entre todas cubren los 131 criterios de RF-01 a RF-29, que son la unión de los criterios de los cuatro contratos individuales.
- `verificar_coherencia.py` compara cada clase de `diagrama_clases_equipo.puml` con su schema. Todos los atributos tienen un campo con el mismo nombre en el contrato, salvo `passwordHash`, que no se expone. `Pago`, `SalidaLote` y `RegistroAuditoria` son clases internas sin schema propio. El detalle está en `diferencias_clases.md`, sección 4.
- Los tres diagramas PlantUML se renderizan sin errores.

## Qué quedó fuera a propósito

No entraron el perfil de cliente, el catálogo de categorías (Víctor y José; José lo modela como entidad `Categoria`), los errores RFC 7807 y el proxy inverso de José, editar o borrar ofertas, las vistas previas de venta y pedido, el dispatcher único de tareas, el SPA único, PostgreSQL 16 como versión fijada, ni el mapa clave-valor de configuración. RF-30 sigue fuera del MVP: la venta sin conexión de esta fase es la venta diferida.

No se agregó una cola de mensajes ni una base aparte para auditoría. La auditoría se escribe en la misma PostgreSQL.
