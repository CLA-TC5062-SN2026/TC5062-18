# Revisión de seguridad: autenticación y protección de rutas (S05-S06-A2)

| Campo | Valor |
|---|---|
| Equipo | 18, TiendiNet |
| Código | `backend/app/seguridad.py`, `backend/app/rutas/auth.py`, `backend/app/config.py` |
| Contrato | `openapi_equipo.yaml`: esquema `bearerAuth`, `security: []` en las rutas públicas y «Roles ...» en cada operación |
| Librerías | `bcrypt` 5.0.0 para contraseñas, `PyJWT` 2.15.0 para tokens |
| Resultado | 3 endpoints de autenticación, middleware en 39 rutas protegidas y control por 3 roles. 147/147 verificaciones automáticas, más las pruebas manuales con `curl` de la sección «Protección de rutas» |

## Cómo se generó

Al agente se le dio `openapi_equipo.yaml` y el backend de S05-S06-A1 con esta instrucción:

> A partir de `openapi_equipo.yaml`, agrega al backend FastAPI un módulo de autenticación: registro con bcrypt que responda 201 sin la contraseña, inicio de sesión que responda 200 con un JWT o 401, y un endpoint que devuelva al usuario del token. Implementa un middleware que valide `Authorization: Bearer <token>` y responda 401 sin token válido. El secreto y la expiración del JWT van en variables de entorno (`JWT_SECRET`, `JWT_EXPIRATION`). Protege todas las rutas que en el contrato tienen `bearerAuth` y aplica los roles que indica cada operación (Dueño, Empleado, Cliente), con 403 si el rol no corresponde.

### Rutas: las del contrato y las de la actividad

La actividad nombra las rutas `/api/auth/register`, `/api/auth/login` y `/api/auth/me`. El contrato del equipo ya definía esas operaciones con otros nombres. Como el contrato es la fuente de verdad, se implementaron sus rutas y se agregaron las de la actividad como alias: el mismo código atiende las dos.

| Actividad | Contrato | Qué hace |
|---|---|---|
| `POST /api/auth/register` | `POST /clientes` | Registro público. Solo crea clientes; las cuentas de la tienda las crea el Dueño (`POST /usuarios`) y se activan con `POST /usuarios/activacion` |
| `POST /api/auth/login` | `POST /auth/sesiones` | Inicio de sesión. Devuelve `{token, tipo, expiraEn, usuario}` |
| `GET /api/auth/me` | `GET /auth/yo` | Usuario del token (`UsuarioResumen`) |

## Parte 1: módulo de autenticación

### Las cuatro preguntas de la revisión

**1. ¿El JWT tiene tiempo de expiración explícito?** Sí. Cada token lleva `exp` y `iat`, y la verificación exige que existan: un token sin `exp` se rechaza.

`app/seguridad.py`, líneas 73 a 79:
```python
def crear_token(usuario: m.Usuario, rol: str) -> tuple[str, datetime]:
    minutos = config.JWT_EXPIRATION_CLIENTE if rol == "CLIENTE" else config.JWT_EXPIRATION
    ahora = datetime.now(timezone.utc)
    expira = ahora + timedelta(minutes=minutos)
    carga = {"sub": str(usuario.id), "rol": rol, "correo": usuario.correo,
             "iat": ahora, "exp": expira, "jti": uuid.uuid4().hex}
```
Líneas 85 y 86, en `leer_token`: `algorithms=[config.JWT_ALGORITMO]` y `options={"require": ["exp", "iat", "sub"]}`.

Duración: 60 minutos para Dueño y Empleado, y 24 horas para Cliente, como dice el contrato en `bearerAuth`. Se comprobó decodificando tokens reales: `exp - iat` es 3600 para la Dueña y 86400 para un cliente.

**2. ¿El registro devuelve la contraseña?** No. La respuesta se arma con `json_cliente`, que solo lee estos campos (`app/comun.py`, líneas 190 a 193):
```python
return {"id": ..., "nombre": ..., "correo": ..., "telefono": ..., "rol": "CLIENTE",
        "estado": ..., "direccion": {"calle": ..., "codigoPostal": ...}}
```
La contraseña se convierte en hash antes de guardarla (`app/rutas/acceso.py`, línea 37: `password_hash=hash_contrasena(cuerpo.contrasena)`), y en la base solo queda el hash bcrypt (`$2b$12$...`). La prueba automática revisa que la respuesta no traiga `contrasena`, `password`, `passwordHash` ni `password_hash`.

**3. ¿El middleware rechaza firmas inválidas y tokens expirados?** Sí, con 401 y un código distinto para cada caso (`app/seguridad.py`, líneas 126 a 134):
```python
if tipo.lower() != "bearer" or not token.strip():
    return _no_autorizado("TOKEN_AUSENTE", ...)
try:
    carga = leer_token(token.strip())
    ...
except jwt.ExpiredSignatureError:
    return _no_autorizado("TOKEN_EXPIRADO", ...)
except (jwt.InvalidTokenError, ValueError, KeyError):
    return _no_autorizado("TOKEN_INVALIDO", ...)
```
Casos probados contra la API en ejecución, todos con 401:

| Token enviado | Código |
|---|---|
| Ninguno | `TOKEN_AUSENTE` |
| `Basic <token>` en vez de `Bearer` | `TOKEN_AUSENTE` |
| Un carácter de la firma cambiado | `TOKEN_INVALIDO` |
| Firma correcta, pero vencido hace una hora | `TOKEN_EXPIRADO` |
| Firmado con otro secreto | `TOKEN_INVALIDO` |
| `alg: none`, sin firma | `TOKEN_INVALIDO` |
| Token de Empleado con `rol` cambiado a `DUENO` y vuelto a firmar | `TOKEN_INVALIDO` |

El `alg: none` y la confusión de algoritmos se bloquean porque `jwt.decode` recibe la lista cerrada `algorithms=["HS256"]` y no confía en el encabezado del token.

**4. ¿El secreto está en el código o en una variable de entorno?** En variable de entorno. Además, la API no arranca si falta o es débil (`app/config.py`, líneas 33 a 38):
```python
JWT_SECRET = os.getenv("JWT_SECRET", "")
if len(JWT_SECRET) < 32:
    raise RuntimeError("JWT_SECRET falta o tiene menos de 32 caracteres. ...")
```
`JWT_EXPIRATION` (línea 42) y `JWT_EXPIRATION_CLIENTE` (línea 43) también salen del entorno, con límites. `.env.example` trae las tres variables con un valor de ejemplo, y el `.env` real está en `.gitignore`. Se comprobó arrancando con `JWT_SECRET=corto`: la API se niega a iniciar.

### Otros puntos revisados

| Punto | Evidencia | Estado |
|---|---|---|
| bcrypt con costo explícito | `seguridad.py:49` `bcrypt.hashpw(..., bcrypt.gensalt(config.BCRYPT_ROUNDS))`, costo 12 por defecto (`config.py:44`) | Correcto |
| Mismo mensaje si falla el correo o la contraseña | `auth.py:83` `raise CREDENCIALES_INVALIDAS` en los dos casos (RF-01-AC-2) | Correcto; la prueba compara las dos respuestas |
| Bloqueo tras 5 intentos fallidos | `auth.py:48` `_segundos_de_bloqueo`: correo + IP, 15 minutos, 429 con `reintentaEnSegundos` (RF-01-AC-5) | Correcto; el sexto intento responde 429 |
| Token de activación de un solo uso | `auth.py:104` busca por `hash_token(...)` (SHA-256); `auth.py:112` lo marca como usado | Correcto; reusarlo responde 422 |
| El token no queda en caché | `auth.py:89` `Cache-Control: no-store` en la respuesta del login | Correcto |
| 401 indica cómo autenticarse | `seguridad.py:110` `WWW-Authenticate: Bearer` | Correcto |

