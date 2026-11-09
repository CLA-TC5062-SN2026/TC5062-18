# TiendiNet — Frontend

Portales web de TiendiNet: **Portal Cliente** (catálogo público) y **Portal Tienda** (punto de venta para Dueño y Empleado). La decisión del stack está en `decision_stack_frontend.md`.

| Pieza | Elección |
|---|---|
| Framework | React 19 + TypeScript |
| Construcción | Vite (modo multipágina) |
| Estilos | Tailwind CSS 4 + shadcn/ui |
| Estado | Zustand (sesión) + TanStack Query (datos de la API) |

## Requisitos

- Node.js 20.19 o superior (probado con Node 22) y npm
- La API de TiendiNet (FastAPI) en `http://localhost:8000` para ver datos reales

## Arranque

```bash
npm install
copy .env.example .env      # Windows (cmd). En PowerShell o bash: cp .env.example .env
npm run dev
```

- Portal Cliente: http://localhost:5173/
- Portal Tienda: http://localhost:5173/tienda/ (login en `/tienda/login`, dashboard protegido en `/tienda/dashboard`)
- Galería de componentes: http://localhost:5173/componentes

## Componentes base

`Button` (variantes, `loading`), `Campo` (etiqueta y validación visual), `Card` y `Navbar` (con y sin sesión). Sus props y los cambios hechos en la revisión están en `docs/revision_componentes.md`. La evaluación WCAG 2.1 y sus correcciones están en `docs/accesibilidad.md`.

Sin backend, los portales cargan igual y muestran el aviso "No se pudo conectar con la API".

## En GitHub Codespaces

1. En el repositorio: **Code → Codespaces → Create codespace on main**. La carpeta `.devcontainer/` (en la raíz del repo) instala las dependencias y crea el `.env`.
2. Terminal 1: `cd frontend && npm run api:simulada` (o levanta el backend FastAPI en el puerto 8000).
3. Terminal 2: `cd frontend && npm run dev`.
4. En la pestaña **Puertos**, abre el 5173 (globo 🌐). La dirección es `https://<codespace>-5173.app.github.dev/tienda/login`.

Usuarios de la API simulada: `duena@tiendinet.local` y `empleado@tiendinet.local`, contraseña `Demo1234`. La API simulada solo cubre login, dashboard y catálogo, y es únicamente para demostraciones.

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL base de la API que usa el navegador. En desarrollo `/api` (pasa por el proxy de Vite, sin CORS). En producción, la URL pública de la API. |
| `API_PROXY_TARGET` | Solo desarrollo: a dónde reenvía el proxy `/api`. Por defecto `http://localhost:8000`. |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Revisa tipos y genera `dist/` (un bundle por portal) |
| `npm run preview` | Sirve `dist/` para probar la versión de producción |
| `npm run typecheck` | Solo revisión de tipos |
| `npm run lint` | Revisión de código con oxlint |
| `npm test` | Pruebas con Vitest |
| `npm run api:simulada` | API de demostración en el puerto 8000 (login, dashboard y catálogo) |
| `npm run api:tipos` | Regenera `src/types/api.generated.ts` desde `contrato/openapi_equipo.yaml` |

## Estructura

```
frontend/
├── index.html                 # Portal Cliente  → src/main.tsx
├── tienda/index.html          # Portal Tienda   → src/main-tienda.tsx
├── src/
│   ├── main.tsx               # punto de entrada del Portal Cliente
│   ├── main-tienda.tsx        # punto de entrada del Portal Tienda
│   ├── index.css              # Tailwind + tema de shadcn/ui (compartido)
│   ├── components/
│   │   ├── ui/                # button, campo, card, input, label, table
│   │   ├── Navbar.tsx         # barra con estado autenticado / no autenticado
│   │   ├── Proveedores.tsx    # QueryClientProvider
│   │   └── RutaProtegida.tsx  # filtro por rol
│   ├── pages/
│   │   ├── cliente/           # CatalogoPage, ComponentesPage (galería)
│   │   └── tienda/            # LoginPage, DashboardPage (+ flujoLogin.test.tsx)
│   ├── services/              # capa de servicios: api/ (cliente, interceptores, errores) + un *Service.ts por recurso
│   ├── stores/                # Zustand: sesión
│   ├── types/                 # tipos generados del contrato + atajos (Esquema, QueryDe, CuerpoDe)
│   └── lib/                   # utilidades: cn, formato de dinero y fecha, QueryClient
├── contrato/                  # openapi_equipo.yaml (fuente de los tipos)
├── docs/                      # flujo_login.md, capa_servicios.md, revision_componentes.md, accesibilidad.md
├── .env.example
├── components.json            # configuración de shadcn/ui
├── vite.config.ts
└── package.json
```

## Cómo agregar cosas

**Una pantalla que lee datos de la API.** Importa la función del servicio (`import { listarAlertas } from '@/services'`) y úsala con `useQuery` (ver `useCatalogo` en `catalogoService.ts`). No uses `fetch` ni `useEffect` para cargar datos. Los errores ya llegan con mensaje para el usuario en `error.message`; detalles en `docs/capa_servicios.md`.

**Una acción que cambia datos (venta, pedido).** Usa `useMutation` con la función del servicio y, en `onSuccess`, invalida las consultas afectadas. Las operaciones que cobran o mueven existencia piden una clave de idempotencia, que se genera una vez por operación:

```ts
const [clave] = useState(nuevaClaveIdempotencia)
const queryClient = useQueryClient()
useMutation({
  mutationFn: (cuerpo: CuerpoDe<'confirmarVenta'>) => confirmarVenta(ventaId, cuerpo, clave),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventario'] }),
})
```

**Un componente de shadcn/ui.** `npx shadcn@latest add dialog` (lo copia a `src/components/ui/`).

**Dinero y fechas.** El contrato manda el dinero como texto (`"38.50"`, RD-07). Muéstralo con `formatearDinero` y no hagas cuentas en el frontend. Las fechas se muestran con `formatearFecha` en `America/Mexico_City`.

## Despliegue

`npm run build` genera `dist/index.html` (cliente) y `dist/tienda/index.html` (tienda). El servidor web debe responder cualquier ruta `/tienda/*` con `dist/tienda/index.html` y el resto con `dist/index.html`. En desarrollo esto ya lo hace `vite.config.ts`.

