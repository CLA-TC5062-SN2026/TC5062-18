# Priorización comparada: agente como Product Owner vs. equipo

| Campo | Valor |
|---|---|
| Fecha | 04/10/2026 |
| Backlog | `backlog_completo.md` (24 historias, 134 SP) |
| Priorización del agente | Rol de Product Owner, ordenando solo por valor de negocio |
| Priorización del equipo | MoSCoW de `SRS_equipo.md` más dependencias técnicas y riesgo (orden del backlog antes de esta comparación) |
| Resultado | 4 propuestas del agente aceptadas (1 con ajuste); backlog actualizado a v1.2 |

## 1. Instrucción dada al agente

> "Actúa como Product Owner de TiendiNet. Prioriza las 24 historias de `backlog_completo.md` según el valor de negocio para la dueña de la tienda. Usa como evidencia lo validado en la entrevista: dejar la libreta, tener menos faltantes, cuadrar la caja cada día y decidir una compra en unos 5 minutos. Justifica por qué unas historias van al tope y otras al fondo."

## 2. Priorización del agente (Product Owner)

| # | Historia | SP | Justificación del agente |
|---|---|---|---|
| 1 | HU-14 Cobrar venta en mostrador | 8 | Es la operación de todos los días (unas 200 ventas diarias) y sustituye la libreta. Sin ella no hay producto. |
| 2 | HU-05 Registrar productos | 3 | Sin catálogo no se puede vender. |
| 3 | HU-06 Recepciones y ajustes | 5 | Un inventario que no coincide con el anaquel invalida todo lo demás. |
| 4 | HU-01 Iniciar sesión por rol | 5 | La clienta pidió que la hija tenga acceso completo y los empleados no vean costos. |
| 5 | HU-17 Corte de caja | 3 | Es una métrica de éxito explícita: "cuadrar la caja cada día". Mucho valor con poco esfuerzo. |
| 6 | HU-09 Alertas de reorden | 5 | Es la métrica "menos faltantes". |
| 7 | HU-08 Punto de reorden | 8 | Hace útiles las alertas. |
| 8 | HU-15 Comprobante y cancelación | 5 | Los errores de cobro pasan a diario. |
| 9 | HU-16 Ventas sin internet | 5 | El internet de la tienda es intermitente (validado). Sin esto, el inventario se descuadra. |
| 10 | HU-11 Comparar ofertas | 5 | Es la métrica "decidir una compra en 5 minutos", e incluye los precios de WhatsApp. |
| 11 | HU-10 Unificar proveedores | 13 | Automatiza la comparación, pero HU-11 ya aporta valor con captura manual. |
| 12 | HU-03 Usuarios y configuración | 5 | Necesaria para dar de alta a la hija; sin urgencia el primer día. |
| 13 | HU-07 Caducidades | 5 | Reduce merma de perecederos, que es dinero perdido. |
| 14 | HU-18 Catálogo en línea | 3 | Empieza el bloque en línea. |
| 15 | HU-19 Crear pedido | 8 | |
| 16 | HU-20 Pago en línea | 13 | |
| 17 | HU-21 Preparar y entregar pedidos | 8 | |
| 18 | HU-23 Seguir y cancelar pedidos | 3 | |
| 19 | HU-24 Reembolsos y no recogidos | 5 | |
| 20 | HU-02 Cuenta de cliente | 3 | Por sí sola no genera ventas. |
| 21 | HU-12 Sugerir proveedor | 3 | La comparación ya permite decidir; la sugerencia es comodidad. |
| 22 | HU-04 Reportes | 5 | Útil cuando ya hay meses de datos. |
| 23 | HU-22 Faltantes del pedido | 5 | Caso de excepción. |
| 24 | HU-13 Propuesta de compra | 3 | La dueña ya hace su lista; menor valor marginal. |

