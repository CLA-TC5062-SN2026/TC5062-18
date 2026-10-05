# Tareas técnicas del Sprint 1: TiendiNet

| Campo | Valor |
|---|---|
| Sprint | 1 (5 al 18 de octubre de 2026) |
| Historias | HAB-01 Base técnica · HU-01 · HU-03 · HU-05 · HU-06 |
| Tareas | 26 · 54 h (14 h de base técnica + 40 h de historias) |
| Referencia | 2.25 h/SP (`sprint1_planning.md` §4.1) |

## 1. Convenciones

- **Tamaño:** cada tarea dura **4 h o menos**. Si crece durante el sprint, se divide y se avisa en la daily.
- **Responsable y rol:** cada tarea tiene una persona y un rol técnico (Backend, Frontend, Datos/BD, DevOps o QA). El dueño de la historia responde por su DoD aunque otra persona haga alguna tarea.
- **Criterio de done:** se comprueba con un comando, una prueba con ID o un comportamiento observable. Además aplica la DoD de tarea (`definition_of_done.md` §4.2).
- **IDs:** `T-<historia>-<n>`, por ejemplo `T-01-2`. La base técnica usa `T-B-<n>`. Las pruebas se nombran con el criterio que verifican: `test_RF_01_AC_1`.
- **Alcance parcial:** los criterios marcados con ◐ se prueban solo en la parte que el Sprint 1 permite (`sprint1_planning.md` §4.3).

## 2. HAB-01 · Base técnica (14 h)

| ID | Tarea | Rol | Responsable | h | Depende de | Criterio de done |
|---|---|---|---|---|---|---|
| T-B-1 | Repositorio, ramas, protección de `main`, plantilla de PR con la DoD y labels de GitHub Projects | DevOps | Víctor | 2 | — | `main` exige PR con 1 aprobación; existe la plantilla de PR; están las labels `tarea` y `rol:*`. |
| T-B-2 | Docker Compose con PostgreSQL, Mailpit, backend y frontend | DevOps | Adrián | 3 | T-B-1 | `docker compose up` levanta los 4 servicios en una máquina limpia siguiendo el README. |
| T-B-3 | Esqueleto FastAPI + SQLAlchemy + Alembic, pytest con BD de prueba, y CI en GitHub Actions (`ruff` + `pytest`) | Backend | José | 4 | T-B-2 | `GET /health` responde 200; `alembic upgrade head` corre; el CI se ejecuta en cada PR y falla si falla una prueba. |
| T-B-4 | Esqueleto React + Vite + TS: rutas, layout responsivo y cliente de API que envía el token; `eslint` en el CI | Frontend | Ángel | 3 | T-B-1 | La app corre; no hay scroll horizontal a 360 px; `eslint` corre en el CI. |
| T-B-5 | Tabla de auditoría y servicio `registrar_auditoria()` (RNF-07) | Datos/BD | Adrián | 2 | T-B-3 | Guarda usuario, fecha y hora, operación, entidad y valores anterior y nuevo; una prueba confirma que la API no permite borrar ni editar registros. |

## 3. HU-01 · Iniciar sesión por rol (5 SP · 11 h · dueño: José)

| ID | Tarea | Rol | Responsable | h | Depende de | Criterio de done |
|---|---|---|---|---|---|---|
| T-01-1 | Modelo `Usuario` (correo único, hash, rol, activo) + migración + seed de Dueño, Empleado y Cliente de prueba | Datos/BD | José | 1.5 | T-B-3 | La migración aplica y revierte; los hashes son bcrypt de costo ≥ 10. |
| T-01-2 | `POST /auth/login` con bcrypt, JWT con rol y 401 genérico | Backend | José | 2 | T-01-1 | Responde 200 con JWT al Dueño activo y 401 "Correo o contraseña incorrectos" a credenciales malas o cuenta inactiva; la contraseña no aparece en logs. |
| T-01-3 | Dependencia `requiere_rol()` y validación de cuenta activa en cada petición | Backend | José | 1.5 | T-01-2 | Un Empleado recibe 403 al pedir costo, precio o PR por API directa; un Cliente recibe 403 en endpoints del Portal Tienda. |
| T-01-4 | Bloqueo tras 5 intentos fallidos por correo + IP durante 15 min | Backend | José | 1 | T-01-2 | El 6.º intento responde 429; el contador se reinicia tras un login exitoso. |
| T-01-5 | Pantalla de login, manejo de sesión, menú por rol, redirección sin sesión y cierre por 15 min de inactividad | Frontend | José | 3 | T-B-4, T-01-2 | Dueño y Empleado ven menús distintos; sin sesión, el Portal Tienda redirige a `/login`; funciona en 360 px y en PC. |
| T-01-6 | Pruebas `test_RF_01_AC_1` a `test_RF_01_AC_6` (AC-3 ◐ y AC-6 ◐) | QA | Ángel | 2 | T-01-4 | Las 6 pruebas pasan en el CI. |

