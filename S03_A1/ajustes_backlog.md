# Ajustes al backlog propuesto por el agente

| Campo | Valor |
|---|---|
| Fecha | 04/10/2026 |
| Entrada | Propuesta del agente (v1.0): 5 épicas, 24 historias, 129 SP |
| Salida | `backlog_completo.md` (v1.1): 5 épicas, 24 historias, 134 SP |
| Método | Cada integrante revisó una épica con la lista INVEST y contra `SRS_equipo.md`; EP-01 se revisó en conjunto. Los cambios se discutieron y aprobaron en equipo. |

## 1. Criterios de revisión

Cada historia se revisó contra estas preguntas:

1. **Redacción:** ¿el rol existe en el SRS (Dueño, Empleado, Cliente)? ¿El "quiero" describe una necesidad del usuario y no una solución técnica? ¿El "para" expresa valor de negocio?
2. **INVEST:** ¿es independiente, negociable, valiosa, estimable, pequeña (≤ 8 SP idealmente) y verificable?
3. **Criterios:** ¿hay al menos 2? ¿Usan los IDs `RF-XX-AC-Y` del SRS? ¿Cubren el caso feliz **y** al menos un caso de error?
4. **Estimación:** ¿es coherente con la historia de referencia (HU-05 = 3 SP) y con el riesgo técnico?
5. **Prioridad:** ¿coincide con el MoSCoW del SRS?
6. **Alcance:** ¿la historia pertenece al MVP o es Fase 2?

## 2. Registro de ajustes

| # | Historia | Tipo | Propuesta del agente | Versión final | Justificación | Revisó |
|---|---|---|---|---|---|---|
| A-01 | HU-03 | Redacción | "Como **administrador**, quiero gestionar usuarios…" | "Como **Dueña de la tienda**, quiero dar de alta a mi hija como co-dueña y a mis empleados…" | El rol "administrador" no existe en el SRS; la historia ahora refleja el caso real validado con la clienta. | Equipo |
| A-02 | HU-02 | Estimación | 5 SP | 3 SP | Reutiliza la autenticación de HU-01; solo agrega registro y recuperación por correo. | Equipo |
| A-03 | HU-04 | Criterios | "El reporte se muestra correctamente" | RF-29-AC-1, AC-2, AC-3 y AC-5 con datos concretos | El criterio original no era verificable. Se agregó el caso de acceso denegado al Empleado. | Equipo |
| A-04 | Todas | Criterios | Criterios redactados libremente, sin ID | Criterios tomados del SRS con su ID `RF-XX-AC-Y` | Mantiene una sola fuente de verdad y deja trazabilidad hacia el contrato de API y las pruebas. | Equipo |
| A-05 | HU-08 y HU-09 | División | Una sola historia, "Punto de reorden y alertas", de 13 SP | HU-08 Punto de reorden (8 SP) y HU-09 Alertas (5 SP) | 13 SP no cabe con holgura en un sprint, y las alertas se pueden entregar con el PR inicial antes de terminar el cálculo automático. | Adrián |
| A-06 | HU-09 | Criterios | Alerta solo al vender | Se agrega RF-09-AC-2 (alerta al apartar por pedido) y RF-09-AC-5 (alerta resuelta) | El disponible también baja por apartados; sin ese criterio la tienda en línea podría agotar un producto sin aviso. | Adrián |
| A-07 | HU-06 | División / estimación | "Registrar recepción" (3 SP) y "Registrar ajustes" (3 SP) por separado | Una historia "Registrar recepciones y ajustes" (5 SP) | Comparten el modelo de lotes, FEFO y auditoría; separadas duplicaban trabajo. | Adrián |
| A-08 | HU-07 | Prioridad | Alta | Media | En el SRS RF-07 es Should; el control de lotes (la parte crítica) ya llega con HU-06. | Adrián |
| A-09 | HU-10 | Estimación | 8 SP | 13 SP | Son dos adaptadores con esquemas distintos, más validación de rechazos, vinculación de productos y manejo de error de conexión. Se marca para dividir al planear el Sprint 3. | Víctor |
| A-10 | HU-11 | Alcance | Comparación solo de proveedores sincronizados | Se integra la captura manual de ofertas (RF-11) | La clienta recibe precios por WhatsApp; sin eso la comparación no refleja su realidad. | Víctor |
| A-11 | HU-12 y HU-13 | División / prioridad | Una sola historia, "Sugerencia y propuesta de compra", de 5 SP con prioridad Alta | HU-12 Sugerencia (3 SP, Media) y HU-13 Propuesta (3 SP, Baja) | RF-13 es Should y RF-14 es Could; juntas ocultaban qué se recorta primero. | Víctor |
| A-12 | HU-14 | Criterios | Solo caso feliz y efectivo insuficiente | Se agregan RF-16-AC-5 (apartado) y RF-16-AC-6 (concurrencia) | La regla "cero sobreventas" (RNF-06) es la más crítica del sistema y no estaba cubierta. | Ángel |
| A-13 | HU-15 | Redacción | "Como **Dueño**, quiero cancelar una venta…" | "Como **Empleado o Dueño**…" | Contradecía la resolución C-04 del SRS: el Empleado también cancela, limitado por el corte de caja. | Ángel |
| A-14 | HU-15 | División | "Ver comprobante" (2 SP) y "Cancelar venta" (3 SP) por separado | Una historia (5 SP) | El comprobante solo no aporta valor independiente; se usa al consultar o cancelar. | Ángel |
| A-15 | HU-16 | Alcance / estimación | "Como Empleado, quiero vender sin internet y sincronizar después" (8 SP) | "Capturar ventas sin internet" con su hora real (5 SP) | La operación offline es RF-30 (Fase 2). En el MVP aplica la captura diferida (RF-19). | Ángel |
| A-16 | HU-19 | Redacción | "…quiero que el sistema cree un pedido en estado Pendiente de pago…" | "…quiero armar mi carrito y elegir recoger en tienda o envío a domicilio…" | El texto original describía la implementación, no la necesidad del cliente. | José |
| A-17 | HU-18 | Criterios | Sin regla de productos restringidos | Se agrega RF-21-AC-2 | Vender alcohol o tabaco en línea es un riesgo legal (RD-01). | José |
| A-18 | HU-20 | Estimación | 8 SP | 13 SP | Webhooks con firma, idempotencia, conciliación cada 10 minutos, pagos tras expiración y validación de monto. Se marca para dividir en el Sprint 4. | José |
| A-19 | HU-22 | Prioridad | Alta | Media | RF-25 es Should; el pedido funciona sin el flujo de sustitutos. | José |

