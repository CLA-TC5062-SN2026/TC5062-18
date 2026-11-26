# Matriz de trazabilidad requerimientos-implementación: TiendiNet

| Campo | Valor |
|---|---|
| Equipo | 18 · José Alberto Ramírez Morales · Ángel Vega Martínez · Víctor Manuel Jurado Herrera · Adrián Alberto Cortés Alvarez |
| Fecha | 25/11/2026 |
| Fuentes | `S09_A1/SRS_equipo.md` v2.0 (29 RF del MVP, 131 criterios) · `S09_A1/backlog_completo.md` v1.2 (24 HU) · `S09_A1/openapi_equipo.yaml` 2.0.0 (109 operaciones) · código de `backend/app/` y `frontend/tiendinet-frontend/src/` · `S09_A1/code_review.md` |
| Evidencia | `S11_A1/evidencia/verificacion_resultado.txt`: corrida del 25/11/2026 sobre una base recién cargada |
| Resultado | **4 RF completos en la API, 8 parciales y 17 sin implementar.** 35 de 131 criterios cumplidos, 15 a medias y 81 pendientes. RF-30 es Fase 2 |

## 1. Cómo leer la matriz

La cadena de cada fila es **RF del SRS → historia del backlog → endpoint del contrato → prueba**. El estado se decide por criterio de aceptación (`RF-XX-AC-Y`) y se evalúa en la **API**, porque es donde vive la regla de negocio. Que exista o no una pantalla va en una columna aparte.

| Símbolo | Criterio |
|---|---|
| ✓ | Implementado y verificado por una prueba que se puede volver a correr |
| ◐ | Implementado a medias: falta una parte del criterio (correo, pantalla, mensaje exacto) o solo se cumple en un caso |
| ✗ | No implementado |

| Estado del RF | Regla |
|---|---|
| **Completo** | Todos sus criterios están en ✓ |
| **Parcial** | Al menos un criterio en ✓, pero no todos |
| **No implementado** | Ningún criterio en ✓. Puede haber piezas de apoyo, que se mencionan en la justificación |

**Pruebas referenciadas**

| Clave | Prueba | Tipo | Resultado del 25/11/2026 |
|---|---|---|---|
| **VA** | `backend/verificar_api.py`. Se cita el nombre del caso, por ejemplo VA «Crear producto» | Integración automatizada: 113 peticiones contra la API real; valida código HTTP y schema del contrato, y revisa la base | 147/147 |
| **VC** | `S11_A1/evidencia/verificacion_complementaria.py`. Cubre criterios que el código ya cumplía pero que VA no revisaba | Integración automatizada, incluye concurrencia, alertas por `GET /alertas` y vista previa de caja | 18/18 |
| **VR** | `backend/verificar_roles.py`. Compara el rol de cada ruta con el contrato | Estática automatizada | 46 operaciones, 0 diferencias |
| **PS** | `backend/pruebas_seguridad.sh` y `pruebas_seguridad_resultado.txt` | Manual documentada con `curl` | 401 / 401 / 403 / 200 |
| **FE** | `frontend/tiendinet-frontend/src/pages/tienda/flujoLogin.test.tsx`, `ProductosPage.test.tsx` y `src/services/api/cliente.test.ts` | Vitest + Testing Library + axe-core | 49/49 en todo el frontend |
| **VID** | `S05_S06_A1/pruebas_postman.mp4`, `S05_S06_A2/pruebas_auth.mp4` | Manual grabada | Sin conteo |

> **Sobre las pruebas.** El proyecto **no tiene `backend/tests/` con pytest**. La DoD pedía una prueba por criterio, con nombre `test_RF_XX_AC_Y`, y eso no se cumplió: VA y VC son scripts de integración que se ejecutan contra la API levantada y no reportan cobertura (RNF-16 pide ≥ 70 %). `S09_A1/code_review.md` documenta hallazgos de código, pero no casos de prueba manuales. Por eso aquí la evidencia son las corridas de VA y VC.

## 2. Resumen

