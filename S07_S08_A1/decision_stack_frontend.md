# Decisión del stack de frontend — TiendiNet

| Campo | Valor |
|---|---|
| Decisión | React + TypeScript, Vite, Tailwind CSS con shadcn/ui, Zustand y TanStack Query |
| Estado | Aceptada (opción B) |
| Contrato | `openapi_equipo.yaml` 2.0.0 |
| Arquitectura | `arquitectura_equipo.md`, SRS sección 2.1, ADR-001 |
| Fecha | 8 de noviembre de 2026 |

## 1. Stack elegido

| Pieza | Elección | Complemento |
|---|---|---|
| Framework | React + TypeScript | Tipos generados desde `openapi_equipo.yaml` con `openapi-typescript` |
| Construcción | Vite | Vitest para pruebas; proxy de desarrollo de `/api` a `localhost:8000` |
| Estilos | Tailwind CSS | shadcn/ui como componentes base (tabla, formulario, diálogo) |
| Estado | Zustand + TanStack Query | Zustand para la sesión y el estado de pantalla; TanStack Query para los datos de la API |

Los dos portales (Portal Tienda y Portal Cliente) viven en un solo proyecto Vite en modo multipágina, dentro de `frontend/`. Cada uno tiene su propia entrada (`index.html` → `src/main.tsx` para el Portal Cliente y `tienda/index.html` → `src/main-tienda.tsx` para el Portal Tienda) y Vite genera un bundle separado por portal. Ambos comparten `src/components`, `src/services` y el tema de estilos. El cliente de API (`src/services/api-client.ts`) es el adaptador del frontend hacia el puerto REST del monolito modular (ADR-001).

## 2. Alternativas consideradas

| Alternativa | Pieza | Por qué se descartó |
|---|---|---|
| Opción A: el mismo stack sin shadcn/ui ni TanStack Query | Todas | Es más sencilla al arrancar, pero no define cómo se leen los datos de la API. Cada pantalla terminaría cargando datos a mano con `useEffect`, y las tablas y formularios del mostrador se construirían desde cero. |
| Vue 3 + Pinia | Framework / estado | Es más fácil de aprender que React y era viable. Se descartó porque el SRS 2.1 y `arquitectura_equipo.md` ya fijan React, y cambiarlo obligaría a reescribir esos documentos. |
| Angular | Framework | Su curva de aprendizaje (RxJS, inyección de dependencias, módulos) no cabe en 12 semanas para un equipo sin experiencia. |
| Svelte | Framework | Su ecosistema de componentes para tablas y formularios de negocio es pequeño. |
| Next.js | Framework | Su servidor duplicaría a FastAPI, y TiendiNet no necesita renderizado en servidor ni SEO. |
| Webpack / Create React App | Construcción | Create React App está descontinuado, y configurar Webpack a mano no aporta nada al proyecto. |
| Bootstrap / CSS Modules | Estilos | Bootstrap impone un aspecto difícil de adaptar al mostrador. CSS Modules deja que cada integrante escriba estilos a su manera. |
| Redux Toolkit | Estado | El estado del cliente se reduce a la sesión y la pantalla; Redux agrega código repetitivo sin beneficio. |
| Solo Context API | Estado | Sirve para la sesión, pero no resuelve el caché ni la actualización de los datos de la API. |

## 3. Justificación

### Características del equipo

El equipo es de 4 personas, nadie tiene experiencia previa con React ni TypeScript y el proyecto dura 12 semanas. Por eso se eligieron herramientas con documentación oficial amplia y patrones que se copian de pantalla en pantalla:

- **TanStack Query** reemplaza la carga manual con `useEffect`, que es la fuente de errores más común en quien empieza con React (ciclos de peticiones, datos viejos, estados de carga olvidados). Cargar datos es un mismo patrón (`useQuery`) en todas las pantallas.
- **shadcn/ui** se usa como caja negra: el equipo agrega el componente y solo cambia los datos.
- **TypeScript** se limita a los tipos generados del contrato. El editor autocompleta los campos de la API y marca errores antes de ejecutar; no se escriben tipos complejos a mano.
- Todo el stack es open source (MIT) y funciona en Windows 11.

Para reducir el riesgo, una persona prepara el esqueleto (Vite, Tailwind, shadcn/ui, TanStack Query y una pantalla de ejemplo de punta a punta) y los demás trabajan sobre ese patrón. La adopción va por etapas:

| Semana | Tema |
|---|---|
| 1 | React básico con TypeScript (tutorial oficial de react.dev) |
| 2 | Vite, Tailwind y shadcn/ui; pantallas con datos falsos |
| 3 | TanStack Query contra la API real; login y sesión con Zustand |
| 4 en adelante | Funcionalidad del MVP |

### Integración con el backend

- La API es otro proceso (FastAPI en `localhost:8000`). Cada portal se construye aparte con Vite y llama al contrato por JSON. En desarrollo, el proxy de Vite evita configurar CORS en local.
- Los tipos se generan desde `openapi_equipo.yaml`: rol `DUENO`, `EMPLEADO` o `CLIENTE`, dinero como `"38.50"` (RD-07) y fechas de negocio en `America/Mexico_City`. Un cambio de contrato rompe la compilación, no la operación.
- Zustand guarda la sesión JWT de `POST /auth/sesiones` y `GET /auth/yo` (60 min en tienda, 24 h en cliente, RNF-04). Un 401 de cuenta inactiva limpia la caché de TanStack Query y cierra la sesión (RF-03-AC-2).
- Carrito, venta, pedidos y cortes viven en la API. TanStack Query los cachea y los vuelve a pedir después de cada cambio: al cerrar una venta se refresca el stock sin recargar la página.
- El pago sale a Checkout Pro; el webhook lo recibe la API, no el navegador.

### Complejidad de la UI

- Son dos portales con necesidades distintas: `GET /catalogo` es público y el Portal Tienda exige sesión (RF-01-AC-6). Por eso cada portal tiene su propia entrada y su propio bundle: el código de la tienda no se descarga en el catálogo, aunque ambos compartan componentes.
- El mostrador va apretado (lector, ticket, tablas) y el catálogo, más abierto. Tailwind da una sola base visual para ambos, y shadcn/ui resuelve las tablas, los formularios y los diálogos que concentran el trabajo del punto de venta.
- El Empleado no tiene pantallas de costos, ofertas ni punto de reorden (RF-01-AC-3). El rol cambia qué rutas se ven, no la hoja de estilos, y la API valida el permiso de todos modos.
- RF-30 queda en Fase 2, así que el MVP no necesita modo offline: esa venta es la diferida (RF-19). Si RF-30 entra después, `vite-plugin-pwa` se agrega solo al Portal Tienda sin cambiar el stack.

### Estructura: un proyecto multipágina en lugar de monorepo

La opción B proponía un monorepo (`apps/tienda`, `apps/cliente`, `packages/ui`, `packages/api-client`). Se cambió por un solo proyecto Vite multipágina por dos razones: el monorepo es la pieza más difícil de configurar para un equipo sin experiencia, y la estructura de entrega pide una sola carpeta `frontend/src/`. El modo multipágina conserva lo que justificaba el monorepo (dos portales con bundles separados y componentes compartidos) sin configurar workspaces. El resto del stack no cambia.
