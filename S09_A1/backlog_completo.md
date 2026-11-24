# Product Backlog: TiendiNet

| Campo | Valor |
|---|---|
| Fuente | `SRS_equipo.md` v2.0 |
| Versión | 1.2 (incluye ajustes del equipo y los cambios de la priorización comparada) |
| Fecha | 04/10/2026 |
| Equipo | José Ramírez · Ángel Vega · Víctor Jurado · Adrián Cortés |
| Contenido | 5 épicas · 24 historias · 134 story points |
| Marco | Scrum, 6 sprints de 2 semanas |

## 1. Convenciones

- **Formato:** Como [tipo de usuario], quiero [funcionalidad], para [beneficio].
- **Criterios de aceptación:** se toman del SRS con su ID `RF-XX-AC-Y`, para que el contrato de API y las pruebas apunten al mismo criterio. Se listan los representativos de cada historia; la historia está terminada cuando cumple **todos** los criterios de sus RF en `SRS_equipo.md`.
- **Story Points:** Fibonacci (1, 2, 3, 5, 8, 13). Referencia: **3 SP** = un CRUD sencillo con su pantalla y pruebas (HU-05). 13 SP indica que la historia debe dividirse al planear su sprint.
- **Prioridad:** Alta (Must del SRS), Media (Should), Baja (Could).
- **Labels en GitHub:** `epica:EP-0X`, `prioridad:alta|media|baja`, `sp:N`.

## 2. Épicas

| ID | Épica | Descripción | RF | Historias | SP |
|---|---|---|---|---|---|
| EP-01 | Acceso y administración | Autenticación por rol, cuentas de cliente, usuarios de la tienda, configuración y reportes. | RF-01, RF-02, RF-03, RF-28, RF-29 | HU-01 a HU-04 (4) | 18 |
| EP-02 | Catálogo e inventario | Ficha única de producto, recepciones por lote, ajustes, caducidades, punto de reorden y alertas. | RF-04 a RF-09 | HU-05 a HU-09 (5) | 26 |
| EP-03 | Proveedores y compras | Unificación de los dos proveedores en la BD concentradora, ofertas manuales, comparación, sugerencia y propuesta de compra. | RF-10 a RF-14 | HU-10 a HU-13 (4) | 24 |
| EP-04 | Punto de venta | Venta en mostrador sin sobreventa, comprobante, cancelación, ventas diferidas y corte de caja. | RF-15 a RF-20 | HU-14 a HU-17 (4) | 21 |
| EP-05 | Tienda en línea y pedidos | Catálogo público, pedido anticipado, pago en línea, estados, faltantes, seguimiento y reembolsos. | RF-21 a RF-27 | HU-18 a HU-24 (7) | 45 |
| | **Total** | | | **24** | **134** |

## 3. Resumen del backlog

| ID | Historia (resumen) | Épica | RF | SP | Prioridad | Sprint |
|---|---|---|---|---|---|---|
| HU-01 | Iniciar sesión por rol | EP-01 | RF-01 | 5 | Alta | 1 |
| HU-02 | Registrar cuenta de cliente | EP-01 | RF-02 | 3 | Alta | 4 |
| HU-03 | Administrar usuarios y configuración | EP-01 | RF-03, RF-28 | 5 | Alta | 1 |
| HU-04 | Consultar reportes e indicadores | EP-01 | RF-29 | 5 | Media | 6 |
| HU-05 | Registrar productos | EP-02 | RF-04 | 3 | Alta | 1 |
| HU-06 | Registrar recepciones y ajustes | EP-02 | RF-05, RF-06 | 5 | Alta | 1 |
| HU-07 | Controlar caducidades | EP-02 | RF-07 | 5 | Media | 5 |
| HU-08 | Definir el punto de reorden | EP-02 | RF-08 | 8 | Alta | 2 |
| HU-09 | Recibir alertas de reorden | EP-02 | RF-09 | 5 | Alta | 2 |
| HU-10 | Unificar proveedores en la BD concentradora | EP-03 | RF-10 | 13 | Alta | 3 |
| HU-11 | Comparar ofertas de proveedores | EP-03 | RF-11, RF-12 | 5 | Alta | 3 |
| HU-12 | Sugerir proveedor | EP-03 | RF-13 | 3 | Media | 6 |
| HU-13 | Generar propuesta de compra | EP-03 | RF-14 | 3 | Baja | 6 |
| HU-14 | Cobrar una venta en mostrador | EP-04 | RF-15, RF-16 | 8 | Alta | 2 |
| HU-15 | Consultar comprobante y cancelar venta | EP-04 | RF-17, RF-18 | 5 | Alta | 2 |
| HU-16 | Capturar ventas sin internet | EP-04 | RF-19 | 5 | Alta | 3 |
| HU-17 | Hacer corte de caja | EP-04 | RF-20 | 3 | Alta | 3 |
| HU-18 | Ver catálogo en línea | EP-05 | RF-21 | 3 | Alta | 4 |
| HU-19 | Crear pedido anticipado | EP-05 | RF-22 | 8 | Alta | 4 |
| HU-20 | Pagar el pedido en línea | EP-05 | RF-23 | 13 | Alta | 4 |
| HU-21 | Preparar y entregar pedidos | EP-05 | RF-24 | 8 | Alta | 5 |
| HU-22 | Resolver faltantes del pedido | EP-05 | RF-25 | 5 | Media | 6 |
| HU-23 | Seguir y cancelar mis pedidos | EP-05 | RF-26 | 3 | Alta | 5 |
| HU-24 | Gestionar reembolsos y no recogidos | EP-05 | RF-27 | 5 | Alta | 5 |

