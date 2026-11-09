# Revisión de componentes base — TiendiNet

| Campo | Valor |
|---|---|
| Componentes | Botón, Campo de entrada, Tarjeta, Barra de navegación |
| Stack | React + TypeScript, Tailwind CSS con shadcn/ui |
| Archivos | `src/components/ui/button.tsx`, `src/components/ui/campo.tsx`, `src/components/ui/card.tsx`, `src/components/Navbar.tsx` |
| Galería | `http://localhost:5173/componentes` (`src/pages/cliente/ComponentesPage.tsx`) |
| Fecha | 8 de noviembre de 2026 |

El agente generó una primera versión de los cuatro componentes. Cada uno se revisó contra dos criterios: que acepte parámetros de configuración bien definidos (props tipadas con TypeScript) y que tenga estilos responsivos básicos. La revisión se apoyó en pruebas automáticas (Vitest + Testing Library) y en capturas del navegador a 375 px (móvil) y 1100 px (escritorio). Abajo está qué se modificó de la propuesta y por qué. Las correcciones de accesibilidad están aparte, en `accesibilidad.md`.

## Resumen

| Componente | Propuesta del agente | Modificaciones | Motivo principal |
|---|---|---|---|
| Botón | Variantes y `loading` con spinner | Corrección de `asChild` + `loading`, prop `loadingText`, prop `fullWidth` | La propuesta fallaba al usar un enlace con estado de carga |
| Campo | Etiqueta, ayuda y error | Estado válido, ícono de estado, indicador de obligatorio, separación de `className` e `inputClassName` | La validación visual solo mostraba el error con un borde |
| Tarjeta | Piezas de shadcn/ui sin cambios | Relleno responsivo, `CardAction`, pie apilado en móvil | En móvil el relleno fijo de 24 px desperdiciaba espacio |
| Navbar | Enlaces, estado de sesión y menú móvil | Cierre del menú al navegar, marca como enlace, `acciones`, botón de sesión opcional, rol visible | El menú móvil quedaba abierto después de navegar y el Portal Cliente no tenía cómo ocultar el login |

## 1. Botón (`Button`)

### Props