| Estado | RF | Cantidad |
|---|---|---|
| Completo (API) | RF-04, RF-05, RF-15, RF-16 | 4 |
| Parcial | RF-01, RF-02, RF-03, RF-07, RF-09, RF-17, RF-22, RF-28 | 8 |
| No implementado | RF-06, RF-08, RF-10, RF-11, RF-12, RF-13, RF-14, RF-18, RF-19, RF-20, RF-21, RF-23, RF-24, RF-25, RF-26, RF-27, RF-29 | 17 |
| Fase 2 (fuera del MVP) | RF-30 | 1 |

| Prioridad MoSCoW | Total | Completo | Parcial | No implementado |
|---|---|---|---|---|
| Must | 18 | 4 (RF-04, 05, 15, 16) | 5 (RF-01, 02, 09, 22, 28) | 9 (RF-08, 10, 12, 18, 21, 23, 24, 26, 27) |
| Should | 10 | 0 | 3 (RF-03, 07, 17) | 7 (RF-06, 11, 13, 19, 20, 25, 29) |
| Could | 1 | 0 | 0 | 1 (RF-14) |

| Épica | Criterios ✓ | ◐ | ✗ | Lectura |
|---|---|---|---|---|
| EP-01 Acceso y administración (RF-01 a 03, 28 y 29) | 10 | 5 | 6 | La más avanzada: autenticación, roles y configuración funcionan |
| EP-02 Catálogo e inventario (RF-04 a 09) | 13 | 5 | 11 | Ficha y recepción completas. Faltan ajustes, PR calculado y avisos |
| EP-03 Proveedores y compras (RF-10 a 14) | 0 | 0 | 18 | Sin empezar. Solo existen los registros de proveedor |
| EP-04 Punto de venta (RF-15 a 20) | 11 | 4 | 8 | Búsqueda y venta completas. Faltan cancelación, diferidas y el cierre del corte |
| EP-05 Tienda en línea y pedidos (RF-21 a 27) | 1 | 1 | 38 | Solo el carrito |
| **Total** | **35** | **15** | **81** | **131 criterios** |

**De punta a punta (pantalla + API) funcionan el inicio de sesión, el dashboard y el CRUD de productos del Portal Tienda.** Hasta la semana 10 solo funcionaba el login. En el sprint de cierre se construyó la pantalla de productos (RF-04) y se implementaron `GET /alertas` y `GET /cortes-caja/vista-previa`, que el dashboard ya consumía (`docs/capturas/productos.png` y `dashboard_backend_real.png`). El catálogo del Portal Clientes sigue fallando con el backend real porque `/catalogo` no existe (`catalogo_backend_real.png`). La venta, que es lo más completo de la API, todavía se opera por Swagger (`/docs`), Postman o `curl`.

## 3. Matriz

Endpoints: en negritas, los implementados; en texto normal y marcados *pendiente*, los del contrato que faltan.

### EP-01 · Acceso y administración