Prioridad: Alta 19 historias (113 SP) · Media 4 (18 SP) · Baja 1 (3 SP).

## 4. Historias de usuario

### EP-01 · Acceso y administración

#### HU-01 · Iniciar sesión por rol

> Como usuario de la tienda, quiero iniciar sesión con mi correo y contraseña y ver solo las funciones de mi rol, para que costos, precios y proveedores solo los maneje el Dueño.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 5 | Alta | 1 | RF-01 |

**Criterios de aceptación**

- **RF-01-AC-1**: Dado que tengo credenciales válidas y estoy activo, cuando inicio sesión, entonces recibo un JWT con mi rol y solo veo las funciones de ese rol.
- **RF-01-AC-2**: Dado que mi contraseña es incorrecta o estoy inactivo, cuando intento entrar, entonces veo "Correo o contraseña incorrectos" (401) y no se crea sesión.
- **RF-01-AC-3**: Dado que soy Empleado, cuando pido costos u ofertas o intento cambiar un precio o un PR, incluso por API, entonces recibo 403 y nada cambia.
- **RF-01-AC-5**: Dado que acumulo 5 intentos fallidos con mi correo e IP, cuando intento de nuevo antes de 15 minutos, entonces recibo 429.

#### HU-02 · Registrar cuenta de cliente

> Como cliente del barrio, quiero crear mi cuenta y recuperar mi contraseña desde el celular, para poder hacer pedidos en línea sin depender de la tienda.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 3 | Alta | 4 | RF-02 |

**Criterios de aceptación**

- **RF-02-AC-1**: Dado que capturo datos válidos y acepto el aviso de privacidad, cuando envío el registro, entonces se crea mi cuenta con rol Cliente (201).
- **RF-02-AC-2**: Dado que mi correo ya está registrado, cuando intento registrarme, entonces veo "Este correo ya está registrado" (409).
- **RF-02-AC-3**: Dado que pedí recuperar mi contraseña, cuando uso el enlace después de 30 minutos o por segunda vez, entonces veo "Enlace inválido o expirado".

*Nota:* Se movió del Sprint 1 al 4 tras la priorización comparada; queda como primera historia del bloque en línea porque HU-19 depende de ella.

#### HU-03 · Administrar usuarios y configuración

> Como Dueña de la tienda, quiero dar de alta a mi hija como co-dueña y a mis empleados, y ajustar las reglas de envío y de inventario, para que mi familia opere el sistema y yo cambie reglas sin pedirle nada a un programador.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 5 | Alta | 1 | RF-03, RF-28 |

**Criterios de aceptación**

