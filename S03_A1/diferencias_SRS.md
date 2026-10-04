# Diferencias entre los SRS individuales y consolidación: TiendiNet

| Campo | Valor |
|---|---|
| Fecha | 02/10/2026 |
| Insumos | `SRS_final` de Ángel Vega, Adrián Cortés, Víctor Jurado y José Ramírez |
| Resultado | `SRS_equipo.md` v2.0 (29 RF en el MVP + 1 en Fase 2, 131 criterios, 16 RNF, 12 RD) |

## 1. Panorama de los SRS individuales

| Integrante | Sistema | RF / AC | Enfoque | Observación |
|---|---|---|---|---|
| Ángel | AbarrotesPOS | 10 / 20 | Solo POS e inventario; efectivo; sin proveedores ni tienda en línea | Alcance distinto al de `proyecto_base.md`. Se aprovechan sus reglas de transaccionalidad, comprobante, auditoría y redondeo. |
| Adrián | TiendiNet | 13 / 30 | Disponible = existencia − apartado; alta de proveedores; comparación por costo, existencia y entrega | Definiciones de dominio muy claras; sin pagos reales ni caducidad. |
| Víctor | TiendiNet | 25 / 85 | Normalización por unidad base, sugerencia, propuesta de compra, granel, corte de caja, matriz de permisos, plan de capacidad | El más completo en POS, permisos y plan de entrega. |
| José | TiendiNet | 22 / 45 + escenarios | Lotes FEFO, PR automático, Mercado Pago con webhooks y conciliación, faltantes, ventas diferidas, validación con clienta real | El más completo en tienda en línea, pagos y perfil de usuario. |

## 2. Consenso (aparece en todos o en los tres SRS de TiendiNet)

| Tema | Quién lo tiene | Requerimiento en `SRS_equipo.md` |
|---|---|---|
| Autenticación y permisos por rol | Todos | RF-01 |
| Catálogo de productos con ficha única | Todos | RF-04 |
| Búsqueda por código de barras y nombre | Todos | RF-15 |
| Venta que descuenta inventario al confirmar | Todos | RF-16 |
| No vender más de lo disponible / sin negativos | Todos | RF-16-AC-5, RF-16-AC-6, RNF-06 |
| Entradas de mercancía | Todos | RF-05 |
| Alerta de inventario bajo | Todos | RF-09 |
| Venta por pieza en MXN, sin facturación | Todos | RD-02, RD-07 |
| Contraseñas con hash | Ángel, Víctor, José | RNF-04 |
| Dos proveedores simulados unificados en BD concentradora | Adrián, Víctor, José | RF-10 |
| Comparación de ofertas entre proveedores | Adrián, Víctor, José | RF-12 |
| Precio de venta solo lo cambia el Dueño | Adrián, Víctor, José | RD-06 |
| Portal de clientes, carrito y pago anticipado | Adrián, Víctor, José | RF-21 a RF-23 |
| Recoger en tienda o envío a domicilio | Adrián, Víctor, José | RF-22, RD-03 |
| Apartado de inventario por pedido | Adrián, Víctor, José | RF-22, RF-24-AC-6 |
| Estados del pedido según modalidad | Adrián, Víctor, José | RF-24 |
| Cliente solo ve sus pedidos | Adrián, Víctor, José | RF-26-AC-4 |

## 3. Gaps (solo uno o algunos lo identificaron) y decisión

