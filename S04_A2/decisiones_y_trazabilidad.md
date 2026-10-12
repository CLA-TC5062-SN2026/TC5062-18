# Decisiones de diseño y trazabilidad de la API

| Campo | Valor |
|---|---|
| **Contrato** | `openapi.yaml` (OpenAPI 3.0.3, 57 rutas, 74 operaciones) |
| **Fuente de criterios** | `SRS_equipo.md` v2.0, 131 criterios `RF-XX-AC-Y` |
| **Fecha** | 2026-10-11 |
| **Cómo se generó la tabla** | Un script lee `x-acceptance-criteria` de cada operación del YAML y lo cruza con los IDs del SRS; la tabla no se capturó a mano, así que no puede desalinearse del contrato. |

---

## Sección A — Trazabilidad spec ↔ criterios de aceptación

**Leyenda.** ✅ cubierto por la API · ⚠️ parcial: la API cubre su parte y el resto es del portal · ➖ fuera del alcance de la API. La columna **Respuesta esperada** es el código HTTP que verificará la prueba `test_RF_XX_AC_Y` en S09; cuando hay varios, son los de los distintos endpoints o escenarios del criterio.

### A.1 Resumen

| Estado | Criterios | % |
|---|---|---|
| ✅ Cubierto por la API | 127 | 96.9 % |
| ⚠️ Parcial (la API cubre su parte; el resto es del portal) | 3 | 2.3 % |
| ➖ Fuera del alcance de la API | 1 | 0.8 % |
| **Total** | **131** | 100 % |
Ningún criterio quedó sin decisión: los 4 que no son ✅ se explican en A.3.

### A.2 Tabla completa
#### Acceso (RF-01 a RF-03)

| ID criterio | Descripción resumida | Endpoint | Método HTTP | Respuesta esperada | ¿Cubierto? |
|---|---|---|---|---|---|
| RF-01-AC-1 | Login válido devuelve JWT con rol | `/sesiones`<br>`/usuarios/me` | POST<br>GET | 200 | ✅ |
| RF-01-AC-2 | Contraseña incorrecta o usuario inactivo: mensaje genérico | `/sesiones` | POST | 401 | ✅ |
| RF-01-AC-3 | Empleado no ve costos/ofertas ni cambia precio o PR | `/productos/{productoId}`<br>`/productos/{productoId}/costo`<br>`/productos/{productoId}/ofertas`<br>`/productos/{productoId}/punto-reorden` | PATCH<br>GET<br>GET<br>PATCH | 403 | ✅ |
| RF-01-AC-4 | Cliente no puede usar endpoints de la tienda | `/ventas` | POST | 403 | ✅ |
| RF-01-AC-5 | 5 fallos de correo + IP bloquean 15 min | `/sesiones` | POST | 429 | ✅ |
| RF-01-AC-6 | Sin sesión no hay pedidos; catálogo sí es público | `/catalogo/productos`<br>`/pedidos`<br>`/pedidos/{folio}` | GET<br>POST<br>GET | 401 / 200 | ⚠️ parcial |
| RF-02-AC-1 | Registro de cliente con datos válidos | `/clientes` | POST | 201 | ✅ |
| RF-02-AC-2 | Correo ya registrado | `/clientes` | POST | 409 | ✅ |
| RF-02-AC-3 | Enlace de recuperación de un solo uso y 30 min | `/restablecimientos-contrasena`<br>`/solicitudes-recuperacion` | POST<br>POST | 202 / 204 / 410 | ✅ |
| RF-03-AC-1 | Dueño crea co-dueña; recibe correo de activación | `/restablecimientos-contrasena`<br>`/usuarios`<br>`/usuarios`<br>`/usuarios/{usuarioId}` | POST<br>GET<br>POST<br>GET | 201 / 204 | ✅ |
| RF-03-AC-2 | Empleado desactivado con JWT vigente | `/usuarios/{usuarioId}` | PATCH | 401 | ✅ |
| RF-03-AC-3 | No se puede desactivar al último Dueño | `/usuarios/{usuarioId}` | PATCH | 409 | ✅ |

#### Catálogo e inventario (RF-04 a RF-09)