| RF | HU (sprint plan.) | Endpoints | Pruebas | Criterios | Pantalla | Estado | Justificación |
|---|---|---|---|---|---|---|---|
| **RF-01** Autenticación y roles · Must | HU-01 (S1) | **`POST /auth/sesiones`**, **`GET /auth/yo`**; middleware JWT y dependencias de rol en las 39 rutas protegidas. *Pendiente:* `GET /catalogo` como ruta pública | VA «Login», «Contraseña incorrecta», «Correo inexistente», «Sexto intento tras 5 fallos», «Empleado pide el costo», «Cliente en ruta de tienda»; VR; PS; FE flujoLogin (9 pruebas) | AC-1 ✓ · AC-2 ✓ · AC-3 ✓ · AC-4 ✓ · AC-5 ✓ · AC-6 ◐ | Sí: login, ruta protegida, módulos por rol | **Parcial** | Login con JWT de 60 min / 24 h, mismo 401 para correo y contraseña, 429 al sexto intento y 403 por rol, todo probado. AC-6 se cumple en el Portal Tienda (sin sesión redirige al login, FE), pero el catálogo **no** se puede consultar sin sesión: `/catalogo` no existe y el middleware lo responde con 401 porque toda ruta nueva queda protegida por omisión. En AC-3, los endpoints de ofertas y de PR aún no existen; los que sí existen (`/productos`, `/costo`, `/configuracion`) responden 403 al Empleado |
| **RF-02** Registro y recuperación de cliente · Must | HU-02 (S4) | **`POST /clientes`** (alias `POST /api/auth/register`). *Pendiente:* `POST /auth/recuperacion-contrasena`, `POST /auth/restablecer-contrasena` | VA «Registrar cliente», «Cliente con correo existente», «Contraseña sin número», «Registro (alias)» | AC-1 ✓ · AC-2 ✓ · AC-3 ✗ | No | **Parcial** | Registro con validación de contraseña, aviso de privacidad y 409 por correo repetido. El mensaje dice «El correo ya está registrado.» y el SRS pide «Este correo ya está registrado» (diferencia menor). No hay recuperación de contraseña porque no hay servicio de correo |
| **RF-03** Usuarios de la tienda · Should | HU-03 (S1) | **`GET`, `POST /usuarios`**, **`GET`, `PATCH /usuarios/{id}`**, **`POST /usuarios/activacion`** | VA «Crear empleado», «Desactivar al empleado», «Empleado desactivado con token vigente», «Desactivar a la última Dueña», «Activar la cuenta», «Reusar el enlace» | AC-1 ◐ · AC-2 ✓ · AC-3 ✓ | No | **Parcial** | Alta de Dueño o Empleado con token de activación de un solo uso (se guarda solo su hash SHA-256); una cuenta desactivada recibe 401 aunque su JWT siga vigente; no se puede desactivar al último Dueño (bloqueo por fila). AC-1 queda a medias: **el correo de activación no se envía**; el enlace solo se imprime en consola con `MOSTRAR_ENLACES_EN_CONSOLA=true`. El mensaje del 409 difiere del SRS |
| **RF-28** Configuración de la tienda · Must | HU-03 (S1) | **`GET`, `PATCH /configuracion`**, **`GET`, `POST /configuracion/codigos-postales`**, **`GET`, `PATCH /configuracion/codigos-postales/{codigo}`**. *Pendiente:* `GET /configuracion/publica`, `PUT /productos/{id}/proveedor-preferido`, `PATCH /productos/{id}/dias-entrega-respaldo` | VA «20 días de seguridad» (con mensaje del SRS), «Cambiar días de seguridad y costo de envío», «Agregar código postal», «Código postal repetido»; VA BD «Configuración persistió» | AC-1 ◐ · AC-2 ✓ · AC-3 ◐ · AC-4 ◐ | No | **Parcial** | La configuración se guarda, se valida (0 a 14 días, horario coherente) y se audita. Pero los criterios hablan de su **efecto**: AC-1 necesita el cálculo de PR (RF-08) y AC-3 y AC-4 necesitan pedidos (RF-22), y ninguno existe. Por producto solo se capturan los días de entrega de respaldo al crear la ficha |
| **RF-29** Reportes e indicadores · Should | HU-04 (S6) | *Pendiente:* `GET /reportes/diario`, `/reportes/rotacion`, `/reportes/indicadores` | Ninguna | AC-1 a AC-5 ✗ | No | **No implementado** | Planeado para el último sprint y recortado. Las ventas y los cortes que lo alimentarían sí se guardan con usuario y fecha |

### EP-02 · Catálogo e inventario

