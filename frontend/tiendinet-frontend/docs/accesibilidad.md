# Evaluación de accesibilidad básica — TiendiNet

| Campo | Valor |
|---|---|
| Alcance | Botón, Campo de entrada, Tarjeta, Barra de navegación y las páginas que los usan |
| Pautas | WCAG 2.1, nivel AA: contraste mínimo, nombres accesibles y manejo del foco |
| Herramientas | axe-core 4 (reglas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `best-practice`) en Chrome; medición de contraste con la fórmula de WCAG; recorrido con teclado; pruebas con Testing Library |
| Pantallas | Catálogo, galería `/componentes` (con y sin sesión, escritorio y móvil con menú abierto), login con errores e inicio de la tienda |
| Fecha | 8 de noviembre de 2026 |

## Resultado

Se encontraron **9 problemas**: 2 críticos, 2 serios, 3 moderados y 2 menores. **Se corrigieron los 9.** Después de las correcciones, axe-core no reporta violaciones en ninguna de las seis pantallas y todas las combinaciones de color medidas cumplen el mínimo.

| # | Problema | Criterio WCAG 2.1 | Gravedad | Estado |
|---|---|---|---|---|
| 1 | El indicador de foco casi no se ve (1.54:1) | 2.4.7 Foco visible, 1.4.11 Contraste no textual | Crítico | Corregido |
| 2 | El botón del menú móvil no tiene nombre accesible | 4.1.2 Nombre, función, valor | Crítico | Corregido |
| 3 | El error del campo no está conectado al input | 1.3.1, 3.3.1 Identificación de errores, 4.1.2 | Serio | Corregido |
| 4 | El borde de los campos tiene contraste de 1.26:1 | 1.4.11 Contraste no textual | Serio | Corregido |
| 5 | El estado de carga del botón no se anuncia | 4.1.3 Mensajes de estado | Moderado | Corregido |
| 6 | Las páginas no tienen encabezado `h1` (los títulos de tarjeta eran `div`) | 1.3.1 Información y relaciones | Moderado | Corregido |
| 7 | El menú móvil no informa si está abierto y no se cierra con Escape | 4.1.2, 2.1.1 Teclado | Moderado | Corregido |
| 8 | Enlace de la barra en hover: 4.35:1 | 1.4.3 Contraste mínimo | Menor | Corregido |
| 9 | Los landmarks `nav` no tienen nombre y el asterisco de obligatorio se lee como texto | 1.3.1 (buena práctica) | Menor | Corregido |

## Problemas críticos y su corrección

### 1. Indicador de foco casi invisible

**Problema.** Los botones y campos usaban el anillo de foco de shadcn/ui por defecto: gris `oklch(0.708 0 0)` al 50 % de opacidad. Sobre blanco eso da **1.54:1**, y WCAG pide al menos 3:1 para que el indicador se distinga. Los enlaces usaban el contorno del navegador con ese mismo gris. Quien navega con teclado, por ejemplo en el mostrador con lector de códigos y teclado, no puede saber dónde está.

**Evidencia.** La primera captura muestra el foco en "Guardar" antes de la corrección. El halo gris apenas se distingue del borde normal.

![Foco antes](img/foco_antes.png)

**Corrección.**
- `src/index.css`: `--ring` pasa a ser el verde de la marca `oklch(0.448 0.119 151.328)`, con **7.13:1** sobre blanco y **6.54:1** sobre el gris del botón secundario. Se cambió también en el tema oscuro.
- `src/components/ui/button.tsx`: el anillo pasa de `ring-ring/50 ring-[3px]` a `ring-2 ring-ring ring-offset-2`. El anillo es sólido y lleva una separación blanca, así que también se ve sobre el botón primario, que es verde.
- `outline-none` se reemplazó por `outline-hidden` en botón e input. Así, el contorno se conserva en el modo de alto contraste de Windows.
- Enlaces y cualquier elemento enfocable sin estilo propio: contorno sólido de 2 px con `outline-offset` de 2 px (regla `:focus-visible` en `index.css`).
- `src/components/ui/input.tsx`: al enfocar, el borde cambia a verde sólido (`border-ring`) con un halo suave.

![Foco después](img/foco_despues.png)

### 2. Botón del menú móvil sin nombre accesible

**Problema.** En pantallas chicas, la barra muestra un botón con solo un ícono (☰). No tenía texto ni `aria-label`, así que un lector de pantalla lo anunciaba solo como "botón". axe-core lo marcó como **crítico** (`button-name`) en la galería móvil y en el inicio de la tienda. Tampoco indicaba si el menú estaba abierto (`aria-expanded`) ni qué controlaba.

**Corrección** (`src/components/Navbar.tsx`):
- `aria-label` dinámico: "Abrir menú" o "Cerrar menú".
- `aria-expanded` refleja el estado, y `aria-controls="menu-movil"` lo conecta con el panel (`id="menu-movil"`).
- Los íconos llevan `aria-hidden="true"` para que no se lean dos veces.
- **Escape** cierra el menú y regresa el foco al botón que lo abrió (problema 7).
- Prueba de regresión en `Navbar.test.tsx`.

## Otras correcciones