| ID criterio | Descripción resumida | Endpoint | Método HTTP | Respuesta esperada | ¿Cubierto? |
|---|---|---|---|---|---|
| RF-04-AC-1 | Alta de producto: activo con existencia 0 | `/categorias`<br>`/productos`<br>`/productos` | POST<br>GET<br>POST | 201 | ✅ |
| RF-04-AC-2 | Código de barras duplicado | `/productos` | POST | 409 | ✅ |
| RF-04-AC-3 | Nombre + presentación duplicados | `/productos` | POST | 409 | ✅ |
| RF-04-AC-4 | Dato obligatorio faltante o precio/costo negativo | `/productos`<br>`/productos/{productoId}` | POST<br>PATCH | 422 | ✅ |
| RF-04-AC-5 | Producto desactivado sale del POS y del catálogo | `/catalogo/productos`<br>`/productos`<br>`/productos/{productoId}`<br>`/productos/{productoId}` | GET<br>GET<br>GET<br>PATCH | 200 | ✅ |
| RF-05-AC-1 | Recepción suma existencia y crea lote | `/lotes/{loteId}`<br>`/recepciones` | GET<br>POST | 201 | ✅ |
| RF-05-AC-2 | Perecedero sin fecha de caducidad | `/recepciones` | POST | 422 | ✅ |
| RF-05-AC-3 | Costo enviado por Empleado se ignora | `/recepciones` | POST | 201 | ✅ |
| RF-05-AC-4 | Recepción de proveedor de ruta sin oferta | `/proveedores`<br>`/proveedores`<br>`/recepciones` | GET<br>POST<br>POST | 201 | ✅ |
| RF-06-AC-1 | Merma de un lote caducado; no cuenta en CDP | `/ajustes-inventario` | POST | 201 | ✅ |
| RF-06-AC-2 | Conteo menor: ajuste −2 con FEFO, quita descuadre | `/ajustes-inventario` | POST | 201 | ✅ |
| RF-06-AC-3 | Conteo mayor: ajuste +3 al lote más reciente | `/ajustes-inventario` | POST | 201 | ✅ |
| RF-06-AC-4 | Sin motivo o merma mayor que el lote | `/ajustes-inventario` | POST | 422 | ✅ |
| RF-07-AC-1 | Consulta de lotes con cantidad y fecha | `/productos/{productoId}/lotes` | GET | 200 | ✅ |
| RF-07-AC-2 | Proceso de 7:00 lista lotes por caducar y avisa | `/lotes`<br>`/procesos/{proceso}/ejecuciones`<br>`/procesos/{proceso}/ejecuciones/{ejecucionId}` | GET<br>POST<br>GET | 202 / 200 | ✅ |
| RF-07-AC-3 | Lote caducado: estado CADUCADO, no disponible | `/ajustes-inventario`<br>`/lotes`<br>`/procesos/{proceso}/ejecuciones` | POST<br>GET<br>POST | 202 / 200 | ✅ |
| RF-07-AC-4 | Un lote que caduca hoy se vende hoy | `/ventas` | POST | 201 | ✅ |
| RF-08-AC-1 | PR entero ≥ 0 se guarda | `/productos/{productoId}/punto-reorden` | PATCH | 200 | ✅ |
| RF-08-AC-2 | PR negativo, decimal o no numérico | `/productos/{productoId}/punto-reorden` | PATCH | 422 | ✅ |
| RF-08-AC-3 | PR calculado = ⌈CDP × (entrega + seguridad)⌉ = 16 | `/procesos/{proceso}/ejecuciones`<br>`/procesos/{proceso}/ejecuciones/{ejecucionId}`<br>`/productos/{productoId}/punto-reorden` | POST<br>GET<br>GET | 202 / 200 | ✅ |
| RF-08-AC-4 | Menos de 14 días de historial: conserva PR inicial | `/procesos/{proceso}/ejecuciones`<br>`/productos/{productoId}/punto-reorden` | POST<br>GET | 202 / 200 | ✅ |
| RF-08-AC-5 | PR manual con vigencia tiene prioridad | `/procesos/{proceso}/ejecuciones`<br>`/productos/{productoId}/punto-reorden` | POST<br>PATCH | 200 / 202 | ✅ |
| RF-08-AC-6 | Sin oferta vigente: días de respaldo o se conserva PR | `/procesos/{proceso}/ejecuciones`<br>`/productos/{productoId}/punto-reorden` | POST<br>GET | 202 / 200 | ✅ |
| RF-08-AC-7 | Detalle muestra origen, CDP, historial y días | `/productos/{productoId}/punto-reorden` | GET | 200 | ✅ |
| RF-09-AC-1 | Venta deja disponible ≤ PR: alerta y correo | `/alertas`<br>`/ventas` | GET<br>POST | 201 / 200 | ✅ |
| RF-09-AC-2 | Apartado de pedido pagado dispara alerta | `/alertas`<br>`/webhooks/mercado-pago` | GET<br>POST | 200 | ✅ |
| RF-09-AC-3 | Disponible sobre el PR: sin alerta | `/alertas`<br>`/ventas` | GET<br>POST | 201 / 200 | ✅ |
| RF-09-AC-4 | Alerta activa no se duplica; se actualiza | `/alertas` | GET | 200 | ✅ |
| RF-09-AC-5 | Recepción, cancelación o expiración resuelve la alerta | `/alertas`<br>`/pedidos/{folio}/transiciones`<br>`/procesos/{proceso}/ejecuciones`<br>`/recepciones`<br>`/ventas/{folio}/cancelacion` | GET<br>POST<br>POST<br>POST<br>POST | 201 / 202 / 200 | ✅ |

#### Proveedores y compras (RF-10 a RF-14)

