# API TiendiNet

Python 3.10 o más reciente, FastAPI, SQLAlchemy 2 y PostgreSQL 16. Implementa las operaciones de `openapi_equipo.yaml` para las entidades principales, con autenticación JWT y control de acceso por rol (S05-S06-A2).

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
cp .env.example .env               # ajusta DB_PASSWORD y pon un JWT_SECRET propio:
python -c "import secrets; print(secrets.token_urlsafe(48))"

# 3. Servidor
uvicorn app.main:app --reload --port 8000
```

- `http://localhost:8000/salud` confirma la conexión: versión de PostgreSQL y número de tablas (37).
- `http://localhost:8000/docs` abre la documentación interactiva.

Para volver a una base limpia, se cargan otra vez `esquema_bd.sql` y `datos_prueba.sql`.

## Autenticación

Toda ruta exige `Authorization: Bearer <token>`, salvo las públicas del contrato: registro, inicio de sesión y activación de cuentas.

| Operación | Ruta del contrato | Alias de la actividad |
|---|---|---|
| Registro de cliente | `POST /clientes` | `POST /api/auth/register` |
| Iniciar sesión | `POST /auth/sesiones` | `POST /api/auth/login` |
| Usuario del token | `GET /auth/yo` | `GET /api/auth/me` |

Usuarios de `datos_prueba.sql`, todos con contraseña `Tienda2026`:

| Usuario | Correo | Rol |
|---|---|---|
| Rosa Hernández | `duena@tiendinet.mx` | Dueña |
| Luis Pérez | `empleado@tiendinet.mx` | Empleado |
| Ana Torres | `ana@correo.mx` | Cliente |

Variables de entorno de seguridad: `JWT_SECRET` (obligatoria, 32 caracteres o más), `JWT_EXPIRATION` (minutos, 60), `JWT_EXPIRATION_CLIENTE` (minutos, 1440) y `BCRYPT_ROUNDS` (12). El detalle de la revisión está en `S05_S06_A2/revision_seguridad.md`.

## Qué cubre

38 operaciones CRUD en 7 módulos, los mismos de la arquitectura de equipo, más las de autenticación (inicio de sesión, usuario actual, activación y los alias de la actividad):

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
python verificar_roles.py ../openapi_equipo.yaml    # cada ruta tiene el rol que dice el contrato
./pruebas_seguridad.sh                             # 401 sin token, 401 token alterado, 403 rol, 200
```

```bash
python verificar_api.py http://localhost:8000 ../openapi_equipo.yaml
```

`verificar_api.py` ejecuta 113 peticiones, de éxito, de error y de seguridad. Por cada respuesta comprueba que la ruta exista en el contrato, que el código HTTP esté declarado y que el cuerpo valide contra el schema. Al final revisa en PostgreSQL que los datos persistieron y que las contraseñas se guardaron con bcrypt. Resultado: 147/147. Necesita una base recién cargada.