### Hallazgos y correcciones propias

Estas correcciones salieron de revisar el código generado. No las pedía la instrucción.

| # | Hallazgo | Riesgo | Corrección y evidencia |
|---|---|---|---|
| 1 | **El encabezado `X-Usuario-Id` de S05-S06-A1 seguía en `comun.py`.** Lo pusimos para probar el CRUD sin seguridad, y cualquiera podía hacerse pasar por la Dueña con solo mandar su id | Suplantación total: un cliente podía cambiar precios | Se borraron `actor_tienda` y `actor_cliente` de `comun.py`. Ahora el actor sale solo del token (`seguridad.py:156-180`). Una búsqueda de `X-Usuario-Id` en `app/` ya no encuentra nada |
| 2 | **bcrypt solo acepta 72 bytes.** Con bcrypt 5.0, una contraseña más larga lanza `ValueError: password cannot be longer than 72 bytes`, que la API habría devuelto como 500. Una contraseña de 40 «Ñ1» (120 bytes) lo provocaba | Error 500 en un endpoint público; en versiones anteriores de bcrypt, truncado silencioso de la contraseña | `seguridad.py:44`: `if len(contrasena.encode("utf-8")) > 72` responde 422 con el campo. `verificar_contrasena` (línea 54) tampoco llama a bcrypt con más de 72 bytes |
| 3 | **Un JWT sigue siendo válido después de desactivar la cuenta.** El token no tiene estado, y el contrato (RF-03-AC-2) pide 401 en cuanto la cuenta se desactiva | Un empleado dado de baja seguiría operando hasta 60 minutos | El middleware consulta la cuenta en cada petición (`seguridad.py:113-117` y `137`): si está `INACTIVA`, 401 `CUENTA_INACTIVA`. Probado: se desactiva al empleado, su token vigente recibe 401, y al reactivarlo vuelve a funcionar |
| 4 | **El rol viaja en el token.** Si el Dueño cambia el rol de alguien, el token viejo conservaría el rol anterior | Privilegios que ya no corresponden | La misma consulta compara el `rol` del token con el de la base (`seguridad.py:116`); si no coinciden, 401 |
| 5 | **El tiempo de respuesta del login revelaba qué correos existen.** Si el correo no existe, no hay hash que comparar y la respuesta saldría unos 210 ms antes: es lo que tarda un `checkpw` con costo 12, medido en 214 ms | Enumeración de cuentas, aunque el mensaje sea el mismo | `seguridad.py:35` crea un hash señuelo y `verificar_contrasena` lo usa cuando no hay usuario (línea 55). Medido después de la corrección: 233 ms con correo existente y 228 ms con inexistente (mediana de 6 intentos) |

**Verificado que no era problema:** se probó si cambiar el último carácter del JWT podía dejarlo válido, porque en base64url ese carácter trae bits de relleno. Con PyJWT 2.15 no: en 12,600 cambios del último carácter, ninguno pasó la verificación.

## Parte 2: protección de rutas

### Cómo se aplica

1. **El middleware protege por omisión** (`seguridad.py:119`, registrado en `main.py:28`). Toda ruta exige token salvo las de `RUTAS_PUBLICAS` (`seguridad.py:94`), que son las que en el contrato tienen `security: []`. Una ruta nueva queda protegida sin hacer nada; para abrirla hay que agregarla a esa lista a propósito.
2. **Cada ruta declara sus roles** con una de tres dependencias (`seguridad.py:178-180`):

| Dependencia | Roles | Uso |
|---|---|---|
| `DUENO` | Dueño | Fichas con costo, proveedores, configuración, usuarios |
| `TIENDA` | Dueño y Empleado | POS, ventas, recepciones, inventario sin costo |
| `CLIENTE` | Cliente | Carrito |

Si el token es válido pero el rol no está permitido, la respuesta es 403 `PROHIBIDO`.

### Rutas protegidas