| Prop | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'destructive' \| 'link'` | `'primary'` | Estilo visual |
| `size` | `'sm' \| 'md' \| 'lg' \| 'icon'` | `'md'` | Tamaño |
| `loading` | `boolean` | `false` | Muestra el spinner y desactiva el botón |
| `loadingText` | `string` | — | Texto que reemplaza al contenido durante la carga |
| `fullWidth` | `boolean \| 'mobile'` | `false` | Ancho completo; `'mobile'` solo en pantallas chicas |
| `asChild` | `boolean` | `false` | Aplica los estilos al hijo (p. ej. un `<a>`) |
| …resto | `ComponentProps<'button'>` | — | `onClick`, `type`, `disabled`, etc. |

### Modificaciones

1. **Corrección de `asChild` con `loading`.** La propuesta ponía el spinner y el contenido como dos hijos del `Slot` de Radix, que solo acepta uno. Con `<Button asChild loading><a …/></Button>` la aplicación se rompía con el error *"Slot failed to slot onto its children"* (se reprodujo con una prueba). Se envolvió el contenido en `Slottable`, y con `asChild` ya no se pasa `disabled` a un elemento que no lo admite.
2. **Prop `loadingText`.** En la propuesta, cada página cambiaba el texto a mano (`{isPending ? 'Entrando…' : 'Entrar'}`). Ahora el componente lo resuelve y las páginas quedan más simples.
3. **Prop `fullWidth` con valor `'mobile'`.** En móvil los botones de formularios y tarjetas deben ocupar todo el ancho para que sean fáciles de tocar. En escritorio deben volver a su ancho natural. La propuesta no tenía forma de expresarlo sin repetir clases en cada uso.
4. **Atributo `data-loading`.** Se agregó para poder darle estilos o seleccionarlo en pruebas.

## 2. Campo de entrada (`Campo`)

### Props

| Prop | Tipo | Descripción |
|---|---|---|
| `label` | `string` (obligatoria) | Etiqueta visible, asociada al input con `htmlFor` |
| `error` | `string` | Mensaje de error; marca el campo como inválido |
| `valido` | `boolean` | Muestra el estado válido |
| `ayuda` | `string` | Texto de ayuda; se oculta si hay error |
| `required` | `boolean` | Marca el campo como obligatorio y muestra un asterisco |
| `className` | `string` | Clases del contenedor |
| `inputClassName` | `string` | Clases del `<input>` |
| …resto | `ComponentProps<'input'>` | `type`, `value`, `onChange`, `onBlur`, etc. |

### Modificaciones

1. **Estado válido (`valido`).** La propuesta solo mostraba el error. La validación visual básica necesita también confirmar cuando el dato es correcto, por ejemplo al capturar un código de barras. Ahora el borde se pone verde y aparece una palomita.
2. **Íconos de estado.** Antes, la única diferencia entre un campo normal y uno con error era el color del borde. Ahora aparece un ícono (alerta o palomita), y así el estado no depende solo del color.
3. **Indicador de obligatorio.** Con `required` se muestra un asterisco junto a la etiqueta.
4. **`className` e `inputClassName` por separado.** En la propuesta, `className` se aplicaba al contenedor aunque parecía aplicarse al input. Ahora cada uno tiene su prop y su tipo está documentado.
5. **La validación se queda en la página.** El componente solo muestra el estado. Las reglas (qué es un correo válido, cuándo mostrar el error) viven en la página que lo usa. El login muestra los errores después de salir del campo (`onBlur`) o al enviar, no mientras el usuario escribe.

## 3. Tarjeta (`Card`)

### Piezas

`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent` y `CardFooter`. Cada pieza acepta `className` y las props de un `<div>`. Se componen libremente, así que la tarjeta sirve para cualquier información estructurada: módulos, corte de caja, formularios.

### Modificaciones

1. **Relleno responsivo.** La propuesta usaba 24 px fijos (`px-6 py-6`). En un teléfono de 375 px eso dejaba poco ancho para tablas y formularios. Ahora el relleno es de 16 px en móvil y 24 px desde `sm`.
2. **`CardAction`.** Es una pieza nueva para poner un botón o menú en la esquina superior derecha sin acomodarlo a mano en cada tarjeta.
3. **Pie apilado en móvil.** `CardFooter` acomoda sus botones en columna en pantallas chicas y en fila desde `sm`.

## 4. Barra de navegación (`Navbar`)

### Props

| Prop | Tipo | Descripción |
|---|---|---|
| `portal` | `string` | Nombre junto a la marca ("Catálogo", "Tienda") |
| `usuario` | `UsuarioActual \| null` | `null` = no autenticado |
| `enlaces` | `{ etiqueta, href, requiereSesion? }[]` | Los enlaces con `requiereSesion` solo se ven con sesión |
| `onIniciarSesion` | `() => void` | Si no se pasa, no aparece el botón "Iniciar sesión" |
| `onCerrarSesion` | `() => void` | Acción del botón "Salir" |
| `acciones` | `ReactNode` | Contenido extra a la derecha |

### Estados

- **No autenticado:** muestra solo los enlaces públicos y el botón "Iniciar sesión" (si hay manejador).
- **Autenticado:** agrega los enlaces privados, el nombre y el rol del usuario y el botón "Salir".
- **Responsivo:** desde `md` los enlaces están en la barra. En pantallas chicas pasan a un menú desplegable con botón.

### Modificaciones

1. **El menú móvil se cierra al navegar.** En la propuesta, el menú quedaba abierto al tocar un enlace y tapaba la página nueva. Ahora el menú recuerda en qué ruta se abrió y se cierra solo al cambiar de ruta. Se calcula durante el render, sin `useEffect`, para evitar el aviso del linter sobre renders en cascada.
2. **Botón de sesión opcional.** El Portal Cliente todavía no tiene login de clientes, y la propuesta siempre mostraba "Iniciar sesión", lo que llevaba a un botón sin acción. Ahora solo aparece si se pasa `onIniciarSesion`.
3. **Prop `acciones`.** Permite poner contenido como el enlace "Soy de la tienda" del Portal Cliente, en escritorio y dentro del menú móvil.
4. **Marca como enlace al inicio.** "TiendiNet" ahora lleva al inicio del portal, como se espera en cualquier sitio.
5. **Rol visible.** Con sesión se muestra "Ana · Dueño". El rol cambia qué módulos se ven (RF-01-AC-3), así que conviene que el usuario sepa con cuál entró.
6. **Reemplaza a `EncabezadoPortal`.** El encabezado anterior del scaffolding se eliminó, y los dos portales usan `Navbar`.

## Verificación

- `npm test`: 14 pruebas en verde (11 de comportamiento y 3 de accesibilidad). Incluyen la regresión de `asChild` + `loading`, la asociación etiqueta–campo y los dos estados de la barra.
- `npm run typecheck` y `npm run lint` sin errores ni advertencias.
- Revisión en Chrome a 375 px y 1100 px: sin desbordamiento horizontal, el menú móvil abre y cierra, los botones se apilan en móvil y la validación del login muestra los errores al enviar vacío.
