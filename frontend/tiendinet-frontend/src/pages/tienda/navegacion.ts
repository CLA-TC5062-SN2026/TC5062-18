import type { EnlaceNav } from '@/components/Navbar'
import type { Rol } from '@/types/api'

/** Página de productos del Portal Tienda (solo Dueño, porque muestra costos). */
export const RUTA_PRODUCTOS = '/productos'

/** Enlaces de la barra del Portal Tienda según el rol. El Empleado no ve productos (RF-01-AC-3). */
export function enlacesTienda(rol: Rol | undefined): EnlaceNav[] {
  const enlaces: EnlaceNav[] = [{ etiqueta: 'Dashboard', href: '/dashboard', requiereSesion: true }]
  if (rol === 'DUENO') enlaces.push({ etiqueta: 'Productos', href: RUTA_PRODUCTOS, requiereSesion: true })
  return enlaces
}