- **RF-03-AC-1**: Dado que doy de alta a mi hija con rol Dueño, cuando ella activa su cuenta, entonces puede ver costos y cambiar precios.
- **RF-03-AC-3**: Dado que soy el único Dueño activo, cuando intento desactivarme, entonces veo "Debe existir al menos un Dueño activo" (409).
- **RF-28-AC-2**: Dado que capturo 20 días de seguridad, cuando guardo, entonces veo "Los días de seguridad deben estar entre 0 y 14" (422).
- **RF-28-AC-3**: Dado que cambio el envío de $25 a $30, cuando un cliente pide después, entonces paga $30 y los pedidos anteriores conservan $25.

#### HU-04 · Consultar reportes e indicadores

> Como Dueño, quiero consultar el reporte diario, la rotación de productos y los indicadores de faltantes, caja y pedidos, para saber si la tienda está mejorando y qué productos se mueven más.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 5 | Media | 6 | RF-29 |

**Criterios de aceptación**

- **RF-29-AC-1**: Dado que elijo una fecha, cuando consulto el reporte diario, entonces veo ventas de mostrador y en línea por separado, cancelaciones y total neto.
- **RF-29-AC-2**: Dado que en septiembre vendí 120 de A, 80 de B y 30 de C (10 de C cancelados aparte), cuando consulto la rotación, entonces veo A, B, C con 120, 80 y 30.
- **RF-29-AC-3**: Dado que en el periodo 2 productos llegaron a 0, los cortes suman −$45 y hubo 18 pedidos pagados, cuando veo los indicadores, entonces aparecen esos tres valores.
- **RF-29-AC-5**: Dado que soy Empleado, cuando intento ver reportes, entonces recibo 403.

### EP-02 · Catálogo e inventario

#### HU-05 · Registrar productos

> Como Dueño, quiero registrar cada producto una sola vez con su precio, costo y punto de reorden inicial, para usar la misma ficha en el mostrador y en la tienda en línea.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 3 | Alta | 1 | RF-04 |

**Criterios de aceptación**

- **RF-04-AC-1**: Dado que capturo código, nombre, presentación, precio $38.50, costo $31.00 y PR 10, cuando guardo, entonces el producto queda activo con existencia 0 y aparece en POS y catálogo.
- **RF-04-AC-2**: Dado que el código 7501055300075 ya existe, cuando intento crear otro con ese código, entonces veo "Código duplicado" (409).
- **RF-04-AC-4**: Dado que falta un dato obligatorio o el precio es negativo, cuando guardo, entonces recibo 422 con el campo inválido.
- **RF-04-AC-5**: Dado que un producto tiene ventas, cuando lo desactivo, entonces desaparece del POS y del catálogo pero su historial sigue consultable.

#### HU-06 · Registrar recepciones y ajustes

> Como Empleado de la tienda, quiero registrar la mercancía que llega por lote y las mermas o conteos físicos con su motivo, para que la existencia del sistema coincida con lo que hay en el anaquel.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 5 | Alta | 1 | RF-05, RF-06 |

**Criterios de aceptación**

- **RF-05-AC-1**: Dado que el aceite tiene existencia 3, cuando registro 24 del Proveedor A, entonces queda en 27, se crea un lote y el movimiento guarda usuario, fecha y hora.
- **RF-05-AC-2**: Dado que el producto es perecedero, cuando registro la recepción sin caducidad, entonces veo "La fecha de caducidad es obligatoria para productos perecederos" (422).
- **RF-05-AC-3**: Dado que soy Empleado, cuando envío una recepción con costo unitario, entonces el costo se ignora y el formulario no me lo muestra.
- **RF-06-AC-2**: Dado que la existencia es 20, cuando registro un conteo de 18 con motivo, entonces queda en 18, se registra un ajuste de −2 con FEFO y se quita la marca "Descuadre".
- **RF-06-AC-4**: Dado que falta el motivo o la merma excede el lote, cuando confirmo, entonces recibo 422 y la existencia no cambia.

#### HU-07 · Controlar caducidades

> Como Dueño, quiero recibir cada mañana la lista de lotes por caducar y caducados, para vender o retirar a tiempo lo perecedero y no perder dinero en merma.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 5 | Media | 5 | RF-07 |

**Criterios de aceptación**