**Argumento del agente para el bloque en línea (posiciones 14 a 20):** la clienta no tiene experiencia vendiendo en línea, sus clientes son vecinos y familia que compran en persona, y los valores de envío y horario (⚑) no están validados. Recomienda no invertir los 43 SP del bloque antes de probar un prototipo con clientes reales.

## 3. Comparación

| Historia | Equipo | Agente | Diferencia |
|---|---|---|---|
| HU-01 Iniciar sesión | 1 | 4 | −3 |
| HU-05 Registrar productos | 2 | 2 | 0 |
| HU-06 Recepciones y ajustes | 3 | 3 | 0 |
| HU-14 Cobrar venta | 4 | 1 | +3 |
| HU-15 Comprobante y cancelación | 5 | 8 | −3 |
| HU-08 Punto de reorden | 6 | 7 | −1 |
| HU-09 Alertas | 7 | 6 | +1 |
| **HU-02 Cuenta de cliente** | **8** | **20** | **−12** |
| HU-10 Unificar proveedores | 9 | 11 | −2 |
| HU-11 Comparar ofertas | 10 | 10 | 0 |
| HU-03 Usuarios y configuración | 11 | 12 | −1 |
| HU-18 Catálogo en línea | 12 | 14 | −2 |
| HU-19 Crear pedido | 13 | 15 | −2 |
| HU-20 Pago en línea | 14 | 16 | −2 |
| HU-21 Preparar y entregar | 15 | 17 | −2 |
| HU-23 Seguir y cancelar | 16 | 18 | −2 |
| HU-24 Reembolsos | 17 | 19 | −2 |
| **HU-17 Corte de caja** | **18** | **5** | **+13** |
| **HU-07 Caducidades** | **19** | **13** | **+6** |
| **HU-16 Ventas sin internet** | **20** | **9** | **+11** |
| HU-22 Faltantes del pedido | 21 | 23 | −2 |
| HU-04 Reportes | 22 | 22 | 0 |
| HU-12 Sugerir proveedor | 23 | 21 | +2 |
| HU-13 Propuesta de compra | 24 | 24 | 0 |

Diferencia positiva = el agente la sube. Correlación de Spearman entre ambas listas: **ρ = 0.77**.

## 4. Análisis

### ¿Coinciden?

En lo esencial, sí. Una correlación de 0.77 indica un acuerdo alto:

- **Tope:** 7 de las 8 primeras historias son las mismas en ambas listas (productos, inventario, venta, login, cancelación, PR y alertas). Los dos vemos el POS con inventario confiable como el corazón del MVP.
- **Fondo:** HU-04, HU-12, HU-13 y HU-22 quedan en las últimas 6 en ambas listas. Son comodidades o casos de excepción.
- **Bloque en línea:** queda en el mismo orden interno en ambas; el agente solo lo baja 2 lugares.

### ¿Dónde difieren y por qué?

| Historia | Diferencia | Razón del agente | Razón del equipo |
|---|---|---|---|
| HU-17 Corte de caja | Agente 5, equipo 18 | Es una métrica de éxito explícita de la clienta y cuesta solo 3 SP. | La tratamos como Should porque así quedó en el SRS al integrarla tarde (decisión C-07). No consideramos su costo bajo. |
| HU-16 Ventas sin internet | Agente 9, equipo 20 | El internet intermitente está validado; cada caída descuadra inventario y caja. | La vimos como parche temporal de una funcionalidad de Fase 2 (RF-30). |
| HU-07 Caducidades | Agente 13, equipo 19 | La merma de perecederos es dinero perdido. | El lote con fecha ya se captura en HU-06; los avisos son un extra. |
| HU-02 Cuenta de cliente | Agente 20, equipo 8 | Por sí sola no genera ventas. | **Es prerrequisito técnico** de HU-19 a HU-24: sin cuenta no hay pedido. El agente ordenó solo por valor e ignoró la dependencia. |
| Tienda en línea | Agente la baja 2 lugares | El valor no está validado con la clienta. | Es parte obligatoria del alcance del proyecto (`proyecto_base.md`), y el pago es el mayor riesgo técnico, así que conviene enfrentarlo a la mitad del curso, no al final. |

