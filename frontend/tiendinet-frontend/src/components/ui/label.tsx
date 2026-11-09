import * as React from 'react'
import { cn } from '@/lib/utils'

// Versión simple del Label de shadcn/ui (sin dependencia de Radix).

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn('flex items-center gap-2 text-sm leading-none font-medium select-none', className)}
      {...props}
    />
  )
}

export { Label }
