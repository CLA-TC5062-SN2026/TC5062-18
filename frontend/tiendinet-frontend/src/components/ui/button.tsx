import * as React from 'react'
import { Slot, Slottable } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Botón basado en shadcn/ui con variantes y estado de carga.
//
// Uso:
//   <Button>Guardar</Button>                                  // primario
//   <Button variant="secondary">Cancelar</Button>
//   <Button loading loadingText="Guardando…">Guardar</Button>
//   <Button asChild><a href="/tienda/">Ir a la tienda</a></Button>

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        outline: 'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-white shadow-xs hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 gap-1.5 px-3',
        md: 'h-9 px-4 py-2',
        lg: 'h-10 px-6',
        icon: 'size-9',
      },
      fullWidth: {
        true: 'w-full',
        // En pantallas chicas ocupa todo el ancho; desde sm vuelve a su tamaño natural.
        mobile: 'w-full sm:w-auto',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
)

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  /** Muestra un indicador de carga y desactiva el botón. */
  loading?: boolean
  /** Texto que reemplaza al contenido mientras `loading` es true (p. ej. "Guardando…"). */
  loadingText?: string
  /** Renderiza el hijo (p. ej. un enlace) con los estilos del botón. */
  asChild?: boolean
}

function Button({
  className,
  variant,
  size,
  fullWidth,
  loading = false,
  loadingText,
  asChild = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  const contenido = loading && loadingText ? loadingText : children

  return (
    <Comp
      data-slot="button"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, fullWidth, className }))}
      disabled={asChild ? undefined : disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {/* Slottable permite el ícono de carga junto al hijo cuando asChild es true. */}
      <Slottable>{contenido}</Slottable>
      {/* Anuncia el inicio de la carga a lectores de pantalla (WCAG 4.1.3). */}
      <span role="status" className="sr-only">
        {loading ? (loadingText ?? 'Cargando') : ''}
      </span>
    </Comp>
  )
}

// oxlint-disable-next-line react/only-export-components
export { Button, buttonVariants }
