# ADR-001: Selección del estilo arquitectónico

| Campo | Valor |
|---|---|
| **Fecha** | 2026-10-11 |
| **Estado** | Aceptado |
| **Sistema** | TiendiNet (MVP, 12 semanas) |
| **Decisores** | José Alberto Ramírez Morales · Ángel Vega Martínez · Víctor Manuel Jurado Herrera · Adrián Alberto Cortés Alvarez |
| **Insumos** | `SRS_equipo.md` v2.0 (secciones 2.1, 2.4, 3.2, 3.3) |

---

## Contexto

TiendiNet es una aplicación web para **una sola tienda de abarrotes** con dos portales (Tienda y Clientes) sobre una API REST, una BD concentradora y tres integraciones externas: dos BD de proveedores con esquemas distintos y Mercado Pago *sandbox*. Lo construye un **equipo de 4 personas en 12 semanas**, y se ejecuta con Docker Compose en un equipo del proyecto expuesto por túnel HTTPS (SRS §2.1).

Las fuerzas que deciden el estilo salen de los requerimientos no funcionales:

| Fuerza | Origen | Implicación arquitectónica |
|---|---|---|
| **Cero sobreventas** con mostrador y tienda en línea compitiendo por la misma existencia | RNF-06, RF-16-AC-6, SRS §2.4 ("una sola transacción con bloqueo por fila") | Venta, apartado, entrega y webhook deben tocar la existencia **en una sola transacción ACID** sobre **una sola BD**. Es la restricción dominante. |
| Carga **baja y predecible**: 10 usuarios POS, 50 clientes concurrentes, 200 ventas y 30 pedidos al día | RNF-01, RNF-02, SRS §2.5 | No hace falta escalar componentes por separado; un proceso de API bien indexado sobra. |
| Cambiar de proveedor o de pasarela **sin tocar el núcleo** | RNF-15 | Interfaces explícitas (`AdaptadorProveedor`, `ServicioPagos`) con implementaciones intercambiables. |
| Auditoría inmutable de cada operación | RNF-07, RNF-14 | La auditoría se escribe en la **misma transacción** que la operación auditada. |
| Control de acceso en cada endpoint | RNF-04, RNF-05, RNF-10, §3.4 | Un punto central de autenticación y autorización por rol. |
| Contrato OpenAPI con IDs `RF-XX-AC-Y` y cobertura ≥ 70 % | RNF-16 | Una sola API documentada; pruebas de integración sin infraestructura distribuida. |
| Procesos disparados por reloj (5:00 sincronización, 6:00 PR, 7:00 caducidades, expiración a 15 min, conciliación cada 10 min, no recogidos a las 20:00) | RF-07, 08, 10, 22, 23, 24 | Un componente programador que reutilice la misma lógica de dominio sin duplicarla. |
| Internet de la tienda intermitente; webhooks de MP pueden no llegar | SRS §2.4, RF-23-AC-3 | Conciliación periódica e idempotencia en el procesamiento de pagos. |
| Disponibilidad ≥ 99 % en horario de operación | RNF-13 | Pocas piezas móviles; reinicio automático de contenedores. |
| Equipo de 4 estudiantes con un stack ya acordado (React + FastAPI + PostgreSQL) | SRS §2.1, §2.4 | La complejidad operativa compite directamente con el tiempo de construir funcionalidad (131 criterios). |

**Pregunta:** ¿qué estilo arquitectónico cumple RNF-06 y RNF-15 sin consumir el plazo de 12 semanas en infraestructura?

---

## Decisión

Adoptamos una arquitectura **cliente-servidor** cuyo backend es un **monolito modular en capas con puertos y adaptadores en los bordes**:

1. **Clientes:** dos SPA (Portal Tienda y Portal Clientes) en React + Vite + TypeScript, en un monorepo con un paquete de componentes compartidos. Solo hablan con la API por HTTPS/JSON.
2. **Backend:** un único código FastAPI desplegado como **dos procesos** del mismo artefacto:
   - **API REST** (uvicorn): atiende portales y webhooks de Mercado Pago.
   - **Worker programador** (APScheduler): ejecuta los procesos de reloj llamando a los **mismos servicios de dominio** que la API.
3. **Módulos verticales** alineados al SRS §2.2, cada uno con sus capas internas *router → servicio de aplicación → dominio → repositorio*:
   `acceso` · `catalogo_inventario` · `proveedores_compras` · `punto_venta` · `pedidos` · `pagos` · `administracion`.
   Un módulo solo usa a otro a través de su **servicio público**, nunca de sus tablas o repositorios.