| Gap | Lo aportó | Decisión | Dónde quedó |
|---|---|---|---|
| Comprobante consultable con precios históricos | Ángel | Se incluye (Should) | RF-17 |
| Venta transaccional y concurrencia entre sesiones | Ángel, José | Se incluye | RF-16-AC-6, RNF-06 |
| Motivo obligatorio y cantidad anterior/nueva en ajustes | Ángel | Se incluye | RF-06, RNF-07 |
| Reporte diario con neto de cancelaciones | Ángel | Se incluye | RF-29-AC-1 |
| Redondeo aritmético a centavos | Ángel | Se incluye | RD-07 |
| Retención de 12 meses | Ángel, Víctor | Se incluye | RNF-14 |
| Expiración de sesión por inactividad (15 min) | Ángel | Se incluye solo para el Portal Tienda | RNF-04 |
| Ficha única: rechazo de nombre + presentación duplicados | Adrián | Se incluye | RF-04-AC-3 |
| Definición de disponible y alerta sobre disponible | Adrián, José | Se adopta en todo el documento | §1.3, RF-09, RD-12 |
| Alerta también por apartado, no solo por venta | Adrián | Se incluye | RF-09-AC-2 |
| Alta de producto que llega del proveedor | Adrián | Se integra a la vinculación | RF-10-AC-4 |
| Normalización por unidad base y factor de conversión | Víctor | Se incluye | RF-12, S-03 |
| Sugerencia de proveedor con urgencia | Víctor | Se incluye (Should) | RF-13 |
| Propuesta de orden de compra | Víctor | Se incluye (Could) | RF-14 |
| Corte de caja | Víctor | Se incluye (decisión de equipo) | RF-20 |
| Asignación de empleado al pedido | Víctor | Se incluye | RF-24-AC-1 |
| Matriz de permisos y datos mínimos | Víctor | Se incluye y se amplía | §3.4, §3.5 |
| Rotación e indicadores | Víctor | Se incluye | RF-29 |
| Navegadores Safari iOS y disponibilidad 99 % | Víctor | Se incluye | RNF-08, RNF-13 |
| Plan de entrega y riesgos | Víctor | Se adapta | §4 |
| Lotes con FEFO y alertas de caducidad | José | Se incluye (decisión de equipo) | RF-07, RD-10 |
| Ventas diferidas y marca de descuadre | José | Se incluye (decisión de equipo) | RF-19 |
| Faltantes, sustituto y reembolso parcial | José | Se incluye (decisión de equipo) | RF-25 |
| Webhooks, conciliación, firma y monto | José | Se incluye | RF-23 |
| Reembolsos con estados Solicitado/Confirmado/Fallido | José | Se incluye | RF-27 |
| Productos restringidos (alcohol y tabaco) | José | Se incluye | RD-01 |
| Gestión de usuarios y co-dueño | José | Se incluye (Should) | RF-03 |
| Registro con aviso de privacidad y recuperación | José | Se incluye | RF-02, RNF-10 |
| Captura manual de ofertas por WhatsApp | José | Se incluye (Should) | RF-11 |
| Configuración de la tienda | José, Víctor | Se incluye | RF-28 |
| Perfil de brecha digital y prueba de aprendizaje | José | Se incluye | §2.3, RNF-11 |
| Bloqueo por intentos fallidos (429) | José | Se incluye | RF-01-AC-5 |
| Saldo a favor del cliente | Víctor | **Se difiere a Fase 2**: no está definido cómo se aplica en pedidos posteriores | §1.2, §3.6 |

## 4. Conflictos y resolución