| ID criterio | Descripción resumida | Endpoint | Método HTTP | Respuesta esperada | ¿Cubierto? |
|---|---|---|---|---|---|
| RF-10-AC-1 | Sincroniza A y B con esquemas distintos | `/sincronizaciones`<br>`/sincronizaciones/{sincronizacionId}` | POST<br>GET | 202 / 200 | ✅ |
| RF-10-AC-2 | Registros inválidos se rechazan con motivo | `/sincronizaciones`<br>`/sincronizaciones/{sincronizacionId}` | POST<br>GET | 200 | ✅ |
| RF-10-AC-3 | Costo actualizado no cambia precio de venta | `/sincronizaciones`<br>`/sincronizaciones/{sincronizacionId}` | POST<br>GET | 200 | ✅ |
| RF-10-AC-4 | Código sin ficha va a 'Productos por vincular' | `/productos-por-vincular`<br>`/productos-por-vincular/{productoPorVincularId}/vinculacion` | GET<br>POST | 200 / 201 | ✅ |
| RF-10-AC-5 | BD de proveedor caída: error en resumen | `/sincronizaciones`<br>`/sincronizaciones`<br>`/sincronizaciones/{sincronizacionId}` | GET<br>POST<br>GET | 200 | ✅ |
| RF-11-AC-1 | Oferta manual aparece con origen Manual | `/ofertas`<br>`/ofertas/{ofertaId}`<br>`/productos/{productoId}/ofertas`<br>`/proveedores` | POST<br>PATCH<br>GET<br>POST | 201 / 200 | ✅ |
| RF-11-AC-2 | Oferta manual de 8 días: No vigente | `/ofertas/{ofertaId}`<br>`/productos/{productoId}/ofertas` | PATCH<br>GET | 200 | ✅ |
| RF-12-AC-1 | Costo por unidad base y etiquetas | `/productos/{productoId}/ofertas` | GET | 200 | ✅ |
| RF-12-AC-2 | Oferta vencida o sin existencia al final | `/productos/{productoId}/ofertas` | GET | 200 | ✅ |
| RF-12-AC-3 | Un solo proveedor: mensaje | `/productos/{productoId}/ofertas` | GET | 200 | ✅ |
| RF-13-AC-1 | Sin urgencia sugiere menor costo | `/productos/{productoId}/sugerencia-proveedor` | GET | 200 | ✅ |
| RF-13-AC-2 | Con urgencia sugiere menos días | `/productos/{productoId}/sugerencia-proveedor` | GET | 200 | ✅ |
| RF-13-AC-3 | Empate de costo se resuelve por días | `/productos/{productoId}/sugerencia-proveedor` | GET | 200 | ✅ |
| RF-13-AC-4 | Asignar proveedor preferido; precio no cambia | `/procesos/{proceso}/ejecuciones`<br>`/productos/{productoId}` | POST<br>PATCH | 200 | ✅ |
| RF-13-AC-5 | Ninguna oferta con existencia suficiente | `/productos/{productoId}/sugerencia-proveedor` | GET | 200 | ✅ |
| RF-14-AC-1 | Propuesta incluye solo productos ≤ PR | `/propuestas-compra` | POST | 201 | ✅ |
| RF-14-AC-2 | Editar renglones sin tocar inventario | `/propuestas-compra/{propuestaId}`<br>`/propuestas-compra/{propuestaId}/renglones` | GET<br>PUT | 200 | ✅ |
| RF-14-AC-3 | Nada por reabastecer | `/propuestas-compra` | POST | 422 | ✅ |

#### Punto de venta (RF-15 a RF-20)

| ID criterio | Descripción resumida | Endpoint | Método HTTP | Respuesta esperada | ¿Cubierto? |
|---|---|---|---|---|---|
| RF-15-AC-1 | Búsqueda parcial 'frij' | `/productos` | GET | 200 | ✅ |
| RF-15-AC-2 | Búsqueda por código de barras exacto | `/productos` | GET | 200 | ✅ |
| RF-15-AC-3 | Sin coincidencias: lista vacía | `/productos` | GET | 200 | ✅ |
| RF-16-AC-1 | Venta en efectivo: folio, total, cambio, descuento | `/ventas` | POST | 201 | ✅ |
| RF-16-AC-2 | Quitar renglón recalcula total antes de confirmar | — (frontend) | — | — | ➖ fuera de la API |
| RF-16-AC-3 | Efectivo recibido menor al total | `/ventas` | POST | 422 | ✅ |
| RF-16-AC-4 | Venta con tarjeta sin cambio | `/ventas` | POST | 201 | ✅ |
| RF-16-AC-5 | Todo está apartado: rechaza toda la venta | `/ventas` | POST | 409 | ✅ |
| RF-16-AC-6 | Dos operaciones paralelas por la última unidad | `/pedidos`<br>`/ventas` | POST<br>POST | 201 + 409 | ✅ |
| RF-16-AC-7 | Cantidad 0, negativa o decimal | `/ventas` | POST | 422 | ✅ |
| RF-17-AC-1 | Comprobante con todos sus datos | `/ventas`<br>`/ventas/{folio}` | GET<br>GET | 200 | ✅ |
| RF-17-AC-2 | Comprobante conserva precio histórico | `/ventas/{folio}` | GET | 200 | ✅ |
| RF-17-AC-3 | Comprobante de venta cancelada | `/ventas/{folio}` | GET | 200 | ✅ |
| RF-18-AC-1 | Otro usuario cancela; reintegra a lotes de origen | `/ventas/{folio}/cancelacion` | POST | 201 | ✅ |
| RF-18-AC-2 | Cancelar dos veces | `/ventas/{folio}/cancelacion` | POST | 409 | ✅ |
| RF-18-AC-3 | Venta de un corte cerrado | `/ventas/{folio}/cancelacion` | POST | 409 | ✅ |
| RF-18-AC-4 | No se modifica responsable, fecha ni hora | `/ventas/{folio}` | PUT / PATCH / DELETE | 405 | ✅ |
| RF-19-AC-1 | Venta diferida con hora real cuenta en su día | `/reportes/ventas-diarias`<br>`/ventas` | GET<br>POST | 201 | ✅ |
| RF-19-AC-2 | Diferida excede disponible: marca descuadre | `/ventas` | POST | 201 | ✅ |
| RF-19-AC-3 | Fecha de más de 3 días o futura | `/ventas` | POST | 422 | ✅ |
| RF-20-AC-1 | Corte: esperado, contado, diferencia y tarjeta | `/cortes`<br>`/cortes/actual` | POST<br>GET | 200 / 201 | ✅ |
| RF-20-AC-2 | Venta cancelada no suma al corte | `/cortes`<br>`/cortes/actual`<br>`/ventas` | POST<br>GET<br>GET | 200 | ✅ |
| RF-20-AC-3 | Corte guardado bloquea cancelaciones | `/cortes`<br>`/cortes`<br>`/cortes/{corteId}` | GET<br>POST<br>GET | 201 | ✅ |