4. **Componentes transversales:** seguridad (JWT + verificación de rol y de cuenta activa por petición), auditoría (escrita en la misma transacción) y unidad de trabajo (una transacción por caso de uso con `SELECT … FOR UPDATE` sobre la fila de cada producto afectado, en orden de `id` para evitar interbloqueos; la existencia disponible se calcula dentro de esa transacción a partir de lotes y apartados).
5. **Puertos y adaptadores** para todo lo externo:
   - `AdaptadorProveedor` → `AdaptadorProveedorA` (PostgreSQL), `AdaptadorProveedorB` (MySQL).
   - `ServicioPagos` → `PagosMercadoPago` (*sandbox*), `PagosSimulado` (pruebas).
   - `ServicioCorreo` → `CorreoSMTP` (Mailpit en local).
6. **Una sola BD concentradora** PostgreSQL. Las BD de proveedores se leen en modo solo lectura y nunca participan en transacciones de negocio.

---

## Alternativas consideradas

### A1. Microservicios por módulo (Inventario, POS, Pedidos, Pagos, Proveedores)

Cada módulo como servicio con su propia BD, comunicándose por HTTP y un *API Gateway*.

- **A favor:** escalado y despliegue independientes; fronteras de módulo imposibles de violar.
- **En contra:** la existencia vive en un servicio y la venta y el pedido en otros, así que **RNF-06 deja de poder resolverse con una transacción**: requiere sagas, reservas compensatorias o bloqueos distribuidos, y RF-16-AC-6 (dos operaciones paralelas sobre la última unidad) se vuelve una prueba sobre consistencia eventual. Multiplica por 5 los Dockerfiles, migraciones, contratos y pipelines; las pruebas de integración necesitan levantar todo el sistema. La carga (RNF-01/02) no justifica el escalado independiente.

### A2. Event-driven con *broker* (RabbitMQ/Redis Streams)

Los módulos publican eventos (`VentaConfirmada`, `PedidoPagado`, `StockBajo`) y otros reaccionan de forma asíncrona.

- **A favor:** desacopla bien las reacciones secundarias (alertas RF-09, correos, recálculos) y amortigua la llegada de webhooks.
- **En contra:** el núcleo (venta, apartado, pago) **necesita respuesta síncrona y consistente** al cajero y al cliente; volverlo asíncrono agrega estados intermedios que el SRS no tiene. Agrega un componente más que puede fallar (RNF-13), complica la depuración y exige garantías de entrega e idempotencia en cada consumidor. La curva de aprendizaje compite con el plazo.

### A3. Monolito en capas horizontales clásico (sin fronteras por módulo)

Una sola aplicación organizada solo por capas técnicas: `routers/`, `services/`, `repositories/`, `models/`.

- **A favor:** la opción más rápida de arrancar; misma consistencia transaccional que la decisión elegida.
- **En contra:** con 7 módulos, 30 RF y 4 personas trabajando en paralelo, todo termina dependiendo de todo; los cambios chocan en los mismos archivos y el código de Mercado Pago o de los proveedores tiende a filtrarse a los servicios, lo que **incumple RNF-15**. No da un mapa claro de quién es dueño de qué.

---

## Comparación de trade-offs

Escala: ●●● = muy favorable para TiendiNet · ●○○ = poco favorable.

| Criterio | **Monolito modular + puertos y adaptadores (elegida)** | A1. Microservicios | A2. Event-driven | A3. Capas clásicas |
|---|---|---|---|---|
| **Consistencia transaccional (RNF-06)** | ●●● Una transacción ACID con bloqueo por fila | ●○○ Sagas y consistencia eventual | ●○○ Estados intermedios asíncronos | ●●● Una transacción ACID |
| **Escalabilidad** | ●●○ Vertical y réplicas de la API detrás del proxy; sobra para 10 + 50 usuarios | ●●● Por servicio, innecesaria a esta carga | ●●● Consumidores escalables | ●●○ Igual que la elegida |
| **Mantenibilidad (RNF-15, RNF-16)** | ●●● Fronteras por módulo + interfaces para proveedores y pagos | ●●○ Fronteras fuertes, pero contratos y versiones entre servicios | ●●○ Flujo difícil de seguir | ●○○ Acoplamiento creciente; adaptadores no aislados |
| **Complejidad de implementación** | ●●○ Requiere disciplina de módulos y una unidad de trabajo | ●○○ Gateway, N BD, descubrimiento, trazas distribuidas | ●○○ Broker, reintentos, idempotencia por consumidor | ●●● La más simple |
| **Adecuación al equipo (4 personas, 12 semanas)** | ●●● Un módulo por persona sin pisarse; un solo `docker compose up` | ●○○ Se consume el plazo en infraestructura | ●○○ Poca experiencia previa en mensajería | ●●○ Rápido al inicio, choques al integrar |
| **Disponibilidad y operación (RNF-13)** | ●●● Pocos contenedores, reinicio automático | ●○○ Más puntos de falla | ●●○ Broker como punto de falla | ●●● Igual que la elegida |
| **Pruebas (RNF-16, cobertura ≥ 70 %)** | ●●● pytest + BD de prueba + `PagosSimulado` | ●○○ Pruebas de contrato y de sistema | ●●○ Pruebas asíncronas | ●●○ Fáciles, pero sin dobles por interfaz |

