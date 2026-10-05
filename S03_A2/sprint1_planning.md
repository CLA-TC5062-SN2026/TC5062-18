# Sprint 1 Planning: TiendiNet

| Campo | Valor |
|---|---|
| Fecha del Planning | 04/10/2026 |
| Sprint | 1 de 6 · lunes 5 al domingo 18 de octubre de 2026 (semanas 1–2 del plan) |
| Equipo | José Ramírez · Ángel Vega · Víctor Jurado · Adrián Cortés |
| Entrada | `backlog_completo.md` v1.2 (24 historias, 134 SP) y `SRS_equipo.md` v2.0 |
| Método | El agente propuso Sprint Goal, historias y capacidad; el equipo evaluó la propuesta contra las horas disponibles, el valor y las dependencias, y la ajustó. |
| Resultado | Se aceptan las 4 historias del agente (18 SP), con margen justo; se redefine el Sprint Goal y se agrega un plan de contingencia. |

## 1. Roles Scrum

En un equipo de 4, el Product Owner y el Scrum Master también son Developers. Por eso reciben un poco menos de carga en tareas (§5.3).

| Rol | Quién | Qué hace en este sprint | Qué **no** hace |
|---|---|---|---|
| **Product Owner** | José | Presenta el backlog ordenado y el objetivo de negocio en el Planning. Aclara criterios de aceptación durante el sprint. En la Review acepta o rechaza cada historia contra sus criterios. Decide el alcance si se activa la contingencia (§6). | No decide cuánto trabajo cabe en el sprint ni cómo se implementa; eso es de los Developers. No puede pedir que se omita la DoD. |
| **Scrum Master** | Víctor | Facilita el Planning y cuida el timebox. Asegura que la capacidad se calcule en horas reales. Da seguimiento a las dailies, elimina impedimentos y facilita el punto de control de la semana 1, la Review y la Retro. Vigila que se cumpla la DoD. | No asigna tareas ni decide prioridades. |
| **Developers** | Los 4 | Estiman, descomponen las historias en tareas (`tareas_tecnicas.md`), deciden cuánto comprometer y son dueños del Sprint Backlog y del plan para cumplir el goal. | No cambian el Sprint Goal sin hablarlo con el PO. |

**Rol del agente de IA:** apoyó al Scrum Master como facilitador. Propuso goal, historias, capacidad y descomposición, pero no decidió: el equipo evaluó y ajustó cada propuesta (§3 y §4).

## 2. Instrucción dada al agente

> "Este es nuestro Product Backlog completo (`backlog_completo.md`). Propón un Sprint Goal para el Sprint 1 que sea concreto, medible y alcanzable en 2 semanas, considerando que cada integrante dedica de 8 a 9 horas por semana. Justifica qué historias seleccionas y cuál es la capacidad estimada del equipo en story points."

## 3. Propuesta del agente

**Sprint Goal propuesto**

> "Tener la base de TiendiNet funcionando: los usuarios de la tienda inician sesión según su rol, el Dueño administra usuarios, configuración y catálogo, y el inventario se actualiza con recepciones y ajustes."

**Capacidad estimada por el agente:** 18 SP. La velocidad objetivo del backlog es de 24 SP por sprint; el agente la redujo al 75 % (18 SP) porque el Sprint 1 incluye arquitectura, repositorio y despliegue base.

**Historias seleccionadas por el agente**

| Historia | SP | Justificación del agente |
|---|---|---|
| HU-01 Iniciar sesión por rol | 5 | Todo lo demás depende de la autenticación y de la matriz de permisos; es lo primero que se construye. |
| HU-03 Administrar usuarios y configuración | 5 | Validado con la clienta: su hija opera el sistema con acceso completo. Además, la configuración guarda reglas que usan sprints posteriores. |
| HU-05 Registrar productos | 3 | Sin catálogo no hay venta, inventario ni tienda en línea. |
| HU-06 Registrar recepciones y ajustes | 5 | Un inventario que no coincide con el anaquel invalida el POS del Sprint 2. |
| **Total** | **18** | Coincide con la capacidad estimada. |

**Historias que el agente dejó fuera:** HU-14 y HU-15 (venta y cancelación) dependen de productos e inventario; HU-08 y HU-09 (PR y alertas) necesitan ventas para ser útiles; HU-02 está ligada al bloque en línea del Sprint 4.

## 4. Evaluación de la propuesta

### 4.1 ¿Es realista?

**Sí, con el margen justo.** Las historias son las apropiadas para el primer sprint. Pero al ser el primero no hay referencia de la capacidad real del equipo, y la velocidad de 24 SP que usó el agente no se ha medido. Por eso la capacidad se recalculó desde las horas disponibles:

| Concepto | Horas-persona |
|---|---|
| Capacidad bruta: 4 integrantes × 9 h/semana × 2 semanas | 72 |
| Eventos Scrum: Planning (1.5 h), Review (1 h) y Retro (0.5 h) con los 4, más dailies asíncronas | −14 |
| Entregables del curso no ligados a historias | −4 |
| **Disponible para el sprint** | **54** |
| Trabajo técnico base sin SP (§5.2) | −14 |
| **Disponible para historias** | **40** |

**Equivalencia horas–SP.** Como no hay historial, se estimó con la historia de referencia: HU-05 (3 SP, un CRUD con pantalla y pruebas) le toma a una persona en promedio 6.75 h con un stack nuevo, es decir **2.25 h/SP**.

**Capacidad del Sprint 1:** 40 h ÷ 2.25 h/SP ≈ **17.8 SP** (rango de 14 a 18 si las horas reales quedan entre 8 y 9 por semana). Los 18 SP del agente coinciden con la capacidad calculada, pero en el borde optimista.

**Conclusión:** el número del agente es correcto, aunque llegó a él por un camino débil (una velocidad supuesta). Se acepta el compromiso de 18 SP con dos condiciones: un punto de control al final de la semana 1 y un orden de contingencia definido desde ahora (§6).

### 4.2 ¿Está enfocada en entregar valor?

**Parcialmente.**

- **El goal es una lista de funciones, no un resultado.** Enumera lo que se construye pero no dice qué gana la clienta ni cómo se comprueba. No es medible.
- **La configuración (RF-28) es la parte de menor valor inmediato.** Sus reglas (envío, CP, horario, días de seguridad, aviso de caducidad) las usan historias de los Sprints 2 a 5. Tenerla desde el Sprint 1 tiene una ventaja: cuando el prototipo del Sprint 3 valide los valores ⚑, cambiarlos será solo configuración y no código. Se conserva, pero es lo primero que se mueve si el sprint se atrasa.
- **Lo que sí aporta valor:** que la familia entre con su rol y que el inventario del sistema coincida con el anaquel. Es la base de dos métricas validadas con la clienta (dejar la libreta y tener menos faltantes) y es prerrequisito del POS del Sprint 2.

### 4.3 Dependencias que el agente no señaló

| Historia | Dependencia | Decisión para el Sprint 1 |
|---|---|---|
| HU-06 (RF-05) | La recepción pide proveedor (A, B, manual u "Otro (ruta)"), pero los proveedores llegan en el Sprint 3 (HU-10, HU-11). | Se cargan por migración los proveedores A, B y "Otro (ruta)" como catálogo fijo. |
| HU-06 (RF-05) | Si el Dueño no captura costo, se toma "el de la oferta vigente", que todavía no existe. | Mientras no haya ofertas se usa el costo de referencia de la ficha (RF-04). **Pendiente de confirmar con el equipo.** |
| HU-06 (RF-06-AC-2) | La marca "Descuadre" la crea RF-19 (Sprint 3). | Se prueba el ajuste de −2 con FEFO; la parte de "quitar Descuadre" se completa en el Sprint 3. |
| HU-01 (RF-01-AC-3) | Las ofertas de proveedor no existen hasta el Sprint 3. | Se prueba el 403 sobre costo, precio y PR de la ficha; el caso de ofertas se agrega en el Sprint 3. |
| HU-01 (RF-01-AC-6) | El catálogo en línea y los pedidos llegan en el Sprint 4. | Se prueba la redirección al login en el Portal Tienda; el resto se completa en el Sprint 4. |
| HU-03 (RF-28-AC-3) | El costo de envío solo se aplica a pedidos, que llegan en el Sprint 4. | Se prueba que el nuevo valor se guarda con su fecha; la verificación sobre pedidos se completa en el Sprint 4. |

## 5. Ajustes acordados

| # | Propuesta del agente | Ajuste | Justificación |
|---|---|---|---|
| S1-01 | Capacidad de 18 SP derivada de la velocidad de 24 SP | **Se conservan 18 SP**, pero sustentados en horas (≈ 17.8 SP, §4.1) | La velocidad de 24 SP no está medida. La velocidad real de este sprint se usará para recalibrar los siguientes. |
| S1-02 | Goal como lista de funciones | **Goal centrado en un resultado verificable** (§5.1) | El goal debe decir qué cambia para la clienta y cómo se comprueba en la Sprint Review. |
| S1-03 | Sin punto de control ni contingencia | **Revisión al final de la semana 1 y orden de contingencia** (§6) | Con margen justo, conviene saber desde ahora qué se mueve primero y no decidirlo bajo presión. |
| S1-04 | Sin dependencias señaladas | **6 decisiones de dependencia**, de las cuales 4 dejan criterios con alcance parcial (§4.3) | Evita que un criterio quede bloqueado por un módulo de otro sprint. |
| S1-05 | Responsables por historia sin revisar la carga | **Carga rebalanceada por tarea** (§5.3) | Con los responsables sugeridos, Víctor quedaba con 16 h y Ángel con 10 h. |

