import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { EstadoRedireccion } from '@/components/RutaProtegida'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useIniciarSesion } from '@/services/authService'
import { sesionVencida, useSesion } from '@/stores/sesion'

interface Errores {
  correo?: string
  contrasena?: string
}

/** Página a la que se llega después del login si no se pidió otra. */
export const RUTA_DASHBOARD = '/dashboard'

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validar(correo: string, contrasena: string): Errores {
  const errores: Errores = {}
  if (!correo) errores.correo = 'Escribe tu correo.'
  else if (!CORREO_VALIDO.test(correo)) errores.correo = 'El correo no tiene un formato válido.'
  if (!contrasena) errores.contrasena = 'Escribe tu contraseña.'
  return errores
}

/**
 * Portal Tienda: inicio de sesión para Dueño y Empleado.
 *
 * Flujo: valida el formulario → `authService.login()` (vía useIniciarSesion) → el store
 * guarda token, expiración y usuario en sessionStorage → redirige a la página que la
 * ruta protegida pidió, o al dashboard.
 */
export function LoginPage() {
  const usuario = useSesion((s) => s.usuario)
  const expiraEn = useSesion((s) => s.expiraEn)
  const destino = (useLocation().state as EstadoRedireccion | null)?.desde ?? RUTA_DASHBOARD
  const iniciarSesion = useIniciarSesion(['DUENO', 'EMPLEADO'])
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [tocados, setTocados] = useState({ correo: false, contrasena: false })

  // Con sesión vigente (recién iniciada o de antes), no tiene caso mostrar el formulario.
  if (usuario && usuario.rol !== 'CLIENTE' && !sesionVencida(expiraEn)) {
    return <Navigate to={destino} replace />
  }

  const errores = validar(correo, contrasena)
  const error = iniciarSesion.error
  // Error local si el campo ya se tocó; si no, el que la API mande para ese campo (422).
  const mostrar = (campo: keyof Errores) =>
    (tocados[campo] ? errores[campo] : undefined) ?? error?.mensajeDeCampo(campo)

  function enviar(e: FormEvent) {
    e.preventDefault()
    setTocados({ correo: true, contrasena: true })
    if (Object.keys(errores).length > 0) {
      // Lleva el foco al primer campo con error para que se lea su mensaje (WCAG 3.3.1).
      document.getElementById(errores.correo ? 'correo' : 'contrasena')?.focus()
      return
    }
    iniciarSesion.mutate({ correo, contrasena })
  }

  // El mensaje ya viene listo del manejo de errores centralizado (401, 429, red…).
  const mensajeError = error && error.detalles.length === 0 ? error.message : undefined

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle as="h1" className="text-2xl">
            TiendiNet
          </CardTitle>
          <CardDescription>Inicia sesión para entrar al punto de venta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
            <Campo
              id="correo"
              label="Correo"
              type="email"
              autoComplete="username"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              onBlur={() => setTocados((t) => ({ ...t, correo: true }))}
              error={mostrar('correo')}
              valido={tocados.correo && !errores.correo}
            />
            <Campo
              id="contrasena"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              required
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              onBlur={() => setTocados((t) => ({ ...t, contrasena: true }))}
              error={mostrar('contrasena')}
            />
            {mensajeError && (
              <p role="alert" className="text-sm text-destructive">
                {mensajeError}
              </p>
            )}
            <Button type="submit" fullWidth loading={iniciarSesion.isPending} loadingText="Entrando…">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
