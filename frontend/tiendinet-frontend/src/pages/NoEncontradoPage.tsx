import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function NoEncontradoPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <Button asChild variant="outline">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </main>
  )
}