| RF | HU (sprint plan.) | Endpoints | Pruebas | Criterios | Pantalla | Estado | Justificación |
|---|---|---|---|---|---|---|---|
| **RF-04** Catálogo de productos · Must | HU-05 (S1) | **`POST`, `GET /productos`**, **`GET`, `PUT /productos/{id}`**, **`PATCH /productos/{id}/estado`**, **`GET /productos/{id}/costo`** | VA «Crear producto», «Código de barras duplicado», «Mismo nombre y presentación con acento y espacios», «Precio negativo», «Desactivar producto»; VC RF-04-AC-4, RF-04-AC-5; FE `ProductosPage.test.tsx` (alta, edición, baja, 409 por código duplicado) | AC-1 ✓ · AC-2 ✓ · AC-3 ✓ · AC-4 ✓ · AC-5 ✓ | **Sí:** `ProductosPage` (lista con búsqueda, alta, edición y baja con confirmación) | **Completo** | CRUD completo del recurso principal, en la API y en pantalla. El duplicado por nombre y presentación ignora mayúsculas, acentos y espacios (`f_normaliza` en la base). La baja es un cambio de estado (RNF-14): el producto desaparece del POS (VC) y sus ventas siguen consultables. Que aparezca en el catálogo en línea (AC-1) depende de RF-21 |
| **RF-05** Recepción de mercancía · Must | HU-06 (S1) | **`POST`, `GET /recepciones`**, **`GET /recepciones/{id}`**, **`GET /inventario/productos`**. *Pendiente:* `GET /productos/{id}/movimientos` | VA «Recepción», «Reintento con la misma clave», «Perecedero sin caducidad», «Empleado envía costo (se ignora)», «Recepción de pan»; VA BD «Lotes de leche», «Movimientos» | AC-1 ✓ · AC-2 ✓ · AC-3 ✓ · AC-4 ✓ | No (solo API) | **Completo** | Cada recepción crea lote y movimiento con usuario, fecha y hora, bloquea la fila del producto y es idempotente. El costo que envía un Empleado se ignora y se marca `costoIgnorado`. El mensaje de caducidad dice «en productos perecederos» y el SRS «para productos perecederos». La parte de AC-3 que dice que el formulario oculta el campo queda pendiente porque no hay formulario |
| **RF-06** Ajustes de inventario · Should | HU-06 (S1) | *Pendiente:* `POST`, `GET /ajustes-inventario`, `GET /productos/{id}/movimientos` | Ninguna | AC-1 a AC-4 ✗ | No | **No implementado** | Era parte de HU-06 en el Sprint 1, pero la actividad de CRUD (S05-S06) priorizó recepciones y ventas. La tabla `ajuste` y el tipo de movimiento existen en `esquema_bd.sql` |
| **RF-07** Control de caducidades · Should | HU-07 (S5) | **`GET /productos/{id}/lotes`**, **`GET /inventario/productos`**; FEFO dentro de la confirmación de venta. *Pendiente:* `GET /caducidades`, `POST /tareas/avisos-caducidad` | VA «Lotes del producto»; VA BD «FEFO: salió del lote que caduca primero»; VC RF-07-AC-4, RF-07-AC-3 (disponible) | AC-1 ✓ · AC-2 ✗ · AC-3 ◐ · AC-4 ✓ | No | **Parcial** | Los lotes se listan con cantidad y caducidad; un lote que caduca hoy se vende y uno caducado ya no cuenta como disponible (la vista `v_existencia_producto` lo descuenta). Falta el proceso diario de las 7:00, el correo y la lista «Caducados» con «Registrar como merma» |
| **RF-08** Punto de reorden · Must | HU-08 (S2) | `prInicial` dentro de **`POST /productos`**. *Pendiente:* `GET`, `PATCH /productos/{id}/punto-reorden`, `PUT`, `DELETE .../punto-reorden-manual`, `PATCH .../dias-entrega-respaldo`, `POST /tareas/calcular-puntos-reorden` | VC RF-08-AC-2 (al crear) | AC-1 ◐ · AC-2 ◐ · AC-3 a AC-7 ✗ | No | **No implementado** | Solo existe el PR inicial al crear la ficha: se valida como entero ≥ 0 (422 con el campo `prInicial`), pero con el mensaje genérico y no con el del SRS, y después no se puede cambiar. No hay CDP, cálculo diario, PR manual ni detalle de origen. Es el Must con más deuda, porque la alerta de RF-09 usa este valor |
| **RF-09** Alertas de reorden · Must | HU-09 (S2) | Generación y resolución dentro de **`POST /ventas/{id}/confirmaciones`** y **`POST /recepciones`**; **`GET /alertas`**. *Pendiente:* `GET /alertas/{id}` | VC RF-09-AC-1, AC-3, AC-4, AC-5 y «GET /alertas» | AC-1 ◐ · AC-2 ✗ · AC-3 ✓ · AC-4 ✓ · AC-5 ◐ | **Sí:** tarjeta «Alertas de reorden» del dashboard | **Parcial** | La alerta nace cuando la disponible llega al PR, hay una sola activa por producto, se actualiza y se resuelve con una recepción. Desde el sprint de cierre se ve en el panel con nombre, disponible, PR y cantidad sugerida (el Empleado no recibe el proveedor sugerido). AC-1 sigue a medias porque **no se envía el correo** al Dueño. AC-2 requiere pedidos. AC-5 solo se resuelve por recepción, porque la cancelación y la expiración no existen. La cantidad sugerida ya sigue el SRS (1.3): sin CDP, `PR − disponible + 1` |

### EP-03 · Proveedores y compras

| RF | HU (sprint plan.) | Endpoints | Pruebas | Criterios | Pantalla | Estado | Justificación |
|---|---|---|---|---|---|---|---|
| **RF-10** Unificación de proveedores · Must | HU-10 (S3) | **`GET /proveedores`**, **`GET /proveedores/{id}`** (A y B vienen de la semilla). *Pendiente:* `/sincronizaciones-proveedores` (3), `/vinculaciones` (3) | VA «Proveedores sembrados» | AC-1 a AC-5 ✗ | No | **No implementado** | No existen las BD simuladas de los proveedores A y B ni sus adaptadores (`FuenteProveedor`). Era la historia de 13 SP con más riesgo técnico, y ninguna actividad del curso la pidió de forma explícita. Es el hueco más grande frente al problema original: «los precios llegan por WhatsApp y no sé a quién comprarle» |
| **RF-11** Ofertas manuales · Should | HU-11 (S3) | **`POST /proveedores`** (alta de proveedor de ruta). *Pendiente:* `POST /ofertas`, `GET /ofertas/{id}`, `GET /productos/{id}/ofertas` | VA «Crear proveedor de ruta», «Proveedor duplicado» | AC-1 · AC-2 ✗ | No | **No implementado** | Se puede registrar al proveedor «Abarrotes El Güero», pero no capturar su oferta. Sin ofertas no hay comparación |
| **RF-12** Comparación normalizada · Must | HU-11 (S3) | *Pendiente:* `GET /productos/{id}/comparacion` | Ninguna | AC-1 a AC-3 ✗ | No | **No implementado** | Depende de RF-10 y RF-11 |
| **RF-13** Sugerencia de proveedor · Should | HU-12 (S6) | *Pendiente:* `GET /productos/{id}/sugerencia`, `PUT`, `DELETE /productos/{id}/proveedor-preferido` | Ninguna | AC-1 a AC-5 ✗ | No | **No implementado** | Depende de las ofertas. La columna `proveedor_preferido_id` existe y la alerta ya la copia |
| **RF-14** Propuesta de compra · Could | HU-13 (S6) | *Pendiente:* `/propuestas-compra` (5 operaciones) | Ninguna | AC-1 a AC-3 ✗ | No | **No implementado** | Primera en el orden de recorte del SRS (sección 4). Se recortó como estaba previsto |

### EP-04 · Punto de venta

| RF | HU (sprint plan.) | Endpoints | Pruebas | Criterios | Pantalla | Estado | Justificación |
|---|---|---|---|---|---|---|---|
| **RF-15** Búsqueda de productos · Must | HU-14 (S2) | **`GET /pos/productos`** | VA «POS por nombre sin acentos» (`q=léche`), «POS por código de barras», «POS sin coincidencias» + «mensaje Producto no encontrado» | AC-1 ✓ · AC-2 ✓ · AC-3 ✓ | No (solo API) | **Completo** | Búsqueda parcial sin mayúsculas ni acentos, o por EAN-13 exacto; solo productos activos; devuelve precio y disponible, nunca el costo |
| **RF-16** Venta en mostrador · Must | HU-14 (S2) | **`POST /ventas`**, **`POST`, `PATCH`, `DELETE /ventas/{id}/renglones[/{id}]`**, **`POST /ventas/{id}/confirmaciones`** | VA «Agregar 2 leches», «Cambiar a 3 leches», «Quitar el pan» (total recalculado), «Efectivo insuficiente» (faltante 35.50), «Confirmar en efectivo» (folio y cambio), «Reintento de la confirmación», «Existencia insuficiente», «Cantidad decimal», «Cantidad cero»; VC RF-16-AC-4, **RF-16-AC-6**, **RNF-06** | AC-1 ✓ · AC-2 ✓ · AC-3 ✓ · AC-4 ✓ · AC-5 ✓ · AC-6 ✓ · AC-7 ✓ | No (solo API) | **Completo** | Es la historia central y la mejor probada. La confirmación ocurre en una transacción: bloquea los productos en orden de id, descuenta con FEFO, guarda de qué lote salió cada unidad, asigna folio `VTA-000001`, audita y es idempotente (un reintento no cobra dos veces). **Concurrencia verificada:** dos cobros por la última unidad dan 200 y 409 «Producto agotado»; 50 cobros simultáneos sobre 10 unidades dan exactamente 10 éxitos y la existencia queda en 0. AC-5 se probó con existencia física insuficiente; el caso con apartado usa la misma validación (`disponible = física − apartado − caducado`), pero no se puede reproducir hasta que existan pedidos |
| **RF-17** Comprobante de venta · Should | HU-15 (S2) | **`GET /ventas`** (filtro por folio), **`GET /ventas/{id}`**. *Pendiente:* `GET /ventas/{id}/comprobante` | VA «Buscar venta por folio», «Consultar venta»; VC RF-17-AC-2 | AC-1 ◐ · AC-2 ✓ · AC-3 ✗ | No | **Parcial** | `GET /ventas/{id}` ya devuelve folio, fecha, responsable, renglones con precio histórico, total, forma de pago, recibido y cambio; falta exponerlo como comprobante. VC confirmó que la venta conserva $10.00 después de subir el precio a $99.00. AC-3 necesita la cancelación |
| **RF-18** Cancelación de venta · Must | HU-15 (S2) | *Pendiente:* `POST /ventas/{id}/cancelaciones` | Ninguna | AC-1 a AC-3 ✗ · AC-4 ◐ | No | **No implementado** | No existe la cancelación. Sí está la base para reintegrar «a los lotes de los que salieron»: la tabla `salida_lote` se llena en cada venta. AC-4 se cumple solo porque ninguna operación permite editar responsable, fecha u hora; no hay prueba que lo intente |
| **RF-19** Ventas diferidas · Should | HU-16 (S3) | *Pendiente:* `POST /ventas-diferidas` | Ninguna | AC-1 a AC-3 ✗ | No | **No implementado** | La priorización con el agente la subió a Alta, pero no se construyó. La columna `diferida` y `marca_descuadre` existen en el esquema |
| **RF-20** Corte de caja · Should | HU-17 (S3) | **`GET /cortes-caja/vista-previa`**. *Pendiente:* `/cortes-caja` (3) | VC «RF-20-AC-1/AC-2 (vista previa)» | AC-1 ◐ · AC-2 ◐ · AC-3 ✗ | **Sí:** tarjeta «Caja de hoy» del dashboard | **No implementado** | La vista previa suma el efectivo esperado del día y separa la tarjeta (VC: +20.00 en efectivo y +10.00 con tarjeta). Falta el corte en sí: capturar lo contado, calcular la diferencia y guardarlo (AC-1 a medias, AC-3). AC-2 queda a medias porque solo suman las ventas completadas, pero sin cancelación no se puede probar. Es una de las métricas de éxito de la clienta («caja cuadrada cada día») |

### EP-05 · Tienda en línea y pedidos

