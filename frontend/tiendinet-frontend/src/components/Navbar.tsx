import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { UsuarioActual } from '@/types/api'

// Barra de navegación común a los dos portales.
//
// Uso:
//   <Navbar portal="Tienda" usuario={usuario}
//           enlaces={[{ etiqueta: 'Inicio', href: '/' }]}
//           onIniciarSesion={() => navigate('/login')}
//           onCerrarSesion={cerrar} />
//
// usuario = null → estado "no autenticado": oculta los enlaces con requiereSesion
// y muestra "Iniciar sesión" (si se pasa onIniciarSesion).

export interface EnlaceNav {
  etiqueta: string
  /** Ruta dentro del portal (relativa al basename del router). */
  href: string
  /** Solo se muestra con sesión iniciada. */
  requiereSesion?: boolean
}

export interface NavbarProps {
  /** Nombre del portal junto a la marca ("Catálogo", "Tienda"). */
  portal: string
  enlaces?: EnlaceNav[]
  /** Usuario con sesión; null = no autenticado. */
  usuario: UsuarioActual | null
  /** Si no se pasa, no se muestra el botón "Iniciar sesión". */
  onIniciarSesion?: () => void
  onCerrarSesion?: () => void
  /** Contenido extra a la derecha (p. ej. un enlace a otro portal). */
  acciones?: ReactNode
}

const NOMBRE_ROL = { DUENO: 'Dueño', EMPLEADO: 'Empleado', CLIENTE: 'Cliente' } as const

export function Navbar({
  portal,
  enlaces = [],
  usuario,
  onIniciarSesion,
  onCerrarSesion,
  acciones,
}: NavbarProps) {
  // El menú móvil guarda la ruta en la que se abrió: al navegar a otra ruta se cierra solo.
  const { pathname } = useLocation()
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null)
  const abierto = abiertoEn === pathname
  const botonMenu = useRef<HTMLButtonElement>(null)

  // Escape cierra el menú móvil y regresa el foco al botón que lo abrió.
  function alPresionarTecla(e: KeyboardEvent) {
    if (e.key === 'Escape' && abierto) {
      setAbiertoEn(null)
      botonMenu.current?.focus()
    }
  }
  const visibles = enlaces.filter((e) => !e.requiereSesion || usuario)

  const claseEnlace = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground',
      isActive ? 'bg-accent text-foreground' : 'text-muted-foreground',
    )

  const botonSesion = (movil: boolean) =>
    usuario ? (
      <Button variant="ghost" size="sm" fullWidth={movil} onClick={onCerrarSesion}>
        <LogOut aria-hidden="true" /> Salir
      </Button>
    ) : (
      onIniciarSesion && (
        <Button size="sm" fullWidth={movil} onClick={onIniciarSesion}>
          Iniciar sesión
        </Button>
      )
    )

  return (
    <header
      className="border-b bg-card"
      data-autenticado={usuario ? 'si' : 'no'}
      onKeyDown={alPresionarTecla}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex shrink-0 items-baseline gap-2">
          <span className="text-lg font-bold text-primary">TiendiNet</span>
          <span className="text-sm text-muted-foreground">{portal}</span>
        </Link>

        <nav aria-label="Principal" className="hidden flex-1 gap-1 md:flex">
          {visibles.map((e) => (
            <NavLink key={e.href} to={e.href} end className={claseEnlace}>
              {e.etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {acciones}
          {usuario && (
            <span className="text-sm text-muted-foreground">
              {usuario.nombre} · {NOMBRE_ROL[usuario.rol]}
            </span>
          )}
          {botonSesion(false)}
        </div>

        <Button
          ref={botonMenu}
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={abierto}
          aria-controls="menu-movil"
          onClick={() => setAbiertoEn(abierto ? null : pathname)}
        >
          {abierto ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </div>

      {abierto && (
        <div id="menu-movil" className="border-t px-4 py-3 md:hidden">
          <nav aria-label="Principal (móvil)" className="flex flex-col gap-1">
            {visibles.map((e) => (
              <NavLink key={e.href} to={e.href} end className={claseEnlace}>
                {e.etiqueta}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t pt-3">
            {usuario && (
              <span className="text-sm text-muted-foreground">
                {usuario.nombre} · {NOMBRE_ROL[usuario.rol]}
              </span>
            )}
            {acciones}
            {botonSesion(true)}
          </div>
        </div>
      )}
    </header>
  )
}