## 4. HU-03 · Administrar usuarios y configuración (5 SP · 11 h · dueño: Víctor)

| ID | Tarea | Rol | Responsable | h | Depende de | Criterio de done |
|---|---|---|---|---|---|---|
| T-03-1 | Modelo `Configuracion` con historial de valores + migración con los valores por defecto del SRS | Datos/BD | Víctor | 1.5 | T-B-3 | La migración carga envío $25, mínimo $150, horario 9–20, días de seguridad 2 y aviso de caducidad 3; aplica y revierte. |
| T-03-2 | Endpoints de usuarios de la tienda: crear con rol, desactivar y reactivar, 409 al desactivar al último Dueño | Backend | Víctor | 2.5 | T-01-3 | Solo el Dueño accede; al desactivar a un Empleado, su JWT vigente recibe 401. |
| T-03-3 | Correo de activación por Mailpit y endpoint para definir contraseña | Backend | Víctor | 1 | T-03-2 | El correo llega a Mailpit; el enlace permite fijar la contraseña e iniciar sesión. |
| T-03-4 | Endpoints de configuración con validaciones (días de seguridad 0–14, CP, envío con fecha de vigencia) | Backend | Víctor | 1.5 | T-03-1 | 20 días de seguridad responde 422 con el mensaje del SRS; un nuevo costo de envío se guarda con su fecha sin borrar el anterior. |
| T-03-5 | Pantallas de usuarios (alta, lista, activar/desactivar) y de configuración | Frontend | Víctor | 2.5 | T-B-4, T-03-2, T-03-4 | El Dueño completa los flujos en 360 px y PC; el Empleado no ve el menú de administración. |
| T-03-6 | Pruebas `test_RF_03_AC_1` a `AC_3` y `test_RF_28_AC_1` a `AC_4` (AC-3 ◐) | QA | Víctor | 2 | T-03-3, T-03-4 | Las 7 pruebas pasan en el CI. |

## 5. HU-05 · Registrar productos (3 SP · 7 h · dueño: Ángel)

| ID | Tarea | Rol | Responsable | h | Depende de | Criterio de done |
|---|---|---|---|---|---|---|
| T-05-1 | Modelo `Producto` + migración (código único, nombre + presentación únicos, banderas perecedero y restringido, estado) | Datos/BD | Ángel | 1 | T-B-3 | La migración aplica y revierte; la BD rechaza códigos duplicados. |
| T-05-2 | Endpoints CRUD con 409 y 422, desactivación con historial, costo oculto al Empleado y auditoría de cambios de precio | Backend | Ángel | 2 | T-05-1, T-01-3, T-B-5 | Endpoints en OpenAPI con sus IDs RF-04-AC; un cambio de precio queda en auditoría. |
| T-05-3 | Pantalla de catálogo: lista con búsqueda, alta y edición (solo Dueño) con errores por campo | Frontend | Ángel | 2.5 | T-B-4, T-05-2 | El Dueño da de alta y edita; el Empleado ve la lista sin costo ni botón de editar; funciona en 360 px. |
| T-05-4 | Pruebas `test_RF_04_AC_1` a `test_RF_04_AC_5` | QA | Ángel | 1.5 | T-05-2 | Las 5 pruebas pasan en el CI. |

## 6. HU-06 · Registrar recepciones y ajustes (5 SP · 11 h · dueño: Adrián)

| ID | Tarea | Rol | Responsable | h | Depende de | Criterio de done |
|---|---|---|---|---|---|---|
| T-06-1 | Modelos `Proveedor`, `Lote` y `MovimientoInventario` + migración con los proveedores A, B y "Otro (ruta)" | Datos/BD | Adrián | 2 | T-05-1 | La migración aplica y revierte; existen los 3 proveedores fijos. |
| T-06-2 | `POST /recepciones`: crea lote, caducidad obligatoria para perecederos, costo solo para el Dueño (si falta, el costo de referencia de la ficha) | Backend | Adrián | 2 | T-06-1, T-B-5 | Recepción de 24 unidades sobre existencia 3 deja 27 y crea un lote; sin caducidad en perecedero responde 422; el movimiento queda en auditoría. |
| T-06-3 | Servicio FEFO + `POST /ajustes` (merma por lote y conteo físico con motivo obligatorio) | Backend | Adrián | 2.5 | T-06-2 | Un conteo de 18 sobre 20 genera un ajuste de −2 descontado del lote que caduca antes; sin motivo responde 422. |
| T-06-4 | Pantallas de recepción y de ajuste (sin campo de costo para el Empleado) | Frontend | Ángel | 2.5 | T-B-4, T-06-2 | El Empleado registra recepciones y conteos en 360 px; no ve el costo. |
| T-06-5 | Pruebas `test_RF_05_AC_1` a `AC_4` y `test_RF_06_AC_1` a `AC_4` (RF-06-AC-2 ◐) | QA | Adrián | 2 | T-06-3 | Las 8 pruebas pasan en el CI. |

## 7. Resumen

| Persona | Tareas | Horas |
|---|---|---|
| Ángel | T-B-4, T-05-1 a T-05-4, T-01-6, T-06-4 | 14.5 |
| Adrián | T-B-2, T-B-5, T-06-1, T-06-2, T-06-3, T-06-5 | 13.5 |
| José (PO) | T-B-3, T-01-1 a T-01-5 | 13 |
| Víctor (SM) | T-B-1, T-03-1 a T-03-6 | 13 |
| **Total** | **26 tareas** | **54** |

| Bloque | Horas | Presupuesto (2.25 h/SP) |
|---|---|---|
| Base técnica | 14 | 14 |
| HU-01 (5 SP) | 11 | 11.25 |
| HU-03 (5 SP) | 11 | 11.25 |
| HU-05 (3 SP) | 7 | 6.75 |
| HU-06 (5 SP) | 11 | 11.25 |
| **Total** | **54** | **54.5** |

**Ruta crítica:** T-B-1 → T-B-2 → T-B-3 → T-01-1 → T-01-2 → T-01-3 → T-05-2 → T-06-2 → T-06-3. La base técnica y HU-01 deben estar en `main` el domingo 11 (punto de control).

## 8. Ajustes a la descomposición del agente

El agente propuso 14 tareas para las 4 historias. Al revisarlas encontramos lo siguiente:

| # | Propuesta del agente | Problema | Ajuste |
|---|---|---|---|
| D-01 | Una tarea "backend" y una "frontend" por historia, de 5 a 6 h cada una | Rebasan 4 h y no se pueden verificar por partes | Se dividieron en modelo, endpoints, pantalla y pruebas, todas de 4 h o menos. |
| D-02 | "Configurar proyecto" como una sola tarea de 6 h | Rebasa 4 h y mezcla Docker, backend, frontend y CI | Se dividió en T-B-1 a T-B-4. |
| D-03 | Sin bloqueo por intentos fallidos | RF-01-AC-5 quedaba sin implementar | Se agregó T-01-4. |
| D-04 | Sin correo de activación | RF-03-AC-1 pide que la hija active su cuenta | Se agregó T-03-3 (Mailpit). |
| D-05 | Sin migración de proveedores fijos | La recepción (RF-05) pide proveedor, que llega hasta el Sprint 3 | T-06-1 carga A, B y "Otro (ruta)". |
| D-06 | Sin regla para el costo cuando no hay oferta vigente | El SRS remite a ofertas que aún no existen | T-06-2 usa el costo de referencia de la ficha (pendiente de confirmar). |
| D-07 | Criterios de done como "endpoint funcionando" o "pantalla lista" | No son verificables | Cada criterio se ligó a datos concretos del SRS, a una prueba con ID o a un comando. |
| D-08 | Pruebas de todo el sprint en una sola tarea final de 8 h | Rebasa 4 h y concentra el riesgo al final | Una tarea de pruebas por historia, hecha junto con la implementación. |
| D-09 | Carga según los dueños sugeridos: Víctor 16 h, Adrián 16 h, Ángel 10 h | Sobrecarga del SM y cuello de botella | Docker pasó a Adrián; las pruebas de HU-01 y las pantallas de HU-06 pasaron a Ángel. |
| D-10 | Criterios que dependen de módulos de otros sprints, tratados como completos | Esas pruebas no se podían escribir completas | Se marcaron con ◐ los 4 criterios de alcance parcial. |

**Resultado:** de 14 tareas (algunas de hasta 8 h) se pasó a 26 tareas de 4 h o menos, con responsable, rol, dependencias y criterio de done verificable. El total queda dentro de la capacidad de 54 h.

## 9. Reflejo en GitHub Projects

- **Padres:** HAB-01 (issue nuevo), HU-01, HU-03, HU-05 y HU-06.
- **Cada tarea es un sub-issue** de su padre, creado con **Create sub-issue** dentro del issue padre.
  - **Título:** `T-XX-N · [Rol] Tarea`.
  - **Cuerpo:** responsable, horas, dependencias y criterio de done como checkbox.
  - **Label:** `tarea`.
  - **Campos:** Sprint = `Sprint 1`, Status = `Sprint Backlog`.
- El padre muestra la barra de avance de sus sub-issues; la historia pasa a **Hecho** cuando todas sus tareas están cerradas y cumple la DoD.