#### Tienda en línea (RF-21 a RF-27)

| ID criterio | Descripción resumida | Endpoint | Método HTTP | Respuesta esperada | ¿Cubierto? |
|---|---|---|---|---|---|
| RF-21-AC-1 | Búsqueda 'leche' sin costo ni existencia exacta | `/catalogo/productos`<br>`/catalogo/productos/{productoId}`<br>`/categorias` | GET<br>GET<br>GET | 200 | ✅ |
| RF-21-AC-2 | Producto restringido no aparece | `/catalogo/productos`<br>`/catalogo/productos/{productoId}` | GET<br>GET | 200 | ✅ |
| RF-21-AC-3 | Disponible 0: 'Agotado' y no se agrega | `/carrito/renglones/{productoId}`<br>`/catalogo/productos` | PUT<br>GET | 200 / 409 | ✅ |
| RF-22-AC-1 | Recoger en tienda: folio, apartado, envío $0 | `/pedidos` | POST | 201 | ✅ |
| RF-22-AC-2 | Envío ≥ $150 con CP atendido suma $25 | `/pedidos` | POST | 201 | ✅ |
| RF-22-AC-3 | Envío con subtotal menor al mínimo | `/pedidos` | POST | 422 | ✅ |
| RF-22-AC-4 | Código postal no atendido | `/pedidos` | POST | 422 | ✅ |
| RF-22-AC-5 | Agregar más de lo disponible al carrito | `/carrito/renglones/{productoId}` | PUT | 409 | ✅ |
| RF-22-AC-6 | Carrito vacío, sin modalidad o sin dirección | `/carrito`<br>`/carrito/renglones/{productoId}`<br>`/pedidos` | DELETE<br>DELETE<br>POST | 422 | ✅ |
| RF-22-AC-7 | Pagado después de 19:00: entrega mañana | `/pedidos`<br>`/pedidos/{folio}`<br>`/webhooks/mercado-pago` | GET<br>GET<br>POST | 200 | ✅ |
| RF-22-AC-8 | 15 min sin pago: Expirado y libera apartado | `/procesos/{proceso}/ejecuciones` | POST | 202 / 200 | ✅ |
| RF-22-AC-9 | Producto restringido vía API | `/carrito/renglones/{productoId}`<br>`/pedidos` | PUT<br>POST | 422 | ✅ |
| RF-23-AC-1 | Webhook aprobado por monto exacto: Pagado | `/pedidos/{folio}/pagos`<br>`/webhooks/mercado-pago` | GET<br>POST | 200 | ✅ |
| RF-23-AC-2 | Pago de pedido expirado: re-aparta o reembolsa | `/webhooks/mercado-pago` | POST | 200 | ✅ |
| RF-23-AC-3 | Webhook perdido: lo resuelve la conciliación | `/procesos/{proceso}/ejecuciones` | POST | 202 / 200 | ✅ |
| RF-23-AC-4 | Pago rechazado: sigue pendiente, carrito intacto | `/carrito`<br>`/pedidos/{folio}/pagos`<br>`/pedidos/{folio}/pagos`<br>`/webhooks/mercado-pago` | GET<br>GET<br>POST<br>POST | 200 | ✅ |
| RF-23-AC-5 | Firma inválida / webhook duplicado | `/webhooks/mercado-pago` | POST | 401 / 200 | ✅ |
| RF-23-AC-6 | Monto no coincide: alerta al Dueño | `/webhooks/mercado-pago` | POST | 200 | ✅ |
| RF-23-AC-7 | Solo existe pago en línea | `/pedidos/{folio}/pagos` | POST | 201 | ⚠️ parcial |
| RF-24-AC-1 | Sin empleado asignado no pasa a En preparación | `/pedidos/{folio}`<br>`/pedidos/{folio}/transiciones` | PATCH<br>POST | 409 / 200 | ✅ |
| RF-24-AC-2 | Recolección no puede ir 'En camino' | `/pedidos/{folio}/transiciones` | POST | 409 | ✅ |
| RF-24-AC-3 | Envío: En camino y luego Entregado | `/pedidos/{folio}/transiciones`<br>`/pedidos/{folio}/transiciones` | GET<br>POST | 201 | ✅ |
| RF-24-AC-4 | Pagado directo a Entregado | `/pedidos/{folio}/transiciones` | POST | 409 | ✅ |
| RF-24-AC-5 | Entregado es estado final | `/pedidos/{folio}/transiciones` | POST | 409 | ✅ |
| RF-24-AC-6 | Entregado descuenta FEFO y libera apartado | `/pedidos/{folio}/transiciones` | POST | 201 | ✅ |
| RF-24-AC-7 | 20:00 de D+1: No recogido | `/procesos/{proceso}/ejecuciones` | POST | 202 / 200 | ✅ |
| RF-24-AC-8 | Empleado no puede cancelar pedido | `/pedidos/{folio}/transiciones` | POST | 403 | ✅ |
| RF-25-AC-1 | Marcar faltante: Esperando respuesta + correo | `/pedidos/{folio}/renglones/{renglonId}/faltante` | PUT | 200 | ✅ |
| RF-25-AC-2 | Cliente elige reembolso del faltante | `/pedidos/{folio}/renglones/{renglonId}/faltante/respuesta` | PUT | 200 | ✅ |
| RF-25-AC-3 | Cliente elige sustituto de menor precio | `/pedidos/{folio}/renglones/{renglonId}/faltante/respuesta` | PUT | 200 / 409 | ✅ |
| RF-25-AC-4 | Sin respuesta en 30 min: reembolso automático | `/procesos/{proceso}/ejecuciones` | POST | 202 / 200 | ✅ |
| RF-25-AC-5 | Subtotal baja del mínimo: envío no se reembolsa | `/pedidos/{folio}/renglones/{renglonId}/faltante/respuesta` | PUT | 200 | ✅ |
| RF-26-AC-1 | Mis pedidos del más reciente al más antiguo | `/pedidos`<br>`/pedidos/{folio}`<br>`/pedidos/{folio}/transiciones` | GET<br>GET<br>GET | 200 | ✅ |
| RF-26-AC-2 | Cliente cancela pedido Pagado: reembolso total | `/pedidos/{folio}/transiciones` | POST | 201 | ✅ |
| RF-26-AC-3 | Cliente no cancela En preparación o posterior | `/pedidos/{folio}/transiciones` | POST | 409 | ⚠️ parcial |
| RF-26-AC-4 | Pedido de otro cliente | `/pedidos`<br>`/pedidos/{folio}` | GET<br>GET | 404 | ✅ |
| RF-27-AC-1 | Reembolso confirmado por webhook o conciliación | `/procesos/{proceso}/ejecuciones`<br>`/reembolsos`<br>`/reembolsos/{reembolsoId}`<br>`/webhooks/mercado-pago` | POST<br>GET<br>GET<br>POST | 200 | ✅ |
| RF-27-AC-2 | Reembolso rechazado: Fallido y reintento | `/reembolsos`<br>`/reembolsos/{reembolsoId}/reintentos`<br>`/webhooks/mercado-pago` | GET<br>POST<br>POST | 200 / 202 | ✅ |
| RF-27-AC-3 | Resolución de No recogido; monto > pagado | `/pedidos/{folio}/resolucion` | POST | 201 / 422 | ✅ |
| RF-27-AC-4 | Segunda resolución | `/pedidos/{folio}/resolucion` | POST | 409 | ✅ |