### 5.1 Sprint Goal

> **"Que la familia de la tienda entre a TiendiNet con su propio rol y lleve ahí el catálogo y la existencia por lote, de forma que lo que dice el sistema coincida con lo que hay en el anaquel."**

**Cómo se mide (se comprueba en la Sprint Review):**

| # | Medida | Meta |
|---|---|---|
| M-1 | Demo de acceso: la Dueña da de alta a su hija como co-dueña y a un Empleado; la hija ve costos y cambia un precio; el Empleado intenta ver costos y recibe 403. | Los 3 pasos funcionan en la demo |
| M-2 | Catálogo semilla capturado desde la interfaz (no por script). | 20 productos, al menos 3 perecederos |
| M-3 | Recepciones y un conteo físico registrados por el Empleado; se compara la existencia del sistema contra un conteo de anaquel simulado. | 20 de 20 productos coinciden; cada movimiento tiene usuario, fecha y hora en la auditoría |
| M-4 | Criterios de RF-01, RF-03, RF-04, RF-05, RF-06 y RF-28 con prueba automatizada (`test_RF_XX_AC_Y`) en verde en CI. | 26 de 26 (4 con alcance parcial documentado en §4.3) |
| M-5 | Las pantallas del sprint funcionan en celular (360 px) y en la PC del mostrador. | Lista de verificación RNF-09 completa |

**Por qué es alcanzable:** son 18 SP contra una capacidad calculada de 17.8, sin integraciones externas (Mercado Pago, proveedores) ni concurrencia, que es donde el backlog mostró subestimaciones. El riesgo de quedarse corto está cubierto por la contingencia de §6, que protege el goal: las medidas M-1 a M-3 no dependen de la configuración.

### 5.2 Sprint Backlog

| Historia | SP | Prioridad | RF | Criterios | Horas (tareas) | Dueño de la historia |
|---|---|---|---|---|---|---|
| HU-01 Iniciar sesión por rol | 5 | Alta | RF-01 | 6 | 11 | José |
| HU-03 Administrar usuarios y configuración | 5 | Alta | RF-03, RF-28 | 7 | 11 | Víctor |
| HU-05 Registrar productos | 3 | Alta | RF-04 | 5 | 7 | Ángel |
| HU-06 Registrar recepciones y ajustes | 5 | Alta | RF-05, RF-06 | 8 | 11 | Adrián |
| **Total** | **18** | | | **26** | **40** | |

El dueño de la historia responde por que cumpla la DoD, aunque algunas de sus tareas las haga otro integrante (§5.3). Los dueños se eligieron por lo que cada quien aportó al SRS: José (bloqueo 429 y co-dueño), Víctor (matriz de permisos y configuración), Ángel (venta y catálogo para el POS) y Adrián (definiciones de existencia y disponible). Cada historia la revisa otro integrante (DoD, criterio C2).

**Trabajo técnico base (sin SP, 14 h):**

| Tarea | Horas | Responsable |
|---|---|---|
| Repositorio, ramas, plantilla de PR y GitHub Projects con labels | 2 | Víctor |
| Docker Compose: PostgreSQL, Mailpit, backend y frontend | 3 | Adrián |
| Esqueleto FastAPI + SQLAlchemy + Alembic, pytest y CI en GitHub Actions | 4 | José |
| Esqueleto React + Vite + TypeScript con diseño responsivo y cliente de API | 3 | Ángel |
| Tabla y servicio de auditoría (RNF-07), que usan HU-05 y HU-06 | 2 | Adrián |
| Migración con valores por defecto de configuración y proveedores A, B y "Otro (ruta)" | Incluida en HU-03 y HU-06 | Víctor y Adrián |

Docker Compose pasó de Víctor a Adrián al rebalancear la carga (§5.3).

### 5.3 Carga por persona

| Persona | Rol técnico principal | Tareas (detalle en `tareas_tecnicas.md`) | Horas | Parte de 54 h |
|---|---|---|---|---|
| Ángel | Frontend y QA | Base React, HU-05 completa, pruebas de HU-01, pantallas de HU-06 | 14.5 | 27 % |
| Adrián | Datos/BD y DevOps | Docker, auditoría, modelo y backend de HU-06 | 13.5 | 25 % |
| José (PO) | Backend | Base FastAPI + CI, modelo, backend y pantalla de HU-01 | 13 | 24 % |
| Víctor (SM) | Backend y QA | Repositorio, HU-03 completa | 13 | 24 % |
| **Total** | | **26 tareas** | **54** | 100 % |

José y Víctor quedan con media hora menos que el promedio (13.5 h), que se reserva para su trabajo de PO y SM fuera de los eventos.