| RF | HU (sprint plan.) | Endpoints | Pruebas | Criterios | Pantalla | Estado | Justificación |
|---|---|---|---|---|---|---|---|
| **RF-21** Catálogo en línea · Must | HU-18 (S4) | *Pendiente:* `GET /catalogo`, `GET /catalogo/{id}` | FE (página con API simulada) | AC-1 a AC-3 ✗ | Sí, `CatalogoPage`, **solo con API simulada** | **No implementado** | La página muestra precio, «Perecedero» y «Agotado» (`docs/capturas/catalogo.png`), pero contra la API simulada. Con el backend real responde 401 y la pantalla dice «Tu sesión terminó», un mensaje engañoso para un visitante sin sesión (`catalogo_backend_real.png`) |
| **RF-22** Pedido anticipado · Must | HU-19 (S4) | **`GET`, `DELETE /carrito`**, **`POST`, `PATCH`, `DELETE /carrito/renglones[/{id}]`**. *Pendiente:* `POST`, `GET /pedidos`, `GET /pedidos/{id}`, `GET /configuracion/publica`, `POST /tareas/expirar-pedidos` | VA «Agregar al carrito», «Más de lo disponible» («Solo hay 12 disponibles»), «Producto restringido» («Producto no disponible en línea»), «Vaciar carrito»; VA «Dueña en el carrito» (403) | AC-5 ✓ · AC-9 ◐ · AC-1 a AC-4, AC-6 a AC-8 ✗ | No | **Parcial** | Solo existe el carrito, guardado en el servidor y exclusivo del Cliente: valida la disponible y rechaza restringidos. No se puede crear el pedido, así que no hay apartado, envío, mínimo ni expiración. AC-9 se cumple en el carrito, pero el criterio habla del pedido |
| **RF-23** Pago en línea · Must | HU-20 (S4) | *Pendiente:* `POST /pedidos/{id}/pago`, `POST /webhooks/pagos`, `POST /tareas/conciliar-pagos` | Ninguna | AC-1 a AC-7 ✗ | No | **No implementado** | No hay `ServicioPagos`, ni adaptador de Mercado Pago, ni el simulado. Depende de RF-22 |
| **RF-24** Estados del pedido · Must | HU-21 (S5) | *Pendiente:* `/pedidos/{id}/asignacion`, `/transiciones`, `/historial`, `/cancelaciones`, `POST /tareas/marcar-no-recogidos` | Ninguna | AC-1 a AC-8 ✗ | Tarjeta «Pedidos» sin funcionalidad | **No implementado** | Depende de RF-22 y RF-23 |
| **RF-25** Faltantes y reembolso parcial · Should | HU-22 (S6) | *Pendiente:* `/pedidos/{id}/faltantes`, `.../decision`, `POST /tareas/resolver-faltantes-vencidos` | Ninguna | AC-1 a AC-5 ✗ | No | **No implementado** | Segundo en el orden de recorte |
| **RF-26** Seguimiento y cancelación por el cliente · Must | HU-23 (S5) | *Pendiente:* `GET /mis-pedidos`, `GET /mis-pedidos/{id}`, `POST /mis-pedidos/{id}/cancelaciones` | Ninguna | AC-1 a AC-4 ✗ | No | **No implementado** | Depende de RF-22 |
| **RF-27** Reembolsos y no recogidos · Must | HU-24 (S5) | *Pendiente:* `/reembolsos` (3), `POST /pedidos/{id}/resolucion` | Ninguna | AC-1 a AC-4 ✗ | No | **No implementado** | Depende de RF-23 |

### Fase 2

| RF | HU | Endpoints | Estado | Justificación |
|---|---|---|---|---|
| **RF-30** POS sin conexión | Ninguna | Ninguno (así está en el contrato) | **Fuera del MVP** | El SRS lo deja en Fase 2 y no tiene criterios. En el MVP la necesidad se cubre con RF-19, que tampoco se implementó, así que la operación sin internet sigue sin resolverse |

## 4. Requerimientos no funcionales con evidencia

Fuera del alcance obligatorio de la matriz, pero dan soporte a los RF de arriba.