#### Administración (RF-28 a RF-29)

| ID criterio | Descripción resumida | Endpoint | Método HTTP | Respuesta esperada | ¿Cubierto? |
|---|---|---|---|---|---|
| RF-28-AC-1 | Días de seguridad 3 aplican al siguiente cálculo | `/configuracion`<br>`/configuracion`<br>`/procesos/{proceso}/ejecuciones` | GET<br>PATCH<br>POST | 200 | ✅ |
| RF-28-AC-2 | Días de seguridad fuera de 0–14 | `/configuracion` | PATCH | 422 | ✅ |
| RF-28-AC-3 | Nuevo costo de envío solo a pedidos nuevos | `/configuracion`<br>`/pedidos` | PATCH<br>POST | 200 / 201 | ✅ |
| RF-28-AC-4 | CP agregado se acepta en envío | `/configuracion`<br>`/pedidos` | PATCH<br>POST | 200 / 201 | ✅ |
| RF-29-AC-1 | Reporte diario por canal, cancelaciones y neto | `/reportes/ventas-diarias` | GET | 200 | ✅ |
| RF-29-AC-2 | Rotación A, B, C sin canceladas | `/reportes/rotacion` | GET | 200 | ✅ |
| RF-29-AC-3 | Indicadores: faltantes, diferencia, pedidos | `/reportes/indicadores` | GET | 200 | ✅ |
| RF-29-AC-4 | Periodo sin movimientos | `/reportes/indicadores`<br>`/reportes/ventas-diarias` | GET<br>GET | 200 | ✅ |
| RF-29-AC-5 | Empleado consulta reportes | `/reportes/indicadores`<br>`/reportes/rotacion`<br>`/reportes/ventas-diarias` | GET<br>GET<br>GET | 403 | ✅ |

### A.3 Criterios parciales o fuera de alcance: decisión

| Criterio | Estado | Decisión |
|---|---|---|
| RF-01-AC-6 | ⚠️ | La API responde 401 y el catálogo es público (`security: []`). La redirección a la pantalla de inicio de sesión la hace el portal. |
| RF-16-AC-2 | ➖ | Fuera del alcance de la API: la venta en curso vive en el Portal Tienda; el total se recalcula en el cliente con precios de `GET /productos`. Se verifica con prueba de componente del frontend (Vitest). |
| RF-23-AC-7 | ⚠️ | La API solo ofrece pago en línea (no hay método "efectivo al recoger" en el contrato). Que la pantalla muestre solo esa opción es responsabilidad del portal. |
| RF-26-AC-3 | ⚠️ | La API responde 409. Ocultar la opción "Cancelar" es responsabilidad del portal (usa `estado`). |