**3. Errores del campo conectados al input** (`src/components/ui/campo.tsx`). Con error, el input recibe `aria-invalid="true"`, y `aria-describedby` apunta al mensaje de error o de ayuda. Así, el lector de pantalla lee "Correo, inválido, El correo no tiene un formato válido" al enfocar el campo. Además, al enviar el login con errores, el foco va al primer campo inválido, y el error que devuelve la API se anuncia con `role="alert"`. El estado tampoco depende solo del color: el campo muestra un ícono de alerta o una palomita.

**4. Borde de los campos** (`--input` en `index.css`). Pasa de `oklch(0.922 0 0)` (1.26:1) a `oklch(0.62 0 0)` (**3.64:1**), para que se vea dónde está cada campo. El token `--border`, que usan las tarjetas y es decorativo, no cambió.

**5. Estado de carga anunciado** (`button.tsx`). Con `loading`, el botón recibe `aria-busy="true"` e incluye una región `role="status"` oculta visualmente. Esa región anuncia el `loadingText` ("Guardando…", "Entrando…") o "Cargando".

**6. Jerarquía de encabezados** (`card.tsx`). `CardTitle` ahora es un encabezado real con la prop `as` (`h1` a `h4`, por defecto `h2`). El catálogo y el login usan su título como `h1`, y el inicio de la tienda tiene "Módulos de la tienda" como `h1`.

**8. Contraste en hover.** Los enlaces inactivos de la barra pasan a texto oscuro en hover (**18.16:1**). Antes mantenían el gris sobre el fondo gris de hover (4.35:1).

**9. Buenas prácticas.** Los `nav` llevan `aria-label` ("Principal", "Principal (móvil)"). El asterisco de obligatorio tiene `aria-hidden`, porque el atributo `required` ya comunica que el campo es obligatorio.

## Mediciones de contraste

| Elemento | Colores | Antes | Después | Mínimo |
|---|---|---|---|---|
| Texto normal | `#0a0a0a` / `#ffffff` | 19.8:1 | 19.8:1 | 4.5 |
| Texto secundario / tarjeta | `#737373` / `#ffffff` | 4.74:1 | 4.74:1 | 4.5 |
| Texto secundario / fondo de página | `#737373` / `#fbfbfb` | 4.58:1 | 4.58:1 | 4.5 |
| Enlace de la barra en hover | — / `#f5f5f5` | 4.35:1 ✗ | 18.16:1 | 4.5 |
| Botón primario (blanco / verde) | `#fafafa` / `#016630` | 6.83:1 | 6.83:1 | 4.5 |
| Botón primario en hover | `#fafafa` / `#2b7544` | 5.39:1 | 5.39:1 | 4.5 |
| Botón secundario | `#171717` / `#f5f5f5` | 16.44:1 | 16.44:1 | 4.5 |
| Mensaje de error | `#e7000b` / `#ffffff` | 4.77:1 | 4.77:1 | 4.5 |
| Placeholder | `#737373` / `#ffffff` | 4.74:1 | 4.74:1 | 4.5 |
| Borde de campo | `#e5e5e5` → `#868686` / `#ffffff` | 1.26:1 ✗ | 3.64:1 | 3 |
| Indicador de foco | gris 50 % → `#016630` / `#ffffff` | 1.54:1 ✗ | 7.13:1 | 3 |

El botón deshabilitado no se evalúa: WCAG exenta a los componentes inactivos.

## Resultado de axe-core

| Pantalla | Antes | Después |
|---|---|---|
| Catálogo (escritorio) | 1 (`page-has-heading-one`) | 0 |
| Galería sin sesión (escritorio) | 0 | 0 |
| Galería con sesión (escritorio) | 0 | 0 |
| Galería móvil con menú abierto | 1 crítica (`button-name`) | 0 |
| Login con errores (móvil) | 1 (`page-has-heading-one`) | 0 |
| Inicio de la tienda (móvil) | 1 crítica (`button-name`) + 1 (`page-has-heading-one`) | 0 |

axe-core solo detectó 2 de los 9 problemas. El foco invisible, el borde de los campos, los errores sin conectar y el estado de carga se encontraron con la medición de contraste y el recorrido con teclado. Por eso no conviene depender solo de la herramienta automática.

## Pendientes y límites de esta evaluación

- **Lector de pantalla real.** Las comprobaciones se hicieron con axe-core, revisión de atributos y pruebas automatizadas, no con un lector de pantalla. Antes de la entrega conviene recorrer el login y la barra con **NVDA** (gratuito, para Windows).
- **Tamaño de los objetivos táctiles.** Los botones miden 32 px (`sm`) y 36 px (`md`) de alto. WCAG 2.1 pide 44 px solo en el nivel AAA (2.5.5), así que no es un incumplimiento AA. Para la tableta del mostrador convendría usar `size="lg"` en las acciones principales.
- **Texto secundario sobre el fondo gris de página (4.58:1).** Cumple, pero con poco margen. Si se oscurece el fondo de la página, hay que oscurecer también `--muted-foreground`.

## Cómo repetir la evaluación

1. `npm run dev` y abrir `http://localhost:5173/componentes`.
2. Pruebas de regresión: `npm test` (incluye pruebas de accesibilidad del botón, el campo y la barra).
3. Revisión manual: recorrer cada pantalla solo con `Tab`, `Shift + Tab`, `Enter` y `Escape`, y confirmar que el foco siempre se ve.
4. Revisión automática: la extensión **axe DevTools** de Chrome o la pestaña **Lighthouse → Accesibilidad** de las herramientas de desarrollo.