- **RF-07-AC-1**: Dado que un producto tiene lotes que caducan el 05/10 y el 12/10, cuando consulto su inventario, entonces veo ambos lotes con cantidad y fecha.
- **RF-07-AC-2**: Dado que un lote de yogurt caduca el 30/09, cuando el proceso corre el 27/09, entonces aparece en "Por caducar" y recibo el resumen por correo.
- **RF-07-AC-3**: Dado que un lote caducó ayer, cuando corre el proceso, entonces aparece en "Caducados" con la opción "Registrar como merma" y deja de contar como disponible.
- **RF-07-AC-4**: Dado que un lote caduca hoy, cuando se vende en el POS, entonces la venta se acepta.

#### HU-08 · Definir el punto de reorden

> Como Dueño, quiero que cada producto tenga un punto de reorden que empiece con mi valor y luego se ajuste con las ventas reales, para resurtir a tiempo sin tener que adivinar cuánto me dura cada producto.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 8 | Alta | 2 | RF-08 |

**Criterios de aceptación**

- **RF-08-AC-2**: Dado que capturo un PR negativo o decimal, cuando guardo, entonces veo "El punto de reorden debe ser un número entero mayor o igual a 0" y se conserva el anterior.
- **RF-08-AC-3**: Dado que vendí 112 en 28 días, el proveedor preferido entrega en 2 días y hay 2 de seguridad, cuando corre el cálculo, entonces el PR queda en 16.
- **RF-08-AC-4**: Dado que el producto tiene menos de 14 días de historial, cuando corre el cálculo, entonces se conserva el PR inicial y se muestra "Historial insuficiente".
- **RF-08-AC-5**: Dado que fijé un PR manual de 30 vigente hasta el 03/11, cuando corre el cálculo ese día o antes, entonces se conserva 30.
- **RF-08-AC-7**: Dado que abro el detalle del PR, cuando se muestra, entonces veo su origen, el CDP, los días de historial, de entrega y de seguridad.

#### HU-09 · Recibir alertas de reorden

> Como Dueño o Empleado, quiero recibir una alerta cuando lo disponible de un producto llegue a su punto de reorden, para pedirlo antes de que se agote y no perder ventas.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 5 | Alta | 2 | RF-09 |

**Criterios de aceptación**

- **RF-09-AC-1**: Dado que un producto tiene PR 5 y disponible 6, cuando se vende 1, entonces aparece una alerta con disponible, PR y cantidad sugerida, y el Dueño recibe correo.
- **RF-09-AC-2**: Dado que un producto tiene PR 5 y disponible 6, cuando un pedido pagado aparta 1, entonces también se genera la alerta.
- **RF-09-AC-3**: Dado que un producto tiene PR 5 y disponible 8, cuando se vende 1, entonces no hay alerta.
- **RF-09-AC-5**: Dado que hay una alerta activa, cuando una recepción deja el disponible en 10, entonces la alerta pasa a "Resuelta".

### EP-03 · Proveedores y compras

#### HU-10 · Unificar proveedores en la BD concentradora

> Como Dueño, quiero que el catálogo, costo, existencia y días de entrega de los Proveedores A y B se carguen solos a una sola base, para dejar de juntar precios a mano de fuentes con formatos distintos.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 13 | Alta | 3 | RF-10 |

**Criterios de aceptación**

- **RF-10-AC-1**: Dado que A y B tienen estructuras de columnas distintas, cuando se sincronizan, entonces cada oferta queda con los mismos campos y el conteo por proveedor coincide con su base.
- **RF-10-AC-2**: Dado que 3 registros de B tienen costo vacío o factor ≤ 0, cuando se sincroniza, entonces esos 3 se rechazan con motivo y el resto se importa.
- **RF-10-AC-3**: Dado que una oferta costaba $120, cuando llega en $125, entonces la oferta queda en $125 con fecha y el precio de venta no cambia.
- **RF-10-AC-4**: Dado que un código del proveedor no está vinculado, cuando se sincroniza, entonces va a "Productos por vincular" hasta que lo asocio o doy de alta.
- **RF-10-AC-5**: Dado que la BD de B no responde, cuando se sincroniza, entonces se registra "Error de conexión con Proveedor B" y sus ofertas previas no cambian.

#### HU-11 · Comparar ofertas de proveedores

> Como Dueño, quiero ver lado a lado las ofertas de cada proveedor, incluidas las que me mandan por WhatsApp, con su costo por pieza, para decidir a quién comprarle en menos de 5 minutos.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 5 | Alta | 3 | RF-11, RF-12 |

