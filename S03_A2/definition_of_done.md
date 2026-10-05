# Definition of Done: TiendiNet

| Campo | Valor |
|---|---|
| Versión | 1.0 (vigente desde el Sprint 1) |
| Fecha | 04/10/2026 |
| Contexto | Equipo de 4 estudiantes, 8-9 h por semana cada uno. CI básico (lint y pruebas en GitHub Actions) desde el Sprint 1, **sin CD**: no hay despliegue automático y el sistema corre localmente con Docker Compose |
| Revisión | En cada Retrospective; cualquier cambio se registra en la sección 7 |

## 1. Propósito

La Definition of Done (DoD) es el compromiso de calidad que comparte todo el equipo: una historia **solo** se considera terminada, y solo se presenta en la Sprint Review, cuando cumple todos los puntos de esta lista. No se negocia historia por historia: si algo no cumple la DoD, regresa al Product Backlog.

| Rol | Responsabilidad sobre la DoD |
|---|---|
| **Developers** | Aplican la DoD a cada tarea e historia antes de moverla a **Hecho**. |
| **Scrum Master** (Víctor) | Vigila que se cumpla. Si se vuelve inalcanzable o insuficiente, lo lleva a la Retro. |
| **Product Owner** (José) | Acepta o rechaza historias en la Review contra sus criterios de aceptación. **No puede pedir que se omita la DoD** para meter más alcance. |

## 2. Propuesta del agente

Se pidió al agente: "Propón una Definition of Done para TiendiNet". Su propuesta, resumida:

1. Pipeline de CI en verde (build, lint, pruebas) en cada PR.
2. Cobertura de pruebas ≥ 90 %.
3. Despliegue automático a un ambiente de *staging*.
4. Pruebas de carga que cumplan los RNF de rendimiento.
5. Análisis estático de seguridad (SAST) sin hallazgos críticos.
6. Accesibilidad WCAG 2.1 AA verificada con herramienta automática.
7. Revisión de código por al menos 2 personas.
8. Documentación de API actualizada.
9. Pruebas end-to-end automatizadas en navegador.
10. Cero defectos conocidos.
11. Aprobación del Product Owner.
12. Manual de usuario actualizado.

## 3. Ajustes y justificación

La propuesta es de equipo profesional con infraestructura que todavía no tenemos. Se ajustó así:

| Punto del agente | Decisión | Justificación |
|---|---|---|
| 1. CI en verde | **Se conserva, acotado** | En el Sprint 1 se monta un CI básico en GitHub Actions (tarea T-B-3): `ruff`, `eslint` y `pytest` en cada PR. No incluye build de imágenes ni despliegue. |
| 2. Cobertura ≥ 90 % | **Ajustado a ≥ 70 %** | Es la meta de RNF-16 del SRS. 90 % no es realista con 8-9 h por semana y obligaría a probar código trivial. |
| 3. Despliegue a *staging* | **Reemplazado** | El SRS define ejecución local con Docker Compose. La historia debe funcionar con `docker compose up` en una máquina limpia. |
| 4. Pruebas de carga | **Movido a la DoD de release** | Los RNF de rendimiento se miden con k6 antes de la entrega final, no en cada historia. |
| 5. SAST | **Reemplazado** | Sin herramienta en pipeline. Se cubre con revisión manual: sin secretos en el código y permisos por rol probados. |
| 6. WCAG AA automática | **Simplificado** | Se verifica lo que pide RNF-09: 360 px sin scroll horizontal, controles de 44 px y texto de 16 px. |
| 7. Revisión por 2 personas | **Ajustado a 1** | Con 4 integrantes y poco tiempo, 2 revisores frenaría el flujo; 1 revisor distinto al autor es suficiente. |
| 8. Documentación de API | **Se conserva** | Es la base de la trazabilidad: OpenAPI con los IDs `RF-XX-AC-Y`. |
| 9. E2E automatizadas | **Adaptado** | La prueba de punta a punta es la demo guionizada de la Sprint Review (medidas M-1 a M-3). Playwright se evaluará en el Sprint 5. |
| 10. Cero defectos conocidos | **Ajustado** | Cero defectos que rompan un criterio de aceptación. Los menores se registran como issue con label `bug`. |
| 11. Aprobación del PO | **Se conserva** | En la Sprint Review, contra los criterios de aceptación. |
| 12. Manual de usuario | **Movido a la DoD de release** | Se escribe al final del curso; por historia basta con actualizar el README si cambia cómo correr el sistema. |
| *(no lo propuso)* | **Agregado:** auditoría y migraciones | El SRS exige auditar operaciones sensibles (RNF-07), y sin migraciones el ambiente no es reproducible. |
| *(no lo propuso)* | **Agregado:** prueba nombrada con el ID del criterio | Es la regla de trazabilidad del proyecto: cada criterio tiene `test_RF_XX_AC_Y`. |

## 4. DoD final

### 4.1 DoD de una historia de usuario

Una historia está **terminada** cuando cumple **todos** estos puntos.

**Código**

| # | Criterio | Cómo se verifica |
|---|---|---|
| C1 | El código está en `main` mediante un Pull Request ligado al issue (`Closes #N`). | El PR aparece en el issue; `main` está protegido. |
| C2 | Al menos **1 integrante distinto al autor** revisó y aprobó el PR. | Aprobación visible en el PR. |
| C3 | Sin errores de linter: `ruff` en backend y `eslint` en frontend. | El CI del PR está en verde. |
| C4 | Sin contraseñas, tokens ni llaves en el código; la configuración va en variables de entorno. | Revisión del revisor (lista en la plantilla de PR). |
| C5 | Si cambia la BD, incluye migración de Alembic que aplica y revierte. | `alembic upgrade head` y `alembic downgrade -1` corren sin error. |