| # | Conflicto | Posturas | Resolución | Quién decidió |
|---|---|---|---|---|
| C-01 | Alcance del producto | Ángel: solo POS. Resto: POS + proveedores + tienda en línea | TiendiNet completo, como pide `proyecto_base.md`. | Equipo (alcance base) |
| C-02 | Punto de reorden | Ángel, Adrián y Víctor: manual. José: automático con CDP | **Híbrido**: PR inicial manual obligatorio; cálculo automático cuando hay 14 días de historial; PR manual con vigencia que tiene prioridad. Validación de Víctor para valores inválidos y explicación del PR de José. | Equipo: "unificar lo de todos" |
| C-03 | Base de la alerta | Víctor: existencia física. Adrián y José: disponible. Ángel: existencia | Disponible (física − apartado − caducados), porque lo apartado ya no se puede vender. | Mayoría y consistencia |
| C-04 | Quién cancela una venta | Ángel y José: solo Dueño. Víctor: Empleado y Dueño (decisión del cliente) | Empleado y Dueño, con motivo obligatorio y solo si la venta no está en un corte cerrado. | Equipo |
| C-05 | Reglas de envío | Víctor: distancia < 2 km (Haversine), $25, gratis > $300. José: códigos postales, mínimo $150, $25 | Códigos postales (aprox. 2 km), mínimo $150, $25; todo configurable. Más simple, sin geolocalización. | Equipo |
| C-06 | Granel | Víctor: lo incluye. Ángel y José: lo excluyen. Adrián: solo piezas | Fuera del MVP (RD-02). | Mayoría |
| C-07 | Corte de caja | Víctor: lo incluye. José: lo excluye | Se incluye (Should). | Equipo |
| C-08 | Caducidad | Víctor: solo registro y estado. José: alertas y FEFO. Otros: nada | Lotes, FEFO y resumen diario de caducidad (Should). | Equipo |
| C-09 | Ventas sin internet | Víctor: todo a Fase 2. José: captura diferida | Captura diferida en el MVP (RF-19); operación offline real en Fase 2 (RF-30). | Equipo |
| C-10 | Pago en línea | Adrián: registro interno sin pasarela. Víctor: interfaz con servicio de pruebas. José: Mercado Pago *sandbox* | Interfaz `ServicioPagos` con dos implementaciones: Mercado Pago *sandbox* y simulada. Satisface a Víctor y José; la simulada cubre la postura de Adrián para pruebas. | Equipo |
| C-11 | Momento en que se crea el pedido | Adrián y Víctor: solo cuando el pago ya se aprobó. José: "Pendiente de pago" con apartado de 15 min | Postura de José (S-07): Checkout Pro redirige fuera del sitio, así que el pedido debe existir antes del pago. | Equipo (técnica) |
| C-12 | Nombres de estados | Adrián: Enviado. Víctor: Recibido, Listo, Resuelto. José: Pendiente de pago, Listo para recoger, En camino | Se toma la máquina de José, se agrega "Listo para enviar" para que ambas modalidades tengan un "Listo" (idea de Víctor) y se agrega la asignación obligatoria (Víctor). "No recogido" termina en "Cancelado" con resolución (José) en vez de "Resuelto". | Equipo |
| C-13 | Quién cancela un pedido pagado | Víctor: Empleado y Dueño. José: solo Dueño y Cliente | Dueño y Cliente: cancelar un pedido implica devolver dinero. | Equipo |
| C-14 | Resolución de "No recogido" | Víctor: Empleado o Dueño; reembolso o saldo a favor. José: Dueño; total, parcial o ninguno | Dueño decide reembolso total, parcial o ninguno; no se permite una segunda resolución (Víctor). Saldo a favor a Fase 2. | Equipo |
| C-15 | Ajustes de inventario | Ángel: solo Administrador. José: Dueño o Empleado | Dueño o Empleado, con motivo obligatorio y auditoría (el Empleado opera la bodega). | Equipo |
| C-16 | Identificador de acceso | Ángel: nombre de usuario. Resto: correo | Correo. | Mayoría |
| C-17 | Roles | Ángel: Cajero/Administrador. Adrián: Dueño, Cajero, Encargado, Cliente. Víctor y José: Dueño, Empleado, Cliente | Dueño, Empleado, Cliente; el Empleado cubre cajero y encargado. | Mayoría |
| C-18 | Catálogo en línea sin sesión | Adrián: exige sesión. Víctor: público | Público; pedir y consultar pedidos exige sesión (S-08). | Mayoría |
| C-19 | Formas de pago en mostrador | Ángel: solo efectivo. Víctor y José: efectivo o tarjeta en terminal externa | Efectivo o tarjeta en terminal externa (RD-08). | Mayoría |
| C-20 | Rendimiento | Ángel: 2 s / 3 s con 10 usuarios. Víctor: < 2 s con 30. José: 500 ms en POS, 2 s en catálogo con 50 | 500 ms al agregar en POS, 2 s al confirmar venta, 2 s en catálogo con 50 usuarios. | Equipo |
| C-21 | Disponibilidad | Ángel: 99.5 %. Víctor: 99 % | 99 % durante el piloto, por correr en un equipo del proyecto con túnel. | Equipo |
| C-22 | Ancho mínimo de pantalla | Ángel: 768 px. José: 360 px | 360 px, porque el cliente compra desde el celular. | Mayoría |

Todas las resoluciones fueron revisadas y aprobadas por el equipo el 04/10/2026.

## 5. Aportes de cada integrante al SRS consolidado

| Integrante | Aportes principales |
|---|---|
| **Ángel** | Venta transaccional con folio y rechazo de toda la venta si falta inventario; concurrencia entre sesiones; comprobante con precios históricos; cancelación sin borrar y con reintegro único (RD-09); motivo y cantidad anterior/nueva en ajustes; reporte diario con neto; redondeo a centavos; retención de 12 meses; expiración por inactividad; operación con teclado o pantalla táctil. |
| **Adrián** | Definiciones de existencia, apartado y disponible; alerta sobre disponible y por apartado; cantidad faltante en la alerta; ficha única con rechazo de duplicados; alta de productos desde el proveedor; separación de costo de proveedor y precio de venta (RD-12); el cliente no ve costos ni existencia exacta; diagrama de contexto. |
| **Víctor** | Normalización por unidad base; sugerencia de proveedor y propuesta de compra; corte de caja; cancelación por Empleado limitada por el corte; responsable inmutable de la venta; asignación de pedidos; estados por modalidad y rechazo de saltos; matriz de permisos; datos mínimos; supuestos S-XX; rotación e indicadores; RNF de compatibilidad, disponibilidad y retención; plan de entrega y riesgos. |
| **José** | Lotes con FEFO y caducidad; PR calculado con CDP, PR manual temporal y explicación del PR; webhooks, conciliación, firma, idempotencia y validación de monto; reembolsos con estados; faltantes y sustitutos; ventas diferidas y descuadre; productos restringidos; co-dueño y gestión de usuarios; registro con aviso de privacidad; captura manual de ofertas; configuración de la tienda; perfil de brecha digital y RNF de aprendizaje; arquitectura y prioridades MoSCoW. |

