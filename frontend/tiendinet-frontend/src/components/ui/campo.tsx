import * as React from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from './input'
import { Label } from './label'

// Campo de entrada con etiqueta, texto de ayuda y validación visual.
//
// Uso:
//   <Campo label="Correo" type="email" required
//          error={errores.correo} valido={tocado && !errores.correo} />
//
// La validación (qué es un error) la decide la página; el campo solo la muestra.

export interface CampoProps extends Omit<React.ComponentProps<'input'>, 'className'> {
  /** Texto de la etiqueta (siempre visible). */
  label: string
  /** Mensaje de error; si existe, el campo se muestra como inválido. */
  error?: string
  /** Muestra el estado válido (borde verde y ✓). Úsalo después de que el usuario tocó el campo. */
  valido?: boolean
  /** Texto de ayuda debajo del campo; se oculta cuando hay error. */
  ayuda?: string
  /** Clases para el contenedor (márgenes, ancho en la cuadrícula). */
  className?: string
  /** Clases para el <input>. */
  inputClassName?: string
}

function Campo({
  label,
  error,
  valido = false,
  ayuda,
  id,
  required,
  className,
  inputClassName,
  ...props
}: CampoProps) {
  const idGenerado = React.useId()
  const idCampo = id ?? idGenerado
  const estado = error ? 'error' : valido ? 'valido' : 'neutro'
  // El mensaje de error o de ayuda se conecta al input para que el lector de pantalla
  // lo lea al enfocar el campo (WCAG 1.3.1, 3.3.1, 4.1.2).
  const idMensaje = error || ayuda ? `${idCampo}-mensaje` : undefined

  return (
    <div className={cn('flex w-full flex-col gap-2', className)} data-estado={estado}>
      <Label htmlFor={idCampo}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      <div className="relative">
        <Input
          id={idCampo}
          required={required}
          aria-invalid={estado === 'error' || undefined}
          aria-describedby={idMensaje}
          className={cn(
            'pr-9',
            estado === 'error' && 'border-destructive',
            estado === 'valido' && 'border-primary',
            inputClassName,
          )}
          {...props}
        />
        {estado === 'error' && (
          <CircleAlert aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-destructive" />
        )}
        {estado === 'valido' && (
          <CircleCheck aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary" />
        )}
      </div>

      {error ? (
        <p id={idMensaje} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={idMensaje} className="text-sm text-muted-foreground">
            {ayuda}
          </p>
        )
      )}
    </div>
  )
}

export { Campo }