**¿Falta un endpoint o está fuera del alcance de la API?** En los cuatro casos el criterio describe un comportamiento de **interfaz** (redirigir, ocultar una opción, mostrar solo una forma de pago, recalcular un total en pantalla). La API ya hace cumplir la regla de negocio (401, 409, pago solo en línea), así que agregar endpoints solo para esas pantallas duplicaría lógica. Esos criterios se probarán en el frontend (S09).

**Hueco del borrador corregido.** El borrador del agente no tenía endpoint para RF-07-AC-4 ni RF-18-AC-4; ahora están en `POST /ventas` y en la inmutabilidad de `/ventas/{folio}` (405), respectivamente.

### A.4 Criterios cubiertos con efectos fuera de la respuesta HTTP

Estos criterios tienen endpoint, pero parte de su resultado (un correo o un proceso de reloj) ocurre en el worker. Para que las pruebas no esperen al reloj, cada proceso se puede disparar con `POST /procesos/{proceso}/ejecuciones` y, fuera de producción, con `fechaReferencia`.

| Criterio | Nota |
|---|---|
| RF-03-AC-1 | Correo de activación vía outbox del worker (Mailpit). |
| RF-07-AC-2 | Correo resumen vía worker; `POST /procesos/CADUCIDADES/ejecuciones` para probarlo sin esperar a las 7:00. |
| RF-08-AC-3 | Proceso PUNTO_REORDEN. |
| RF-09-AC-1 | Correo vía outbox del worker. |
| RF-16-AC-6 | Prueba de integración concurrente (bloqueo por fila). |
| RF-22-AC-8 | Proceso EXPIRACION_PEDIDOS. |
| RF-23-AC-1 | Correo al cliente vía outbox. |
| RF-23-AC-3 | Proceso CONCILIACION_PAGOS. |
| RF-24-AC-7 | Proceso NO_RECOGIDOS. |
| RF-25-AC-4 | Proceso FALTANTES_VENCIDOS. |

---

## Sección B — Decisiones de diseño

### B.1 ¿Por qué estos recursos y endpoints? ¿Cuáles quedaron fuera?

**Criterio general.** Los recursos salen del **diagrama de clases** de S04-A1 y las rutas se anidan según sus relaciones:

- **Composición → sub-recurso anidado.** El hijo no existe sin el padre: `/pedidos/{folio}/transiciones` (`CambioEstadoPedido`), `/pedidos/{folio}/renglones/{renglonId}/faltante`, `/propuestas-compra/{id}/renglones`, `/productos/{productoId}/lotes`. Los renglones de una venta viajan dentro de la venta porque nunca se consultan solos.
- **Asociación → recurso propio con filtro.** Las entidades independientes tienen su colección y se relacionan por query: `/lotes?productoId=`, `/reembolsos?folio=`, `/ventas?sinCorte=true` (D4: la venta no pertenece al corte).
- **Singleton por contexto.** `/configuracion` (una tienda), `/carrito` (uno por cliente), `/cortes/actual`, `/productos/{productoId}/punto-reorden`.
- **Proyecciones distintas para audiencias distintas.** `/catalogo/productos` (público, sin existencia exacta) frente a `/productos` (tienda, sin costos) y `/productos/{productoId}/costo` (solo Dueño). Así se separan tres niveles de confidencialidad (RF-21, RD-06) sin filtrar campos según quién llama.

**Correspondencia con el modelo de dominio**

| Clase (S04-A1) | Recurso en la API | Comentario |
|---|---|---|
| `Usuario`, `PerfilCliente` | `/usuarios`, `/clientes`, `/usuarios/me`, `/sesiones` | El registro de cliente es público y crea Usuario + PerfilCliente (D5) |
| `Producto`, `Categoria` | `/productos`, `/categorias`, `/catalogo/productos` | Sin DELETE: se desactiva con PATCH (RNF-14) |
| `Lote` | `/lotes`, `/productos/{productoId}/lotes`, `/recepciones` | La recepción crea el lote; `/lotes?estadoCaducidad=` reemplaza a `/caducidades` |
| `MovimientoInventario` | `/ajustes-inventario` | Solo se exponen los ajustes manuales; los demás movimientos los genera el sistema |
| `Alerta` | `/alertas` | Solo lectura: las crea y resuelve el sistema (RF-09) |
| `Proveedor`, `Oferta`, `ProductoPorVincular` | `/proveedores`, `/ofertas`, `/productos/{productoId}/ofertas`, `/productos-por-vincular` | |
| `PropuestaCompra` | `/propuestas-compra` | |
| `Venta`, `RenglonVenta` | `/ventas`, `/ventas/{folio}/cancelacion` | Inmutable salvo la cancelación |
| `CorteCaja` | `/cortes`, `/cortes/actual` | |
| `Pedido`, `RenglonPedido`, `CambioEstadoPedido` | `/pedidos`, `/pedidos/{folio}/transiciones`, `…/faltante` | La máquina de estados de RF-24 vive en un solo endpoint |
| `Pago`, `Reembolso` | `/pedidos/{folio}/pagos`, `/reembolsos`, `/webhooks/mercado-pago` | Pedido 0..* pagos y Pago 0..* reembolsos (D2) |
| `Configuracion` | `/configuracion` | |
| `SalidaLote`, `RegistroAuditoria` | — | Internos: se escriben en la misma transacción y ningún criterio pide consultarlos |

**Endpoints que no son entidades del dominio**

| Endpoint | Por qué existe |
|---|---|
| `/carrito` | RF-23-AC-4 exige que el carrito sobreviva a un pago rechazado; en el servidor también sobrevive a cambiar de celular. |
| `/sincronizaciones` | La sincronización puede tardar hasta 60 s (RNF-03): se modela como recurso asíncrono (202 + `Location`) con un resumen consultable (RF-10-AC-2, AC-5). |
| `/procesos/{proceso}/ejecuciones` | Hace verificables los criterios de reloj (RF-07, RF-08, RF-22-AC-8, RF-23-AC-3, RF-24-AC-7, RF-25-AC-4) sin esperar a las 6:00 o a las 20:00. Llama al mismo servicio que el worker. |
| `/reportes/*` | Recursos calculados de solo lectura (RF-29). |

**Fuera del alcance de esta versión del contrato**

| Excluido | Razón |
|---|---|
| Venta sin conexión con sincronización (RF-30) | Fase 2 según el SRS; en el MVP la cubre `POST /ventas` con `fechaHoraReal` (RF-19). |
| `DELETE` de productos, ventas, pedidos y lotes | No hay borrado físico (RD-09, RNF-14): se desactiva, se cancela o se ajusta. |
| Consulta de la auditoría | Ningún criterio la pide; se revisa en BD. Candidato a `GET /auditoria` en v1.1. |
| Editar o borrar proveedores y categorías | Fuera de los criterios; los proveedores sincronizados se configuran en el despliegue. |
| Alta de proveedores sincronizados por API | Requiere un adaptador nuevo (RNF-15), no un registro. |
| Envío de órdenes de compra, CFDI, WhatsApp, multi-tienda, importación CSV | Fuera de alcance del MVP (SRS §1.2). |

### B.2 Patrones de diseño de API incluidos y excluidos

| Patrón | Decisión | Motivación concreta |
|---|---|---|
| **Versionado** | ✅ En la ruta: `/api/v1` | Es visible y fácil de enrutar en Caddy y de probar con curl. El versionado por encabezado (`Accept-Version`) no se ve en los logs del túnel ni en el navegador, y con dos portales propios no hace falta negociar versiones. |
| **Paginación** | ✅ Por número de página: `page`, `pageSize` (máx. 100) y `{datos, paginacion}` | Los portales muestran páginas numeradas y `totalElementos` sirve para "N ventas hoy". La paginación por cursor evita saltos cuando se insertan registros, pero con unas 230 operaciones al día (SRS §2.5) ese riesgo es menor que su costo de implementación. |
| **Filtrado** | ✅ Por query de igualdad y rangos (`estado`, `desde`/`hasta`, `sinCorte`, `bajoPuntoReorden`…) | Solo los filtros que piden los criterios; la lista "Por preparar" (RF-22-AC-7) es un filtro y no un endpoint aparte. |
| **Búsqueda** | ✅ `q` sin distinguir mayúsculas ni acentos | RF-15-AC-1 y RF-21-AC-1. |
| **Ordenamiento configurable** (`sort=`) | ❌ | Cada colección tiene un orden fijo que exige el SRS: pedidos del más reciente (RF-26-AC-1), ofertas por costo por unidad base (RF-12), rotación descendente (RF-29-AC-2). Un `sort` libre permitiría romper esas reglas. |
| **Errores estandarizados** | ✅ Problem Details (RFC 7807) con `codigo` | El frontend y las pruebas comparan `codigo`, no texto; `detail` conserva el mensaje del SRS para la pantalla. |
| **Idempotencia** | ✅ Encabezado `Idempotency-Key` en 6 POST críticos | Internet intermitente (SRS §2.4) + cero sobreventas (RNF-06). Ver H6 de `revision_rest.md`. |
| **Operaciones asíncronas** | ✅ 202 + `Location` | Sincronización, procesos y reintento de reembolso dependen de sistemas externos o tardan. |
| **Actualización parcial** | ✅ `PATCH` con `application/merge-patch+json` | Semántica estándar: `null` borra un campo (por ejemplo, el PR manual). |
| **Control de concurrencia optimista** (ETag / `If-Match`) | ❌ en v1 | La concurrencia crítica (existencias) se resuelve con bloqueo por fila dentro de la transacción. Candidato para `PATCH /configuracion` si co-dueñas editan a la vez. |
| **HATEOAS** (enlaces en las respuestas) | ❌ | Los dos únicos clientes son portales propios generados desde este contrato; los enlaces engordarían cada respuesta sin que nadie los siga. Se conserva lo esencial: `Location` en cada 201 y 202. |
| **Selección de campos** (`fields=`) | ❌ | Las proyecciones ya están separadas por audiencia (catálogo, tienda, costo). |
| **Límite de peticiones** | ⚠️ Solo en `POST /sesiones` (429 + `Retry-After`) | Es lo que pide RF-01-AC-5; un límite global no se justifica con 10 usuarios en el POS. |
| **Webhooks entrantes** | ✅ Firma HMAC, idempotencia y consulta de confirmación a MP | Nunca se confía en el cuerpo de la notificación: se consulta el pago en la API de MP antes de marcarlo como pagado (RF-23-AC-1, AC-6). |