**Criterios de aceptación**

- **RF-11-AC-1**: Dado que "Abarrotes El Güero" me mandó el aceite a $31 con entrega en 1 día, cuando capturo la oferta, entonces aparece en la comparación con origen "Manual".
- **RF-12-AC-1**: Dado que A vende caja de 12 a $120 (3 días) y B paquete de 6 a $66 (1 día), cuando abro la comparación, entonces veo $10/pza "Menor costo" y $11/pza "Entrega más rápida".
- **RF-12-AC-2**: Dado que una oferta tiene más de 7 días o existencia 0, cuando se muestra, entonces aparece al final como "No vigente".
- **RF-12-AC-3**: Dado que solo un proveedor ofrece el producto, cuando abro la comparación, entonces veo "Solo un proveedor ofrece este producto".

#### HU-12 · Sugerir proveedor

> Como Dueño, quiero que el sistema me sugiera el proveedor más barato o el más rápido si marco urgencia, y poder fijar mi preferido, para no tener que hacer cuentas cada vez que resurto.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 3 | Media | 6 | RF-13 |

**Criterios de aceptación**

- **RF-13-AC-1**: Dado que A cuesta $10/pza en 3 días y B $11/pza en 1 día, cuando pido sugerencia sin urgencia, entonces me sugiere A.
- **RF-13-AC-2**: Dado el mismo caso, cuando marco urgencia, entonces me sugiere B.
- **RF-13-AC-4**: Dado que asigno B como preferido, cuando corre el cálculo de PR, entonces usa los días de entrega de B y el precio de venta no cambia.
- **RF-13-AC-5**: Dado que ninguna oferta vigente alcanza la cantidad, cuando pido sugerencia, entonces veo "Sin proveedor con existencia".

#### HU-13 · Generar propuesta de compra

> Como Dueño, quiero generar una propuesta de compra con lo que está en punto de reorden, su cantidad y proveedor sugerido, para llevar mi lista lista cuando hablo con el proveedor.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 3 | Baja | 6 | RF-14 |

**Criterios de aceptación**

- **RF-14-AC-1**: Dado que 3 productos están en o bajo su PR y 10 arriba, cuando genero la propuesta, entonces incluye solo esos 3 con cantidad, proveedor y costo.
- **RF-14-AC-2**: Dado que edito cantidad o proveedor de un renglón, cuando guardo, entonces la propuesta conserva los cambios y el inventario no cambia.
- **RF-14-AC-3**: Dado que nada está en reorden, cuando intento generarla, entonces veo "No hay productos por reabastecer".

### EP-04 · Punto de venta

#### HU-14 · Cobrar una venta en mostrador

> Como Empleado de mostrador, quiero buscar productos por código o nombre, cobrar en efectivo o tarjeta y que el inventario se descuente al confirmar, para dejar la libreta y nunca vender algo que ya está apartado.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 8 | Alta | 2 | RF-15, RF-16 |

**Criterios de aceptación**

- **RF-15-AC-1**: Dado que existe "Frijol negro 1 kg", cuando escribo "frij", entonces aparece con precio y disponible.
- **RF-16-AC-1**: Dado que el aceite ($38.50) tiene 27, cuando vendo 2 con $100 en efectivo, entonces la venta queda "Completada" con folio, total $77, cambio $23 y existencia 25.
- **RF-16-AC-3**: Dado que el total es $52.50, cuando recibo $50 en efectivo, entonces no se confirma y veo un faltante de $2.50.
- **RF-16-AC-5**: Dado que hay 5 físicas y 5 apartadas, cuando intento vender ese producto, entonces se rechaza toda la venta (409) con disponible 0.
- **RF-16-AC-6**: Dado que queda 1 unidad, cuando dos operaciones la intentan a la vez, entonces solo una tiene éxito y ninguna existencia queda negativa.

#### HU-15 · Consultar comprobante y cancelar venta

> Como Empleado o Dueño, quiero consultar el comprobante de una venta y cancelarla con motivo si hubo un error, para corregir equivocaciones sin perder el rastro de lo que pasó.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 5 | Alta | 2 | RF-17, RF-18 |