Además, la priorización comparada (Parte 3) produjo cambios posteriores, documentados en `priorizacion_comparada.md`: HU-17 y HU-16 subieron de Media a Alta y pasaron al Sprint 3, HU-02 pasó del Sprint 1 al 4 y HU-03 del Sprint 3 al 1.

## 3. Resumen

| Tipo de ajuste | Cantidad | Historias |
|---|---|---|
| Redacción | 3 | HU-03, HU-15, HU-19 |
| Estimación | 4 | HU-02, HU-06, HU-10, HU-20 |
| Criterios | 5 | Todas, HU-04, HU-09, HU-14, HU-18 |
| Prioridad | 3 | HU-07, HU-12/13, HU-22 |
| División o fusión | 4 | HU-06, HU-08/09, HU-12/13, HU-15 |
| Alcance | 2 | HU-11, HU-16 |

| Integrante | Épica revisada | Ajustes |
|---|---|---|
| Adrián Cortés | EP-02 Catálogo e inventario | A-05 a A-08 |
| Víctor Jurado | EP-03 Proveedores y compras | A-09 a A-11 |
| Ángel Vega | EP-04 Punto de venta | A-12 a A-15 |
| José Ramírez | EP-05 Tienda en línea y pedidos | A-16 a A-19 |
| Equipo | EP-01 y criterios generales | A-01 a A-04 |

**Efecto neto:** el número de historias no cambió (24), porque 2 divisiones se compensaron con 2 fusiones. El esfuerzo subió de 129 a 134 SP (+5): pagos y proveedores se subestimaron (+10), y el ajuste a la operación offline y la reutilización de autenticación lo bajaron (−5).

**Patrón observado:** el agente subestimó lo que tiene integración externa o concurrencia (pagos, proveedores, sobreventa) y a veces redactó soluciones técnicas en lugar de necesidades. Acertó en la estructura de épicas y en la cobertura de los RF.