## 6. Equivalencia de IDs

Los IDs de `SRS_equipo.md` sustituyen a los individuales. Esta tabla permite rastrear de dónde viene cada requerimiento.

| `SRS_equipo` | Ángel | Adrián | Víctor | José |
|---|---|---|---|---|
| RF-01 Autenticación y acceso | RF-01 | RF-11, RF-12 | RF-23 (parcial) | RF-01 |
| RF-02 Cuenta de cliente | — | — | RF-23 | RF-02 |
| RF-03 Usuarios de la tienda | — | — | — | RF-03 |
| RF-04 Catálogo de productos | RF-02 | RF-01 | — | RF-04 |
| RF-05 Recepción de mercancía | RF-07 (entradas) | RF-03 | RF-01, RF-03-AC-1 | RF-07 |
| RF-06 Ajustes de inventario | RF-07, RF-08 | — | — | RF-10 |
| RF-07 Caducidades | — | — | RF-03 | RF-13 |
| RF-08 Punto de reorden | RF-02 (mínimo) | RF-01 (PR) | RF-02-AC-1, AC-2 | RF-11 |
| RF-09 Alertas de reorden | RF-10-AC-2 | RF-05 | RF-02-AC-3 a AC-5 | RF-12 |
| RF-10 Unificación de proveedores | — | RF-06, RF-13 | RF-05 | RF-05 |
| RF-11 Ofertas manuales | — | — | — | RF-22 |
| RF-12 Comparación | — | RF-07-AC-1 | RF-06 | RF-06 |
| RF-13 Sugerencia y preferido | — | RF-07-AC-2, AC-3 | RF-07 | RF-20 (preferido) |
| RF-14 Propuesta de compra | — | — | RF-08 | — |
| RF-15 Búsqueda | RF-03 | RF-12-AC-1 | RF-09 | RF-08 (búsqueda) |
| RF-16 Venta en mostrador | RF-04, RF-05, RF-08 | RF-02 | RF-01, RF-11, RF-12-AC-1, RF-20-AC-2 | RF-08, RF-15-AC-3 |
| RF-17 Comprobante | RF-06 | — | — | — |
| RF-18 Cancelación de venta | RF-09 | — | RF-12, RF-14 | RF-08 (escenario) |
| RF-19 Ventas diferidas | — | — | — | RF-09 |
| RF-20 Corte de caja | — | — | RF-13 | — |
| RF-21 Catálogo en línea | — | RF-08-AC-1 | — | RF-14 |
| RF-22 Pedido anticipado | — | RF-04, RF-08 | RF-15, RF-16, RF-20-AC-1 | RF-15 |
| RF-23 Pago en línea | — | RF-08-AC-2, AC-3 | RF-17 | RF-16 |
| RF-24 Asignación y estados | — | RF-10 | RF-18, RF-19, RF-20, RF-21 | RF-17 |
| RF-25 Faltantes | — | — | — | RF-18 |
| RF-26 Seguimiento y cancelación | — | RF-09 | RF-19-AC-5 | RF-19 |
| RF-27 Reembolsos y no recogidos | — | — | RF-22 | RF-21 |
| RF-28 Configuración | — | — | RD-01, RD-02 | RF-20 |
| RF-29 Reportes | RF-10-AC-1 | — | RF-04, RF-24 | — |
| RF-30 Offline (Fase 2) | — | — | RF-25 | — |

## 7. Impacto en el plan

Integrar todos los extras elevó el alcance a 131 criterios (Víctor planeaba 85 con 17 % de holgura). El `SRS_equipo.md` define un orden de recorte en la sección 4 para proteger los requerimientos Must si al cierre de la semana 7 no hay avance suficiente.