**Criterios de aceptación**

- **RF-17-AC-2**: Dado que el precio cambió después de una venta, cuando consulto su comprobante por folio, entonces veo los precios de ese momento.
- **RF-18-AC-1**: Dado que E1 vendió hoy y no hay corte cerrado, cuando E2 la cancela con motivo, entonces queda "Cancelada", las unidades regresan a sus lotes y se registra quién canceló.
- **RF-18-AC-2**: Dado que la venta ya está cancelada, cuando intento cancelarla otra vez, entonces recibo 409 y la existencia no sube de nuevo.
- **RF-18-AC-3**: Dado que la venta está en un corte cerrado, cuando intento cancelarla, entonces veo "La venta pertenece a un corte cerrado".

#### HU-16 · Capturar ventas sin internet

> Como Empleado de mostrador, quiero capturar después las ventas que hice cuando se fue el internet, con su hora real, para que el inventario y el reporte del día no queden chuecos.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 5 | Alta | 3 | RF-19 |

**Criterios de aceptación**

- **RF-19-AC-1**: Dado que a las 18:10 no hubo internet y vendí 3 leches, cuando a las 19:00 capturo la venta diferida con hora 18:10, entonces se descuenta y cuenta para el día.
- **RF-19-AC-2**: Dado que la venta diferida es de 4 y solo hay 2 disponibles, cuando la capturo, entonces se registra, el producto queda en "Descuadre" y el Dueño recibe aviso.
- **RF-19-AC-3**: Dado que la fecha es de hace más de 3 días o futura, cuando la envío, entonces veo "Solo se pueden capturar ventas de los últimos 3 días".

*Nota:* Prioridad subida de Media a Alta y adelantada del Sprint 6 al 3 tras la priorización del agente-PO (ver priorizacion_comparada.md).

#### HU-17 · Hacer corte de caja

> Como Empleado o Dueño, quiero hacer el corte de caja comparando el efectivo esperado contra el contado, para cuadrar la caja todos los días y detectar faltantes de dinero.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 3 | Alta | 3 | RF-20 |

**Criterios de aceptación**

- **RF-20-AC-1**: Dado que hubo $1,000 en efectivo y $500 con tarjeta, cuando cuento $980, entonces veo esperado $1,000, contado $980, diferencia −$20 y tarjeta $500 aparte.
- **RF-20-AC-2**: Dado que una venta en efectivo de $100 se canceló, cuando hago el corte, entonces no suma al esperado.
- **RF-20-AC-3**: Dado que confirmo el corte, cuando se guarda, entonces queda con usuario, fecha, montos y diferencia, y sus ventas ya no se pueden cancelar.

*Nota:* Prioridad subida de Media a Alta tras la priorización del agente-PO (ver priorizacion_comparada.md).

### EP-05 · Tienda en línea y pedidos

#### HU-18 · Ver catálogo en línea

> Como vecino del barrio, quiero buscar productos en el catálogo en línea y ver precio y si hay o no, para saber qué puedo pedir sin ir a la tienda.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 3 | Alta | 4 | RF-21 |

**Criterios de aceptación**

- **RF-21-AC-1**: Dado que hay productos con "leche", cuando busco "leche", entonces veo precio, presentación y "Perecedero", sin costo, existencia exacta ni proveedor.
- **RF-21-AC-2**: Dado que la cerveza es producto restringido, cuando busco "cerveza", entonces no aparece.
- **RF-21-AC-3**: Dado que un producto tiene disponible 0, cuando aparece, entonces dice "Agotado" y no puedo agregarlo al carrito.

#### HU-19 · Crear pedido anticipado

> Como cliente, quiero armar mi carrito y elegir recoger en tienda o envío a domicilio, para recibir mis productos como más me convenga.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 8 | Alta | 4 | RF-22 |

**Criterios de aceptación**

- **RF-22-AC-1**: Dado que elijo recoger en tienda, cuando confirmo, entonces el pedido queda "Pendiente de pago" con folio, se aparta lo pedido y el envío es $0.
- **RF-22-AC-2**: Dado que elijo envío con subtotal ≥ $150 y CP atendido, cuando confirmo, entonces el total incluye $25 de envío.
- **RF-22-AC-3**: Dado que elijo envío con subtotal de $120, cuando confirmo, entonces veo "El pedido mínimo para envío es de $150".
- **RF-22-AC-4**: Dado que mi CP no está en la zona, cuando elijo envío, entonces veo "No entregamos en tu código postal; puedes recoger en tienda".
- **RF-22-AC-8**: Dado que pasan 15 minutos sin pago, cuando vence el plazo, entonces el pedido pasa a "Expirado" y se libera el apartado.

#### HU-20 · Pagar el pedido en línea

> Como cliente, quiero pagar mi pedido en línea por adelantado y recibir la confirmación, para asegurar mis productos sin pagar en efectivo al recogerlos.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 13 | Alta | 4 | RF-23 |

**Criterios de aceptación**

- **RF-23-AC-1**: Dado que mi pedido de $275 está pendiente, cuando llega el webhook auténtico aprobado por $275, entonces pasa a "Pagado", recibo correo y aparece en "Por preparar".
- **RF-23-AC-3**: Dado que el pago se aprobó pero el webhook no llegó, cuando corre la conciliación, entonces el pedido se procesa igual.
- **RF-23-AC-4**: Dado que mi pago fue rechazado, cuando se procesa, entonces sigo en "Pendiente de pago", conservo el carrito y veo "Tu pago no fue aprobado, intenta con otro método".
- **RF-23-AC-5**: Dado que llega un webhook con firma inválida o duplicado, cuando el backend lo recibe, entonces responde 401 o lo ignora sin repetir correo.
- **RF-23-AC-6**: Dado que el monto pagado no coincide con el total, cuando se procesa, entonces el pedido no pasa a "Pagado" y se alerta al Dueño.

#### HU-21 · Preparar y entregar pedidos

> Como Empleado, quiero asignarme pedidos pagados y avanzarlos por sus estados hasta la entrega, para que cada pedido tenga un responsable y el cliente sepa en qué va.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 8 | Alta | 5 | RF-24 |

**Criterios de aceptación**

- **RF-24-AC-1**: Dado que un pedido "Pagado" no tiene responsable, cuando intento pasarlo a "En preparación", entonces veo "Asigna un empleado al pedido".
- **RF-24-AC-2**: Dado que un pedido de recolección está "Listo para recoger", cuando intento pasarlo a "En camino", entonces veo "Estado no válido para esta modalidad".
- **RF-24-AC-4**: Dado que un pedido está "Pagado", cuando intento pasarlo directo a "Entregado", entonces recibo 409.
- **RF-24-AC-6**: Dado que el pedido aparta 4 de un producto con 10 físicas, cuando pasa a "Entregado", entonces quedan 6 físicas y el apartado en 0.
- **RF-24-AC-7**: Dado que un pedido está "Listo para recoger" desde el día D, cuando son las 20:00 de D+1, entonces pasa a "No recogido" y se libera el apartado.

#### HU-22 · Resolver faltantes del pedido

> Como cliente, quiero elegir entre reembolso o un sustituto cuando falte algo de mi pedido, para no quedarme sin producto ni sin mi dinero.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 5 | Media | 6 | RF-25 |

**Criterios de aceptación**

- **RF-25-AC-1**: Dado que pedí 2 leches y solo hay 1, cuando el Empleado marca el faltante, entonces el pedido pasa a "Esperando respuesta del cliente" y me llega un correo.
- **RF-25-AC-2**: Dado que hay un faltante, cuando elijo "Reembolso", entonces se crea un reembolso de $29 y el pedido vuelve a "En preparación".
- **RF-25-AC-3**: Dado que elijo un sustituto de $27, cuando confirmo, entonces se aparta, se reembolsan $2 y el pedido sigue.
- **RF-25-AC-4**: Dado que no respondo en 30 minutos, cuando vence el plazo, entonces se aplica el reembolso.

#### HU-23 · Seguir y cancelar mis pedidos

> Como cliente, quiero ver el estado de mis pedidos y cancelar uno mientras no lo empiecen a preparar, para saber cuándo llega y cambiar de opinión a tiempo.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 3 | Alta | 5 | RF-26 |

**Criterios de aceptación**