| RNF | Evidencia | Estado |
|---|---|---|
| RNF-04 Seguridad (bcrypt, JWT, cuenta activa) | VA BD «Contraseñas guardadas con bcrypt ($2b$, costo 12)», «JWT de la Dueña dura 60 min», «Token expirado», «Token con alg none»; `S05_S06_A2/revision_seguridad.md` | Cumplido, salvo la expiración por 15 min de inactividad, que no se implementó |
| RNF-05 Control de acceso, también por acceso directo | VR (0 diferencias con el contrato), PS | Cumplido en los endpoints que existen |
| RNF-06 Cero sobreventas | VC: 50 cobros simultáneos sobre 10 unidades → 10 × 200, 40 × 409, existencia final 0 | Cumplido en el POS. Falta el lado de pedidos |
| RNF-07 Auditoría | VA BD «Auditoría escrita en la misma transacción» | Cumplido en las operaciones que existen |
| RNF-09 Usabilidad responsiva | `frontend/.../docs/accesibilidad.md` (9 problemas WCAG corregidos, axe-core sin violaciones); `dashboard_movil_empleado.png` a 375 px; prueba de axe-core en `ProductosPage.test.tsx` | Cumplido en las pantallas que existen |
| RNF-16 OpenAPI con IDs y cobertura ≥ 70 % | El contrato tiene `x-acceptance-criteria` en las 109 operaciones; **no hay medición de cobertura** | Parcial |
| RNF-01 a 03, 11 a 13 | Sin pruebas de carga (k6) ni pruebas con la clienta | No verificado |

## 5. Hallazgos que salieron al construir la matriz

1. **Brecha frontend-backend.** La capa de servicios del frontend tiene una función por cada una de las 109 operaciones del contrato (lo prueba `cobertura.test.ts`), y las pantallas se probaron contra la API simulada. Con el backend real, el catálogo y las dos tarjetas del dashboard fallaban. Se trabajó **contra el contrato** en paralelo, pero el backend no alcanzó las rutas que el frontend ya consumía. En el sprint de cierre se implementaron `GET /alertas` y `GET /cortes-caja/vista-previa`; el catálogo sigue pendiente.
2. **La cantidad sugerida de la alerta no seguía la fórmula del SRS** (`ventas.py`, `_actualizar_alerta_reorden` usaba `2 × PR − disponible`). Se corrigió a `PR − disponible + 1`, que es la del SRS mientras no exista el CDP, y VC lo verifica.
3. **Mensajes que difieren del SRS** en RF-02-AC-2, RF-03-AC-3, RF-05-AC-2 y RF-08-AC-2. El código HTTP es el correcto. Las pruebas comparan el texto exacto solo en algunos casos.
4. **`/catalogo` debe agregarse a `RUTAS_PUBLICAS`** cuando se implemente (ya lo advertía `revision_seguridad.md`). Mientras tanto, el frontend traduce el 401 como «Tu sesión terminó».
5. **Reproducibilidad de las pruebas.** `verificar_api.py` tiene la contraseña de la base fija (`postgresql://tiendinet:tiendinet@...`) y sus dependencias (`httpx`, `pyyaml`, `openapi-schema-validator`) no están en `requirements.txt`. `backend/README.md` indicaba `psql -f ../esquema_bd.sql`, pero el archivo está en `S05_S06_A1/` (ya se corrigió). El `README.md` raíz documenta la contraseña fija y las dependencias.
6. **No hay suite pytest ni medición de cobertura**, lo que deja sin cumplir el punto 2 de la DoD y RNF-16.
7. **Ciclo de redirección por rol** (salió en el sprint de cierre). Con la primera ruta solo para el Dueño (`/productos`), un Empleado que entraba quedaba rebotando entre la ruta protegida y el login, porque el login lo regresaba a la página pedida. `RutaProtegida` ahora manda al inicio del portal a quien tiene sesión pero no el rol, y `ProductosPage.test.tsx` lo prueba.

## 6. Cómo reproducir la evidencia

Con la base recién cargada y la API corriendo (pasos en el `README.md` raíz):

```bash
cd backend && source .venv/bin/activate
python verificar_api.py http://localhost:8000 ../S09_A1/openapi_equipo.yaml            # 147/147
python verificar_roles.py ../S09_A1/openapi_equipo.yaml                                # 0 diferencias
python ../S11_A1/evidencia/verificacion_complementaria.py                              # 18/18
cd ../frontend/tiendinet-frontend && npm test                                          # 49/49
```