**La causa de fondo:** cada lista optimiza algo distinto.

- **El agente** optimizó solo **valor para la clienta**, con la evidencia de la entrevista. Por eso premió historias pequeñas ligadas a métricas de éxito (corte de caja, ventas diferidas).
- **El equipo** optimizó **valor + dependencias + riesgo técnico + requisitos del curso**. Por eso adelantó HU-02 (habilita el bloque en línea) y mantuvo pagos a la mitad del calendario.

El agente no conoce restricciones que no están en el SRS, como el calendario de entregas del curso o que la tienda en línea es obligatoria para aprobar. Tampoco consideró dependencias técnicas al ordenar.

### Criterio del equipo

Nuestra priorización no tiene un criterio dominante: es una **mezcla de valor, dependencias técnicas y riesgo**, con los requisitos del curso como piso (lo obligatorio no se negocia). El agente usó una sola variable, el valor para la clienta. Esa diferencia explica casi todas las discrepancias de la tabla.

### Decisiones del equipo

Después de discutir los argumentos del agente, **aceptamos sus cuatro propuestas**. Una se ajustó para no romper una dependencia:

| Propuesta del agente | Decisión | Cambio en el backlog |
|---|---|---|
| Subir HU-17 Corte de caja | **Aceptada.** El argumento de valor por esfuerzo es correcto: 3 SP para una métrica de éxito explícita, y no depende de nada pendiente. | Media → Alta; del Sprint 5 al 3. |
| Adelantar HU-16 Ventas sin internet | **Aceptada.** El internet intermitente está validado, y cada caída descuadra inventario y caja; el costo de esperar es real. | Media → Alta; del Sprint 6 al 3. |
| Bajar HU-02 Cuenta de cliente | **Aceptada con ajuste.** Tiene razón en que no aporta valor por sí sola, pero HU-19 (crear pedido) depende de ella. No la mandamos al lugar 20, sino al inicio del bloque en línea. | Del Sprint 1 al 4, como primera historia del bloque. En su lugar entra HU-03 (usuarios y configuración) al Sprint 1. |
| Validar la tienda en línea antes de construirla | **Aceptada.** Los valores ⚑ (zona, mínimo de envío, horario) no están validados con la clienta. | Prototipo navegable con la clienta en el Sprint 3; la construcción sigue en el Sprint 4. |

**Orden final de los sprints** (`backlog_completo.md` v1.2):

| Sprint | Antes (equipo) | Después (con propuestas del agente) |
|---|---|---|
| 1 | HU-01, HU-02, HU-05, HU-06 | HU-01, **HU-03**, HU-05, HU-06 |
| 2 | HU-08, HU-09, HU-14, HU-15 | Sin cambio |
| 3 | HU-03, HU-10, HU-11 | HU-10, HU-11, **HU-16**, **HU-17** + validación del prototipo |
| 4 | HU-18, HU-19, HU-20 | **HU-02**, HU-18, HU-19, HU-20 |
| 5 | HU-07, HU-17, HU-21, HU-23, HU-24 | HU-07, HU-21, HU-23, HU-24 |
| 6 | HU-04, HU-12, HU-13, HU-16, HU-22 | HU-04, HU-12, HU-13, HU-22 |

## 5. Conclusión

La priorización del agente fue útil como **segunda opinión centrada en el cliente**. Detectó dos historias baratas y valiosas (corte de caja y ventas sin internet) que habíamos dejado para el final, y nos hizo cuestionar construir la tienda en línea sin validarla. Aceptamos sus cuatro propuestas, pero una tuvo que ajustarse porque el agente no ve las dependencias técnicas: sin ese ajuste, el bloque en línea se habría quedado sin cuenta de cliente. El orden final usa el valor del agente como guía y las dependencias del equipo como restricción.
