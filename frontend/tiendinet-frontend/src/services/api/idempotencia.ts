// Los POST que cobran o mueven existencia exigen el encabezado Idempotency-Key
// (confirmar venta, venta diferida, recepción, ajuste, corte, crear pedido e iniciar pago).
//
// La clave identifica UNA operación lógica: se genera cuando el usuario inicia la
// acción (presiona "Cobrar") y se reutiliza en cada reintento de esa misma acción.
// Así, si se pierde la respuesta por internet intermitente, el reintento no cobra dos veces:
// la API devuelve la respuesta original con `Idempotency-Replayed: true`.
//
// Uso con TanStack Query:
//   const [clave] = useState(nuevaClaveIdempotencia)        // una por pantalla de cobro
//   useMutation({ mutationFn: (c) => confirmarVenta(ventaId, c, clave), retry: 2 })
//   // después de un cobro exitoso, genera una clave nueva para la siguiente venta.

export function nuevaClaveIdempotencia(): string {
  return crypto.randomUUID()
}