---

## Consecuencias

### Positivas

- **RNF-06 se cumple por diseño:** `ConfirmarVenta`, `CrearPedido`, `ProcesarWebhook` y `EntregarPedido` bloquean la fila de cada producto con `SELECT … FOR UPDATE` (en orden de `id`) y recalculan la disponible dentro de la misma transacción; la prueba de 50 peticiones concurrentes sobre 10 unidades es verificable con pytest.
- **RNF-15 se cumple por diseño:** un tercer proveedor es un nuevo `AdaptadorProveedorC`; cambiar de pasarela es otra implementación de `ServicioPagos`. El núcleo no cambia.
- **RNF-07:** la auditoría se escribe en la misma transacción, así que no hay operación sin rastro ni rastro sin operación.
- **RNF-16:** un solo `openapi.yaml` generado por FastAPI; cada endpoint referencia sus `RF-XX-AC-Y`; las pruebas no dependen de Mercado Pago gracias a `PagosSimulado`.
- **Trabajo en paralelo:** el reparto natural es un módulo por integrante, con el contrato OpenAPI de la semana 4 como frontera con los portales.
- **Operación simple:** el despliegue piloto es un `docker-compose.yml` con 8 contenedores; el mismo archivo sirve para una VM en la nube (ver `diagrama_despliegue.puml`).

### Negativas y mitigaciones

| Consecuencia negativa | Mitigación |
|---|---|
| Un fallo grave en la API tumba ambos portales a la vez. | `restart: unless-stopped`, *healthcheck* en `/salud`, monitor externo durante el piloto (RNF-13). |
| Las fronteras entre módulos dependen de la disciplina del equipo. | Regla de importación verificada en CI (`import-linter`): un módulo solo importa el paquete `api` público de otro. Revisión de PR cruzada. |
| Si la API escala a varias réplicas, el worker no debe duplicarse. | El worker corre en **un solo proceso**; cada job usa un *advisory lock* de PostgreSQL y es idempotente. |
| Webhooks perdidos por el túnel o por internet intermitente. | Conciliación cada 10 min (RF-23-AC-3) y tabla de eventos procesados para idempotencia (RF-23-AC-5). |
| Las reacciones secundarias (correos, alertas) alargan la transacción. | Se registran como pendientes en la transacción y el worker las envía (*outbox* ligero); el cajero no espera al SMTP. |
| Escalar un módulo concreto obliga a escalar todo el backend. | Aceptable con la carga del SRS. Las fronteras por módulo permiten extraer uno a servicio si se cumple un disparador de revisión. |

### Disparadores para revisar esta decisión

- Pasar de 1 tienda a varias sucursales con inventario propio (hoy fuera de alcance, SRS §1.2).
- Sostener más de 50 usuarios concurrentes con p95 > 2 s tras optimizar consultas e índices (RNF-02).
- Implementar RF-30 (POS sin conexión con sincronización), que podría justificar eventos y una cola local.

---

## Trazabilidad con requerimientos no funcionales

| RNF | Cómo lo atiende la arquitectura | Dónde se ve |
|---|---|---|
| RNF-01, RNF-02 | API stateless con índices sobre código, nombre y lotes; proxy sirve los estáticos | Componentes, Despliegue |
| RNF-03 | Adaptadores leen por lotes y escriben con *upsert* en el worker, fuera de la ruta crítica del POS | Componentes (worker, adaptadores) |
| RNF-04, RNF-05, RNF-10 | Componente transversal de seguridad aplicado a cada router; webhooks con firma verificada | Componentes (Seguridad) |
| RNF-06 | Una BD y una transacción con bloqueo por fila por caso de uso | Componentes (Unidad de trabajo) |
| RNF-07, RNF-14 | Auditoría en la misma transacción; sin borrado físico | Componentes, Clases (`RegistroAuditoria`) |
| RNF-13 | Pocos contenedores, reinicio automático, *healthchecks* | Despliegue |
| RNF-15 | Puertos `AdaptadorProveedor` y `ServicioPagos` | Componentes |
| RNF-16 | OpenAPI generado por FastAPI; `PagosSimulado` para pruebas | Componentes |
