# Code review del backend TiendiNet

## Archivo de lógica compleja
El análisis principal se realizó sobre `app/rutas/ventas.py`, especialmente `confirmar_venta`, porque coordina pago, bloqueo de filas, existencia disponible, FEFO, movimientos, folio, alertas, auditoría e idempotencia.

## Hallazgos concretos

### 1. Responsabilidades múltiples en confirmación de venta
**Archivo:** `app/rutas/ventas.py`, función `confirmar_venta`.

La ruta conoce reglas de pago, inventario y persistencia. El riesgo es que un cambio en FEFO provoque regresiones en pago o idempotencia. La siguiente iteración debe extraer un `ServicioConfirmacionVenta` inyectable. En esta entrega se agregó tipado explícito a la agrupación de pedidos y se mantuvo la transacción probada.

### 2. Condición de carrera en UUIDv7
**Archivo:** `app/modelos.py`, función `uuid7`.

`_ultimo` era una lista global modificada sin sincronización. Se añadió `_uuid7_lock` y una sección crítica que protege milisegundo y contador.

### 3. Traducción de integridad acoplada al adaptador HTTP
**Archivo:** `app/errores.py`, manejador `_integridad`.

El mapa de restricciones y la política SQLSTATE estaban dentro del manejador. Se extrajeron a `RESTRICCIONES_CONOCIDAS` y `traducir_integridad`, función pura y reutilizable.

### 4. Posibles valores nulos en autenticación
**Archivo:** `app/rutas/auth.py`, `usuario_actual` y `activar_usuario`.

Las consultas `db.get` pueden devolver `None`. Se añadieron respuestas controladas 401, 422 y 500 antes de acceder a atributos.

### 5. Posible carrito inexistente
**Archivo:** `app/rutas/carrito.py`, rutas de alta, cambio y eliminación.

Se creó `_obtener_o_crear_carrito` con retorno no opcional. Las rutas que operan sobre un carrito existente verifican explícitamente su ausencia.

### 6. Nulabilidad incompatible en productos
**Archivo:** `app/rutas/productos.py`, actualización de precio y costo.

`a_decimal` devuelve `Decimal | None`. Ahora ambos valores se validan antes de asignarlos al ORM.

### 7. Conversores sin contrato común
**Archivo:** `app/rutas/configuracion.py`, `COLUMNAS`.

Mypy infería `object` y rechazaba `convertir(valor)`. Se declaró `Conversor = Callable[[Any], Any]` y se tipó el diccionario.

## Sección SOLID

| Principio | ¿Se respeta? | Ejemplo en el código | Propuesta o cambio |
|---|---|---|---|
| SRP | Parcialmente | `ventas.py`, `confirmar_venta` coordina más de ocho tareas | Extraer `ServicioConfirmacionVenta`; ya se aislaron traducción de integridad y creación de carrito |
| OCP | Parcialmente | Antes, cada restricción exigía editar el manejador | Aplicado: mapa declarativo `RESTRICCIONES_CONOCIDAS` |
| LSP | Sí, con alcance limitado | Esquemas heredan de `Cerrado` y conservan `extra="forbid"` | Mantener contratos y agregar pruebas de subclases |
| ISP | Parcialmente | Las rutas dependen de la interfaz amplia `Session` | Crear puertos `RepositorioVentas` y `RepositorioInventario` |
| DIP | No | Las rutas dependen directamente de SQLAlchemy y modelos ORM | Inyectar servicios/repositorios; mantener SQLAlchemy como adaptador |

## Seguridad
Las consultas revisadas usan SQLAlchemy o parámetros enlazados. La configuración exige un secreto JWT de al menos 32 caracteres. Los cambios no relajan autenticación, roles, expiración, idempotencia ni bloqueos.