- **RF-26-AC-1**: Dado que tengo 3 pedidos, cuando abro "Mis pedidos", entonces los veo del más reciente al más antiguo con folio, total, estado y fecha de entrega.
- **RF-26-AC-2**: Dado que mi pedido está "Pagado", cuando lo cancelo, entonces pasa a "Cancelado", se libera el apartado y se crea un reembolso total.
- **RF-26-AC-3**: Dado que mi pedido está "En preparación", cuando intento cancelarlo, entonces la opción no aparece y la API responde 409.
- **RF-26-AC-4**: Dado que soy el Cliente A, cuando pido un pedido del Cliente B, entonces recibo 404.

#### HU-24 · Gestionar reembolsos y no recogidos

> Como Dueño, quiero dar seguimiento a los reembolsos y decidir qué hacer con los pedidos que nadie recogió, para devolver el dinero correcto y no perder mercancía apartada.

| Story Points | Prioridad | Sprint | Requerimientos |
|---|---|---|---|
| 5 | Alta | 5 | RF-27 |

**Criterios de aceptación**

- **RF-27-AC-1**: Dado que se creó un reembolso de $29, cuando el servicio de pagos lo confirma, entonces pasa a "Confirmado" y el cliente recibe correo.
- **RF-27-AC-2**: Dado que el servicio rechaza un reembolso, cuando llega la respuesta, entonces pasa a "Fallido" y lo veo con la opción "Reintentar".
- **RF-27-AC-3**: Dado que un pedido de $180 está "No recogido", cuando elijo reembolso total, parcial o ninguno, entonces queda "Cancelado" con mi resolución; un monto > $180 da 422.
- **RF-27-AC-4**: Dado que el pedido ya tiene resolución, cuando intento registrar otra, entonces se rechaza.

## 5. Plan de sprints

La velocidad objetivo es de unos 24 SP por sprint (4 integrantes, descontando coordinación y entregables del curso). El orden combina el valor de negocio (priorización del agente-PO) con dependencias y riesgo técnico (equipo): no hay venta sin productos, ni pedido sin cuenta de cliente, ni reembolso sin pago.

| Sprint | Semanas | Objetivo | Historias | SP |
|---|---|---|---|---|
| 1 | 1–2 | Base: acceso, usuarios, productos e inventario | HU-01, HU-03, HU-05, HU-06 | 18 |
| 2 | 3–4 | Punto de venta y reorden | HU-08, HU-09, HU-14, HU-15 | 26 |
| 3 | 5–6 | Proveedores, corte de caja y ventas sin internet | HU-10, HU-11, HU-16, HU-17 | 26 |
| 4 | 7–8 | Tienda en línea: cuenta, catálogo, pedido y pago | HU-02, HU-18, HU-19, HU-20 | 27 |
| 5 | 9–10 | Pedidos, reembolsos y caducidades | HU-07, HU-21, HU-23, HU-24 | 21 |
| 6 | 11–12 | Complementos, pruebas de aceptación y cierre | HU-04, HU-12, HU-13, HU-22 | 16 |
| | | **Total** | | **134** |

- **Sprint 1** lleva menos puntos porque incluye arquitectura, repositorio y despliegue base.
- **Sprint 3** incluye además la validación de la tienda en línea con la clienta mediante un prototipo navegable (zona de entrega, pedido mínimo y horario, valores ⚑ del SRS), antes de construirla en el Sprint 4.
- **Sprint 4** queda 3 SP arriba de la velocidad; HU-20 (13 SP) se divide al planearlo en "pago aprobado por webhook" y "conciliación y casos de error".
- **Sprint 6** reserva capacidad para pruebas de aceptación con la clienta. Si falta tiempo se recorta en este orden: HU-13 → HU-22 → HU-12 → HU-04 → HU-07.

## 6. Definición de terminado (DoD)

Una historia está terminada cuando:

1. Cumple todos los criterios de sus RF en `SRS_equipo.md`.
2. Cada criterio tiene una prueba automatizada nombrada con su ID (por ejemplo, `test_RF_16_AC_5`).
3. Sus endpoints están en `openapi.yaml` con los IDs `RF-XX-AC-Y` que cubren.
4. Pasó revisión de código de otro integrante y está integrada en la rama principal.
5. Funciona en celular (360 px) y en la PC del mostrador.
6. El issue en GitHub Projects está en **Hecho**.
