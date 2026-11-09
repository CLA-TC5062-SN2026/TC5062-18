import * as React from 'react'
import { cn } from '@/lib/utils'

// Tarjeta basada en shadcn/ui: contenedor genérico para información estructurada.
//
// Uso:
//   <Card>
//     <CardHeader>
//       <CardTitle as="h2">Corte de caja</CardTitle>
//       <CardDescription>Turno matutino</CardDescription>
//       <CardAction><Button size="sm">Ver</Button></CardAction>
//     </CardHeader>
//     <CardContent>…</CardContent>
//     <CardFooter>…</CardFooter>
//   </Card>

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-card text-card-foreground flex flex-col gap-4 rounded-xl border py-4 shadow-sm sm:gap-6 sm:py-6',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-4 sm:px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]',
        className,
      )}
      {...props}
    />
  )
}

interface CardTitleProps extends React.ComponentProps<'h2'> {
  /** Nivel de encabezado; respeta la jerarquía de la página (WCAG 1.3.1). Por defecto h2. */
  as?: 'h1' | 'h2' | 'h3' | 'h4'
}

function CardTitle({ as: Encabezado = 'h2', className, ...props }: CardTitleProps) {
  return (
    <Encabezado
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

/** Acción en la esquina superior derecha de la tarjeta (botón, menú). */
function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-4 sm:px-6', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex flex-col gap-2 px-4 sm:flex-row sm:items-center sm:px-6', className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter }
