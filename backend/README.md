# API TiendiNet: servicios CRUD (Parte 2)

Python 3.12 o más reciente, FastAPI, SQLAlchemy 2 y PostgreSQL 16. Implementa las operaciones de `openapi_equipo.yaml` para las entidades principales. **Sin seguridad**: JWT y roles llegan en la siguiente actividad.

## Correr en local

```bash
# 1. Base de datos (una vez)
createuser -P tiendinet            # contraseña: la que pongas en .env
createdb -O tiendinet tiendinet
psql -U tiendinet -d tiendinet -f ../esquema_bd.sql
psql -U tiendinet -d tiendinet -f datos_prueba.sql

# 2. Dependencias y variables
python -m venv .venv && source .venv/bin/activate   # en Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # y ajusta DB_PASSWORD

# 3. Servidor
uvicorn app.main:app --reload --port 8000
```

- `http://localhost:8000/salud` confirma la conexión: versión de PostgreSQL y número de tablas (37).
- `http://localhost:8000/docs` abre la documentación interactiva.

Para volver a una base limpia, se cargan otra vez `esquema_bd.sql` y `datos_prueba.sql`.

## Quién hace la operación

Mientras no hay JWT, el encabezado opcional `X-Usuario-Id` indica el usuario. Sin él, las operaciones de la tienda las hace la Dueña sembrada y las del carrito, la clienta sembrada.

| Usuario | Id | Rol |
|---|---|---|
| Rosa Hernández | `11111111-1111-4111-8111-111111111111` | Dueña |
| Luis Pérez | `22222222-2222-4222-8222-222222222222` | Empleado |
| Ana Torres | `33333333-3333-4333-8333-333333333333` | Cliente |

## Qué cubre

38 operaciones en 7 módulos, los mismos de la arquitectura de equipo:

| Módulo | Operaciones |
|---|---|
| Acceso | `POST /clientes`; `GET`, `POST /usuarios`; `GET`, `PATCH /usuarios/{id}` |
| Productos e inventario | `POST`, `GET /productos`; `GET`, `PUT /productos/{id}`; `PATCH .../estado`; `GET .../costo`; `GET .../lotes`; `GET /inventario/productos`; `GET /pos/productos` |
| Recepciones | `POST`, `GET /recepciones`; `GET /recepciones/{id}` |
| Proveedores | `GET`, `POST /proveedores`; `GET /proveedores/{id}` |
| Configuración | `GET`, `PATCH /configuracion`; `GET`, `POST /configuracion/codigos-postales`; `GET`, `PATCH .../{codigo}` |
| Punto de venta | `POST`, `GET /ventas`; `GET /ventas/{id}`; `POST`, `PATCH`, `DELETE` de renglones; `POST .../confirmaciones` (FEFO) |
| Carrito | `GET`, `DELETE /carrito`; `POST /carrito/renglones`; `PATCH`, `DELETE /carrito/renglones/{id}` |

El «Delete» de producto, proveedor, usuario y código postal es un cambio de estado, porque el contrato no los borra (RNF-14). Los `DELETE` reales del contrato son los de renglones de venta y del carrito, y están implementados.

Quedan para las siguientes semanas: pedidos, pagos y webhook, reembolsos, sincronización de proveedores, ofertas, propuestas, ajustes, alertas, cortes, tareas del reloj y reportes.

## Verificación

```bash
python verificar_api.py http://localhost:8000 ../openapi_equipo.yaml
```

Ejecuta 83 peticiones, de éxito y de error. Por cada respuesta comprueba que la ruta exista en el contrato, que el código HTTP esté declarado y que el cuerpo valide contra el schema. Al final revisa en PostgreSQL que los datos persistieron. Resultado: 104/104. Necesita una base recién cargada.
