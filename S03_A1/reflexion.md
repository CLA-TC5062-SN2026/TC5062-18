# Reflexión: Scrum y el uso de IA en el Product Backlog

**Equipo:** José Ramírez · Ángel Vega · Víctor Jurado · Adrián Cortés
**Fecha:** 04/10/2026

## 1. ¿Qué ventajas y riesgos identificamos en usar un agente de IA para generar el Product Backlog?

Lo que más vivimos al trabajar con el agente fueron dos cosas: **nos ayudó a ver lo que no veíamos** y **tuvimos que corregirlo bastante**. Ambas definen sus ventajas y sus riesgos.

**Ventajas**

- **Ve lo que el equipo no ve.** Al comparar los cuatro SRS individuales, el agente encontró 22 conflictos entre versiones; varios no los habíamos notado, como que dos de nosotros dejábamos cancelar ventas solo al Dueño y otro también al Empleado. En la priorización, nos hizo notar que el corte de caja y las ventas sin internet son baratas (3 y 5 SP) y están ligadas a necesidades que la clienta expresó, y aun así las teníamos al final. Aceptamos esos cambios.
- **Cobertura y trazabilidad.** El backlog cubre los 29 requerimientos del MVP, y cada criterio de aceptación conserva su ID `RF-XX-AC-Y` del SRS, lo que lo liga después al contrato de API y a las pruebas.
- **Consistencia.** Todas las historias salieron con el mismo formato, criterios y estimación Fibonacci. En la revisión discutimos contenido, no forma.

**Riesgos**

- **El borrador parece terminado, pero no lo está.** Hicimos 19 ajustes a la propuesta (`ajustes_backlog.md`). Entre ellos, faltaba el criterio de concurrencia en la historia más crítica del sistema (cobrar en mostrador, HU-14); sin él, la regla "cero sobreventas" no se habría probado. Un backlog bien formateado da una falsa sensación de calidad.
- **Subestima lo difícil.** Estimó en 8 SP el pago en línea y la unificación de proveedores; los subimos a 13 por los webhooks, la conciliación y los dos esquemas distintos.
- **Redacta soluciones en lugar de necesidades.** Por ejemplo, "quiero que el sistema cree un pedido en estado Pendiente de pago". Así ya no se puede negociar con el cliente.
- **Ignora lo que no está escrito.** Propuso bajar la cuenta de cliente casi al final sin ver que el pedido en línea depende de ella.
- **Se pierde el aprendizaje.** Si el equipo solo acepta lo que genera el agente, no desarrolla el criterio para escribir y estimar historias.

**Conclusión:** la generación es rápida, pero el valor real salió de la revisión. El tiempo que se ahorra al escribir hay que invertirlo en revisar.

## 2. ¿Puede un agente reemplazar al Product Owner?

**Nuestra postura: en el contexto de esta simulación, sí. En un proyecto real con un cliente real, todavía no.**

**Por qué sí en esta simulación.** El trabajo del PO en esta actividad era ordenar el backlog por valor de negocio y justificar ese orden, y el agente lo hizo bien. Su priorización coincidió en buena medida con la nuestra (correlación de 0.77), sus justificaciones se apoyaron en evidencia de la entrevista, y aceptamos sus cuatro propuestas de cambio. Aquí la fuente de verdad es un documento (el SRS) y no hay un cliente con quien negociar en tiempo real, así que el agente tiene la misma información que tendría un PO humano.

**Los límites que vimos, aun en la simulación:**

1. **No ve dependencias técnicas.** Su propuesta de bajar la cuenta de cliente al lugar 20 habría bloqueado todo el bloque en línea; tuvimos que ajustarla. Un PO real consulta al equipo antes de reordenar.
2. **No puede validar con el cliente.** Varios valores del SRS (zona de entrega, pedido mínimo, horario) están marcados ⚑ porque nadie los ha confirmado con la clienta. El agente identificó el problema y propuso un prototipo, pero no puede sentarse con ella a probarlo.
3. **No rinde cuentas.** Si una decisión de prioridad sale mal, alguien del equipo tiene que responder ante el cliente; el agente no.

En un proyecto real el PO negocia, maneja expectativas, cambia de opinión con información que nunca llega a un documento y asume la responsabilidad del producto. Para eso el agente sigue siendo un **asistente muy capaz del PO**, no su reemplazo.

## 3. ¿Cómo afecta la calidad del SRS a la calidad del backlog generado?

**Directamente: el agente amplifica lo que recibe, lo bueno y lo malo.**

- **Un SRS con criterios verificables produce historias verificables.** Como `SRS_equipo.md` ya tenía criterios Dado que / cuando / entonces con datos concretos ($38.50, PR 5, 15 minutos), al pedirle al agente que los reutilizara los criterios salieron listos para probarse. Cuando redactó criterios por su cuenta, sin anclarse al SRS, aparecieron frases vagas como "el reporte se muestra correctamente" (HU-04, ajuste A-03).
- **Lo que no está en el SRS no aparece en el backlog.** El saldo a favor, la entrega fallida por cliente ausente y la política de respaldos son pendientes del SRS, y ninguno generó historia. El agente no inventó requisitos, lo cual es correcto, pero tampoco los señaló como huecos.
- **Las contradicciones del SRS se heredan.** Si hubiéramos alimentado al agente con los cuatro SRS individuales en lugar del consolidado, habría generado historias incompatibles entre sí, por ejemplo cancelación solo por el Dueño y cancelación por el Empleado. Por eso fue clave hacer primero la Parte 0 y resolver los 22 conflictos antes de generar el backlog.
- **Los errores de prioridad del SRS también se propagan.** El corte de caja y las ventas diferidas quedaron como Should en el SRS por haberse integrado tarde, y ese error pasó al backlog hasta que la priorización del agente-PO lo detectó.

**Conclusión:** el tiempo invertido en consolidar el SRS fue lo que más mejoró el backlog. Un SRS ambiguo habría dado un backlog bien formateado pero equivocado, y el formato pulido habría hecho más difícil notar los errores.
