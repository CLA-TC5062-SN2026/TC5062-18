import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import { useGuardarProducto } from '@/services/productosService'
import type { CuerpoDe, Esquema } from '@/types/api'

type Producto = Esquema<'Producto'>

interface Valores {
  codigoBarras: string
  nombre: string
  presentacion: string
  categoria: string
  precioVenta: string
  costoReferencia: string
  prInicial: string
  perecedero: boolean
  restringido: boolean
}

type CampoTexto = Exclude<keyof Valores, 'perecedero' | 'restringido'>
type Errores = Partial<Record<CampoTexto, string>>

const MONTO = /^\d+(\.\d{1,2})?$/
const ENTERO = /^\d+$/
const EAN13 = /^\d{13}$/

function valoresIniciales(p?: Producto): Valores {
  return {
    codigoBarras: p?.codigoBarras ?? '',
    nombre: p?.nombre ?? '',
    presentacion: p?.presentacion ?? '',
    categoria: p?.categoria ?? '',
    precioVenta: p?.precioVenta ?? '',
    costoReferencia: p?.costoReferencia ?? '',
    prInicial: p ? String(p.prInicial) : '',
    perecedero: p?.perecedero ?? false,
    restringido: p?.restringido ?? false,
  }
}

/** "38.5" → "38.50", "12" → "12.00". El contrato exige dos decimales (RD-07). Solo da formato, no calcula. */
function aDinero(monto: string): string {
  const [enteros, decimales = ''] = monto.trim().split('.')
  return `${enteros}.${decimales.padEnd(2, '0')}`
}

function validar(v: Valores, esNuevo: boolean): Errores {
  const e: Errores = {}
  const codigo = v.codigoBarras.trim()
  if (codigo && !EAN13.test(codigo)) e.codigoBarras = 'El código de barras tiene 13 dígitos.'
  if (!v.nombre.trim()) e.nombre = 'Escribe el nombre del producto.'
  if (!v.presentacion.trim()) e.presentacion = 'Escribe la presentación, por ejemplo 1 kg o 600 ml.'
  if (!v.categoria.trim()) e.categoria = 'Escribe la categoría.'
  if (!v.precioVenta.trim()) e.precioVenta = 'Escribe el precio de venta.'
  else if (!MONTO.test(v.precioVenta.trim())) e.precioVenta = 'Usa un monto como 38.50, sin signo de pesos.'
  if (!v.costoReferencia.trim()) e.costoReferencia = 'Escribe el costo de referencia.'
  else if (!MONTO.test(v.costoReferencia.trim())) e.costoReferencia = 'Usa un monto como 29.00, sin signo de pesos.'
  if (esNuevo) {
    if (!v.prInicial.trim()) e.prInicial = 'Escribe el punto de reorden inicial.'
    else if (!ENTERO.test(v.prInicial.trim())) e.prInicial = 'El punto de reorden es un número entero de 0 o más.'
  }
  return e
}

function aCuerpo(v: Valores): CuerpoDe<'crearProducto'> {
  return {
    codigoBarras: v.codigoBarras.trim() || null,
    nombre: v.nombre.trim(),
    presentacion: v.presentacion.trim(),
    categoria: v.categoria.trim(),
    precioVenta: aDinero(v.precioVenta),
    costoReferencia: aDinero(v.costoReferencia),
    prInicial: Number(v.prInicial || 0),
    perecedero: v.perecedero,
    restringido: v.restringido,
  }
}

const ORDEN: CampoTexto[] = [
  'codigoBarras', 'nombre', 'presentacion', 'categoria', 'precioVenta', 'costoReferencia', 'prInicial',
]

interface Props {
  /** Ficha a editar. Sin ella, el formulario da de alta un producto nuevo. */
  producto?: Producto
  onSuccess: (producto: Producto) => void
  onCancelar: () => void
}

