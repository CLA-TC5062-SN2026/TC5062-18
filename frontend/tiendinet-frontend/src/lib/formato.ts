// El contrato manda el dinero como texto con dos decimales ("38.50", RD-07)
// y las fechas de negocio en America/Mexico_City. Formatear solo para mostrar:
// nunca convertir a número para hacer cuentas en el frontend.

const formatoDinero = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

export function formatearDinero(monto: string): string {
  return formatoDinero.format(Number(monto))
}

const formatoFecha = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Mexico_City',
})

export function formatearFecha(iso: string): string {
  return formatoFecha.format(new Date(iso))
}