La tabla la genera `backend/verificar_roles.py`. El script lee cada ruta de la API, detecta su dependencia de rol y la compara con `security` y con la frase «Roles ...» de esa operación en `openapi_equipo.yaml`. Resultado: **44 operaciones, 39 protegidas, 5 públicas, 0 diferencias con el contrato.**

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

Dentro de las rutas de Dueño y Empleado, algunos datos dependen del rol: el costo unitario de lotes y recepciones solo sale para el Dueño, y si un Empleado envía costo en una recepción se ignora (RF-05-AC-3).

### Pruebas manuales desde la terminal

Se corrieron con `backend/pruebas_seguridad.sh` contra la API con `datos_prueba.sql`. La ruta es `GET /proveedores`, que en el contrato es solo del Dueño. Esta es la salida real:

```
### 1. Sin token -> 401
$ curl http://localhost:8000/proveedores
{"mensaje":"Falta el token. Envía Authorization: Bearer <token>.","codigo":"TOKEN_AUSENTE"}  -> HTTP 401

### 2. Token con un carácter cambiado -> 401
$ curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXV…" http://localhost:8000/proveedores
{"mensaje":"El token no es válido.","codigo":"TOKEN_INVALIDO"}  -> HTTP 401

### 3. Token válido de Empleado (rol incorrecto) -> 403
$ curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXV…" http://localhost:8000/proveedores
{"mensaje":"Tu rol no tiene permiso para esta operación.","codigo":"PROHIBIDO"}  -> HTTP 403

### 4. Token válido de Dueña (rol correcto) -> 200
$ curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXV…" http://localhost:8000/proveedores
{"datos":[{"id":"a19494bc-…","nombre":"Proveedor A","tipo":"CON_BD","activo":true}, … ]}  -> HTTP 200
```

| Caso | Esperado | Obtenido |
|---|---|---|
| Sin token | 401 | 401 `TOKEN_AUSENTE` |
| Token con un carácter cambiado | 401 | 401 `TOKEN_INVALIDO` |
| Rol incorrecto (Empleado en ruta de Dueño) | 403 | 403 `PROHIBIDO` |
| Token válido y rol correcto (Dueña) | 200 | 200 con los proveedores |

En Windows (`cmd`) se reproducen así, después de copiar el token del login:

```
curl http://localhost:8000/proveedores
curl -H "Authorization: Bearer PEGA_AQUI_EL_TOKEN" http://localhost:8000/proveedores
```

### Más casos de rol, probados automáticamente

`backend/verificar_api.py` repite el escenario de S05-S06-A1, ahora con token, y agrega 40 casos de seguridad. Resultado: **147/147**. Los casos de rol:

| Quién | Petición | Resultado |
|---|---|---|
| Empleado | `GET /productos` (fichas con costo) | 403 |
| Empleado | `GET /productos/{id}/costo` (RF-01-AC-3) | 403 |
| Empleado | `PATCH /configuracion` | 403 |
| Empleado | `GET /pos/productos` | 200 |
| Cliente | `POST /ventas` | 403 |
| Cliente | `POST /productos` | 403 |
| Dueña | `GET /carrito` (solo Cliente) | 403 |
| Cliente | `GET /carrito` | 200 |
| Empleado desactivado, token vigente | `GET /pos/productos` | 401 `CUENTA_INACTIVA` |

## Pendientes para siguientes sprints

- **Revocar un token sin desactivar la cuenta** (cerrar sesión en un dispositivo). Hoy un token vive hasta su `exp`; si hace falta, se agrega una lista de `jti` revocados.
- **HTTPS.** En local la API corre en HTTP. En el piloto va detrás del túnel HTTPS del SRS, y ahí el token nunca debe viajar en claro.
- Las rutas públicas que el contrato tiene y todavía no se implementan (`/catalogo`, `/configuracion/publica` y recuperación de contraseña) deben agregarse a `RUTAS_PUBLICAS` cuando existan. Si se olvida, quedan protegidas, que es el lado seguro del error.