### 5.4 Fuera del Sprint 1

| Historia | Motivo |
|---|---|
| HU-14, HU-15 | Dependen de productos e inventario; van al Sprint 2. |
| HU-08, HU-09 | El PR y las alertas necesitan ventas; van al Sprint 2. |
| HU-02 | Primera historia del bloque en línea (Sprint 4). |

## 6. Eventos, seguimiento y contingencia

| Evento | Fecha | Duración | Facilita | Qué se revisa | Si no se cumple |
|---|---|---|---|---|---|
| Sprint Planning | Dom 4 oct | 1.5 h | Víctor (SM) | Este documento | — |
| Daily Scrum (asíncrona en el chat: qué hice, qué haré, qué me bloquea) | Lun a vie | 5–10 min | Víctor da seguimiento | Avance e impedimentos | Víctor gestiona el impedimento ese mismo día. |
| Punto de control | Dom 11 oct (fin de la semana 1) | Parte de la daily | Víctor | Base técnica y HU-01 integradas en `main` | Se aplica la contingencia en el orden de abajo. El goal se mantiene. |
| Sprint Review | Dom 18 oct | 1 h | Víctor facilita; José acepta o rechaza | Medidas M-1 a M-5 | Lo no terminado regresa al Product Backlog; no se entrega a medias. |
| Sprint Retrospective | Dom 18 oct | 0.5 h | Víctor | Velocidad real (SP terminados) y horas reales por SP | Se recalibra la capacidad de los Sprints 2 a 6. |

**Orden de contingencia** (lo primero que se mueve está arriba; lo decide el PO con los Developers):

1. **Configuración de HU-03 (RF-28, unos 2 SP)** pasa al Sprint 5, que tiene holgura (21 SP). Los Sprints 2 a 4 usan los valores por defecto cargados por migración. Para esto, HU-03 se divide en "usuarios" (RF-03) y "configuración" (RF-28). Libera las tareas T-03-1 y T-03-4 y parte de T-03-5 y T-03-6.
2. **Usuarios de HU-03 (RF-03, unos 3 SP)** pasa al Sprint 2. La hija y el Empleado se crean por migración y la medida M-1 se demuestra con esos usuarios.

HU-01, HU-05 y HU-06 no se mueven: sin ellas no se cumple el goal.

## 7. Riesgos

| Riesgo | Mitigación | Responsable |
|---|---|---|
| La base técnica toma más de 14 h (primer uso del stack por parte del equipo). | Punto de control de la semana 1 y orden de contingencia (§6). | Víctor (SM) |
| Las horas reales quedan por debajo de 9 por persona. Con 8 h por semana la capacidad baja a unos 14 SP. | Registrar las horas reales de cada quien durante el sprint; si bajan, aplicar la contingencia sin esperar a la semana 1. | Todos; Víctor da seguimiento |
| La velocidad de los siguientes sprints. Sin trabajo técnico base, 54 h ÷ 2.25 h/SP ≈ 24 SP, igual a lo que asume el plan, pero sin margen. | Confirmar la velocidad real en la Retro y, si es menor, aplicar antes de la semana 7 el orden de recorte del backlog. | José (PO) |
| El costo por defecto en recepciones sin oferta vigente no está definido en el SRS. | Usar el costo de referencia de la ficha y confirmarlo en la planeación; registrar la decisión en el SRS. | José (PO) |

## 8. Cambios al Product Backlog y al tablero

No hay cambios de historias ni de SP: el Sprint 1 queda con HU-01, HU-03, HU-05 y HU-06 (18 SP), como en la v1.2. Se agregan dos notas:

- **HU-03:** si se aplica la contingencia, se divide en usuarios (RF-03, 3 SP) y configuración (RF-28, 2 SP).
- **HU-01, HU-03 y HU-06:** los criterios con alcance parcial de §4.3 se completan en los Sprints 3 y 4.

En GitHub Projects se agrega el issue **HAB-01 · Base técnica del Sprint 1** y las 26 tareas como sub-issues de su historia (`tareas_tecnicas.md` §8).

## 9. Conclusión

El agente acertó en **qué** construir primero: sus cuatro historias respetan las dependencias (sin acceso no hay roles; sin productos no hay inventario ni venta). Su capacidad de 18 SP resultó correcta al recalcularla desde las horas (≈ 17.8 SP), pero la obtuvo de una velocidad que nadie ha medido, y eso deja el sprint con el margen justo. Donde falló fue en el **para qué**: redactó el goal como una lista de funciones. El sprint acordado conserva sus historias, redefine el goal como algo que la clienta puede comprobar (lo que dice el sistema coincide con lo que hay en el anaquel), define desde ahora qué se mueve primero si el tiempo no alcanza y reparte la carga para que nadie quede como cuello de botella.
