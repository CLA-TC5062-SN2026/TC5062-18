| Método | Ruta | Token | Roles permitidos | Coincide con el contrato |
|---|---|---|---|---|
| POST | `/api/auth/login` (alias de `/auth/sesiones`) | Pública | — | ✓ |
| POST | `/api/auth/register` (alias de `/clientes`) | Pública | — | ✓ |
| POST | `/auth/sesiones` | Pública | — | ✓ |
| POST | `/clientes` | Pública | — | ✓ |
| POST | `/usuarios/activacion` | Pública | — | ✓ |
| GET | `/api/auth/me` (alias de `/auth/yo`) | Bearer | Cualquier rol | ✓ |
| GET | `/auth/yo` | Bearer | Cualquier rol | ✓ |
| DELETE | `/carrito` | Bearer | Cliente | ✓ |
| GET | `/carrito` | Bearer | Cliente | ✓ |
| POST | `/carrito/renglones` | Bearer | Cliente | ✓ |
| DELETE | `/carrito/renglones/{renglon_id}` | Bearer | Cliente | ✓ |
| PATCH | `/carrito/renglones/{renglon_id}` | Bearer | Cliente | ✓ |
| GET | `/configuracion` | Bearer | Dueño | ✓ |
| PATCH | `/configuracion` | Bearer | Dueño | ✓ |
| GET | `/configuracion/codigos-postales` | Bearer | Dueño | ✓ |
| POST | `/configuracion/codigos-postales` | Bearer | Dueño | ✓ |
| GET | `/configuracion/codigos-postales/{codigo}` | Bearer | Dueño | ✓ |
| PATCH | `/configuracion/codigos-postales/{codigo}` | Bearer | Dueño | ✓ |
| GET | `/inventario/productos` | Bearer | Dueño y Empleado | ✓ |
| GET | `/pos/productos` | Bearer | Dueño y Empleado | ✓ |
| GET | `/productos` | Bearer | Dueño | ✓ |
| POST | `/productos` | Bearer | Dueño | ✓ |
| GET | `/productos/{producto_id}` | Bearer | Dueño | ✓ |
| PUT | `/productos/{producto_id}` | Bearer | Dueño | ✓ |
| GET | `/productos/{producto_id}/costo` | Bearer | Dueño | ✓ |
| PATCH | `/productos/{producto_id}/estado` | Bearer | Dueño | ✓ |
| GET | `/productos/{producto_id}/lotes` | Bearer | Dueño y Empleado | ✓ |
| GET | `/proveedores` | Bearer | Dueño | ✓ |
| POST | `/proveedores` | Bearer | Dueño | ✓ |
| GET | `/proveedores/{proveedor_id}` | Bearer | Dueño | ✓ |
| GET | `/recepciones` | Bearer | Dueño y Empleado | ✓ |
| POST | `/recepciones` | Bearer | Dueño y Empleado | ✓ |
| GET | `/recepciones/{recepcion_id}` | Bearer | Dueño y Empleado | ✓ |
| GET | `/usuarios` | Bearer | Dueño | ✓ |
| POST | `/usuarios` | Bearer | Dueño | ✓ |
| GET | `/usuarios/{usuario_id}` | Bearer | Dueño | ✓ |
| PATCH | `/usuarios/{usuario_id}` | Bearer | Dueño | ✓ |
| GET | `/ventas` | Bearer | Dueño y Empleado | ✓ |
| POST | `/ventas` | Bearer | Dueño y Empleado | ✓ |
| GET | `/ventas/{venta_id}` | Bearer | Dueño y Empleado | ✓ |
| POST | `/ventas/{venta_id}/confirmaciones` | Bearer | Dueño y Empleado | ✓ |
| POST | `/ventas/{venta_id}/renglones` | Bearer | Dueño y Empleado | ✓ |
| DELETE | `/ventas/{venta_id}/renglones/{renglon_id}` | Bearer | Dueño y Empleado | ✓ |
| PATCH | `/ventas/{venta_id}/renglones/{renglon_id}` | Bearer | Dueño y Empleado | ✓ |

44 operaciones; 39 protegidas, 5 públicas; diferencias con el contrato: 0