**Otras decisiones puntuales**

| Decisión | Motivación |
|---|---|
| `POST /sesiones` responde **200**, no 201 | El SRS lo fija (RF-01-AC-1) y el token no es un recurso consultable por URI. |
| Pedido ajeno → **404**, no 403 | RF-26-AC-4: un 403 confirmaría que el folio existe y permitiría enumerar pedidos. |
| **409 frente a 422** | 422 = la petición incumple una regla por sí misma (cantidad decimal, CP no atendido). 409 = la petición es válida pero choca con el **estado actual** (stock, transición, duplicado). Así el portal sabe si corregir el formulario o refrescar datos. |
| Enlaces de un solo uso → **410 Gone** | Distingue "enlace vencido" de un error de validación (RF-02-AC-3). |
| `folio` como identificador en la ruta | Es el número que ven la dueña y el cliente en el comprobante; evita exponer un segundo id. |
| Cambios de estado como `POST …/transiciones` y no `PATCH {estado}` | Cada transición tiene autor, fecha y validación propia, y queda en el historial (RF-24). Un PATCH genérico del estado ocultaría que es una operación con reglas. |
| Cancelación de venta como sub-recurso único | `POST /ventas/{folio}/cancelacion` se puede crear una sola vez: el 409 de RF-18-AC-2 sale de la semántica del recurso. |
| `x-roles` en cada operación | Lleva la matriz §3.4 del SRS al contrato; el backend puede generar las dependencias de autorización y las pruebas de 403 a partir de ella. |

### B.3 ¿En qué propuso el agente algo que no seguía buenas prácticas REST? ¿Cómo se detectó?

| Problema del borrador | Cómo se detectó |
|---|---|
| 14 rutas con verbos (`/cancelar`, `/cambiar-estado`, `/activar`…) — H1 | Revisión manual contra la lista de verificación REST: toda ruta debe ser un sustantivo y la acción, el método. |
| Rutas con mayúsculas y camelCase (`/Configuracion`, `/Lotes`) — H2 | Revisión manual del índice de rutas ordenado alfabéticamente: saltan a la vista entre las demás. |
| Búsqueda con `POST` y 404 para "sin resultados" — H3 | Pregunta de control: "¿esta operación cambia algo?". Si no cambia nada, debe ser GET. |
| `PUT` con cuerpos parciales — H4 | Se comparó el esquema del cuerpo con el recurso: `ProductoCrear` sin `required` en un PUT implica reemplazo parcial, que contradice a PUT. |
| 200 en creaciones, 400 donde el SRS dice 422, 403 donde dice 404 — H5 | Contraste línea por línea de los códigos del YAML con los que fija cada criterio del SRS. RF-26-AC-4 (404) y los 422 de RF-04, RF-05 y RF-22 lo evidenciaron. |
| Sin idempotencia en ventas y pedidos — H6 | Contraste con las restricciones del SRS §2.4 (internet intermitente) y RNF-06: se simuló mentalmente "se cae la red después del COMMIT" y el reintento duplicaba la venta. |
| Webhook y catálogo heredando JWT — H7 | Se recorrió el flujo 2 en el diagrama de secuencia: Mercado Pago no tiene JWT. Escribir el diagrama obligó a ver quién llama a cada endpoint. |
| Costos visibles para el Empleado — H8 | Contraste de cada esquema de respuesta con RD-06 y la matriz §3.4. |
| Colecciones sin paginar — H9 | Estimación de volumen con el SRS §2.5: unas 73,000 ventas al año en una sola respuesta. |
| Esquemas sin `required`, sin enums, sin `operationId` — H10 | Redocly (102 avisos) y Spectral (119 avisos) sobre el borrador. |
| Sin versión en la ruta — H11 | Revisión de `servers`. |
| 3 criterios sin endpoint — H12 | Script que cruza `x-acceptance-criteria` con los 131 IDs del SRS. |

**Limitaciones del agente observadas**

1. **Sesgo hacia RPC.** Traduce cada verbo de un requisito ("cancelar", "vincular", "reintentar") directamente a una ruta. Hay que pedirle explícitamente que modele las acciones como recursos.
2. **Valores por defecto en lugar de los del SRS.** Usó 200 y 400 de forma genérica aunque el SRS especifica 201, 409 y 422 por criterio. No contrastó su salida con los criterios que él mismo citaba en `x-acceptance-criteria`.
3. **Sobredeclaró la cobertura.** Marcó como cubiertos criterios de interfaz (RF-01-AC-6, RF-23-AC-7) solo porque el endpoint existía. La revisión los bajó a ⚠️ parcial.
4. **No usa el contexto operativo.** Las restricciones no funcionales del SRS (internet intermitente, volumen, confidencialidad de costos) no se reflejaron en el diseño hasta que se le señalaron.
5. **Esquemas laxos.** Sin `required` ni validaciones, el contrato "pasa" el validador pero no protege nada; un validador sintáctico no detecta este problema.
6. **Validación.** El agente no puede abrir la interfaz web de Swagger Editor. Validó con `openapi-spec-validator`, que usa el mismo esquema oficial de OpenAPI 3.0, y con dos linters. Antes de entregar conviene pegar `openapi.yaml` en <https://editor.swagger.io> como confirmación visual.