/**
 * Alta y edición de la ficha de un producto (RF-04). El mismo formulario sirve para
 * los dos casos: con `producto` edita (PUT), sin él crea (POST).
 * Valida antes de enviar; los errores de la API (409 por duplicado, 422 por campo)
 * se muestran en el mismo formulario.
 */
export function FormularioProducto({ producto, onSuccess, onCancelar }: Props) {
  const esNuevo = !producto
  const guardar = useGuardarProducto()
  const [valores, setValores] = useState(() => valoresIniciales(producto))
  const [enviado, setEnviado] = useState(false)

  const errores = validar(valores, esNuevo)
  const errorApi = guardar.error
  const mostrar = (campo: CampoTexto) =>
    (enviado ? errores[campo] : undefined) ??
    errorApi?.mensajeDeCampo(campo) ??
    (campo === 'codigoBarras' && errorApi?.codigo === 'CODIGO_DUPLICADO' ? 'Ya está registrado en otro producto.' : undefined)
  const mensajeApi = errorApi && errorApi.detalles.length === 0 ? errorApi.message : undefined
  const idPrefijo = producto ? `producto-${producto.id}` : 'producto-nuevo'

  function cambiar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((v) => ({ ...v, [campo]: valor }))
    // Al corregir un dato, el error anterior de la API ya no aplica.
    if (guardar.error) guardar.reset()
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviado(true)
    const primero = ORDEN.find((c) => errores[c])
    if (primero) {
      // Lleva el foco al primer campo con error para que se lea su mensaje (WCAG 3.3.1).
      document.getElementById(`${idPrefijo}-${primero}`)?.focus()
      return
    }
    guardar.mutate({ id: producto?.id, cuerpo: aCuerpo(valores) }, { onSuccess })
  }

  const campo = (nombre: CampoTexto, etiqueta: string, extra: Partial<Parameters<typeof Campo>[0]> = {}) => (
    <Campo
      id={`${idPrefijo}-${nombre}`}
      label={etiqueta}
      value={valores[nombre]}
      onChange={(e) => cambiar(nombre, e.target.value)}
      error={mostrar(nombre)}
      {...extra}
    />
  )

  return (
    <form onSubmit={enviar} noValidate aria-label={esNuevo ? 'Nuevo producto' : `Editar ${producto.nombre}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campo('nombre', 'Nombre', { required: true, placeholder: 'Frijol negro' })}
        {campo('presentacion', 'Presentación', { required: true, placeholder: '1 kg' })}
        {campo('categoria', 'Categoría', { required: true, placeholder: 'Abarrotes' })}
        {campo('precioVenta', 'Precio de venta', { required: true, inputMode: 'decimal', placeholder: '38.50' })}
        {campo('costoReferencia', 'Costo de referencia', { required: true, inputMode: 'decimal', placeholder: '29.00' })}
        {campo('codigoBarras', 'Código de barras', {
          inputMode: 'numeric',
          ayuda: 'Opcional. Los 13 dígitos del empaque.',
        })}
        {esNuevo &&
          campo('prInicial', 'Punto de reorden inicial', {
            required: true,
            inputMode: 'numeric',
            ayuda: 'Piezas con las que te avisamos que hay que resurtir.',
          })}
      </div>

      <fieldset className="mt-4 flex flex-wrap gap-6">
        <legend className="sr-only">Características</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={valores.perecedero}
            onChange={(e) => cambiar('perecedero', e.target.checked)}
          />
          Es perecedero (tiene fecha de caducidad)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={valores.restringido}
            onChange={(e) => cambiar('restringido', e.target.checked)}
          />
          Alcohol o tabaco (solo se vende en mostrador)
        </label>
      </fieldset>

      {mensajeApi && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {mensajeApi}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" fullWidth="mobile" loading={guardar.isPending} loadingText="Guardando…">
          {esNuevo ? 'Crear producto' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="secondary" fullWidth="mobile" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