**Pruebas**

| # | Criterio | Cómo se verifica |
|---|---|---|
| P1 | **Cada criterio de aceptación** de los RF de la historia (`SRS_equipo.md`) tiene una prueba automatizada llamada `test_RF_XX_AC_Y` y pasa. Si el criterio tiene alcance parcial documentado en el Sprint Planning (◐), la prueba cubre la parte acordada y queda un issue para completarla en el sprint indicado. | CI en verde; las pruebas aparecen con su ID en el log del CI. |
| P2 | La **suite completa** pasa, no solo las pruebas nuevas. | CI en verde. |
| P3 | Cobertura del backend **≥ 70 %** (RNF-16). | El autor pega el resumen de `pytest-cov` en el PR (el CI aún no aplica el umbral; ver §6). |
| P4 | Las pantallas se probaron manualmente en **celular (360 px)** y en **PC** con Chrome. | El autor lo marca en la plantilla de PR, con captura. |
| P5 | Los permisos por rol están probados: un rol no autorizado recibe 403 también por API directa. | Prueba automatizada (por ejemplo, `test_RF_01_AC_3`). |

**Funcionalidad y seguridad**

| # | Criterio | Cómo se verifica |
|---|---|---|
| F1 | Cumple todos los criterios de aceptación de sus RF en `SRS_equipo.md`. | Checkboxes del issue marcados. |
| F2 | Las operaciones sensibles (ventas, cancelaciones, ajustes, cambios de precio, de PR o de estado) se registran en auditoría. | Prueba sobre la tabla de auditoría. |
| F3 | Funciona en el ambiente integrado con `docker compose up`, no solo en la máquina del autor. | El revisor lo levanta con Docker antes de aprobar; se confirma en la demo de la Review. |
| F4 | El Product Owner la aceptó en la Sprint Review. | Comentario del PO en el issue. |

**Documentación**

| # | Criterio | Cómo se verifica |
|---|---|---|
| D1 | Los endpoints nuevos o modificados aparecen en OpenAPI con los IDs `RF-XX-AC-Y` en su descripción. | Revisión en `/docs`. |
| D2 | El README se actualiza si cambia cómo instalar, configurar o correr el sistema. | Revisión del PR. |

**Tablero**

| # | Criterio | Cómo se verifica |
|---|---|---|
| T1 | Todas las tareas (sub-issues) de la historia están cerradas. | Barra de avance al 100 %. |
| T2 | La historia está en **Hecho** en GitHub Projects y su issue cerrado. | Tablero. |

### 4.2 DoD de una tarea técnica

Una tarea está terminada cuando:

1. Cumple su **criterio de done** (`tareas_tecnicas.md`).
2. Su código está en un PR revisado, o integrado si el PR agrupa varias tareas de la misma historia.
3. Sus pruebas pasan y no rompe la suite existente.
4. Su sub-issue está cerrado.

### 4.3 DoD del sprint

El sprint está terminado cuando:

1. Las historias comprometidas cumplen la DoD de historia, o las que no la cumplen regresaron al Product Backlog con explicación.
2. El Sprint Goal se midió con sus indicadores (`sprint1_planning.md` §5.1).
3. Se hicieron la Review y la Retrospective, y los acuerdos de la Retro quedaron como issues.

## 5. Plantilla de Pull Request

Para que la DoD se aplique sin depender de la memoria, se agrega a `.github/pull_request_template.md` (tarea T-B-1):

```markdown
## Historia / tarea
Closes #

## Checklist DoD
- [ ] Hay una prueba `test_RF_XX_AC_Y` por criterio (◐ si tiene alcance parcial, con issue de seguimiento)
- [ ] CI en verde (`ruff`, `eslint`, `pytest`)
- [ ] Cobertura ≥ 70 % (pegar resumen de `pytest-cov`)
- [ ] Lo levanté con `docker compose up` (revisor)
- [ ] Migración Alembic aplica y revierte (si aplica)
- [ ] Sin secretos en el código
- [ ] Probado en 360 px y en PC (adjuntar captura, si hay pantalla)
- [ ] Endpoints documentados en OpenAPI con IDs RF-XX-AC-Y
- [ ] README actualizado (si cambia cómo correr el sistema)
```

## 6. Evolución prevista

| Cuándo | Cambio | Puntos que se endurecen |
|---|---|---|
| Sprint 3 | El CI aplica el umbral de cobertura (falla si baja de 70 %) y levanta Docker Compose para correr las pruebas contra PostgreSQL. | P3 y F3 se verifican en automático. |
| Sprint 5 | Prueba E2E automatizada con Playwright del flujo de pedido en línea. | F3 se automatiza. |
| Release (Sprint 6) | DoD de release: pruebas de carga con k6 (RNF-01, RNF-02), manual de usuario y prueba de aceptación con la clienta. | Puntos 4 y 12 del agente. |

## 7. Historial de cambios

| Versión | Fecha | Cambio | Acordado en |
|---|---|---|---|
| 1.0 | 04/10/2026 | Versión inicial ajustada a partir de la propuesta del agente; CI básico desde el Sprint 1. | Sprint 1 Planning |
