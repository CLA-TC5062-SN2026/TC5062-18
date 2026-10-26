"""Seguridad: contraseñas con bcrypt, tokens JWT, middleware y roles.

Flujo de cada petición:
  1. MiddlewareAutenticacion: toda ruta que no sea pública exige
     `Authorization: Bearer <token>`. Sin token, con firma inválida,
     expirado o de una cuenta inactiva: 401.
  2. Dependencias de rol (DUENO, TIENDA, CLIENTE): si el rol del token no
     tiene permiso para esa ruta: 403.
Una ruta nueva queda protegida por omisión; para hacerla pública hay que
agregarla a RUTAS_PUBLICAS, igual que en el contrato hay que poner
`security: []`.
"""
import hashlib
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from app import config
from app import modelos as m
from app.db import FabricaSesion, obtener_db
from app.errores import ErrorApi, datos_invalidos

# ------------------------------------------------------------- contraseñas
# Hash de referencia para gastar el mismo tiempo cuando el correo no existe
# (así el tiempo de respuesta no revela qué correos están registrados).
_HASH_SEÑUELO = bcrypt.hashpw(b"senuelo-tiendinet", bcrypt.gensalt(config.BCRYPT_ROUNDS))


def validar_contrasena(contrasena: str, campo: str = "contrasena") -> None:
    """Política del SRS: 8 o más caracteres, con una letra y un número.
    bcrypt solo usa los primeros 72 bytes, así que más largo se rechaza."""
    if len(contrasena) < 8 or not re.search(r"[A-Za-zÁÉÍÓÚáéíóúÑñ]", contrasena) \
            or not re.search(r"\d", contrasena):
        raise datos_invalidos(campo, "La contraseña debe tener al menos 8 caracteres, con una letra y un número.")
    if len(contrasena.encode("utf-8")) > 72:
        raise datos_invalidos(campo, "La contraseña no puede pasar de 72 bytes.")


def hash_contrasena(contrasena: str) -> str:
    return bcrypt.hashpw(contrasena.encode("utf-8"), bcrypt.gensalt(config.BCRYPT_ROUNDS)).decode()


def verificar_contrasena(contrasena: str, hash_guardado: str | None) -> bool:
    datos = contrasena.encode("utf-8")
    if len(datos) > 72 or not hash_guardado or not hash_guardado.startswith("$2"):
        bcrypt.checkpw(b"x", _HASH_SEÑUELO)
        return False
    return bcrypt.checkpw(datos, hash_guardado.encode())


def hash_token(token: str) -> str:
    """Los tokens de un solo uso se guardan como SHA-256, nunca en claro."""
    return hashlib.sha256(token.encode()).hexdigest()


# ------------------------------------------------------------------- JWT
@dataclass(frozen=True)
class Sesion:
    usuario_id: uuid.UUID
    rol: str
    correo: str


def crear_token(usuario: m.Usuario, rol: str) -> tuple[str, datetime]:
    minutos = config.JWT_EXPIRATION_CLIENTE if rol == "CLIENTE" else config.JWT_EXPIRATION
    ahora = datetime.now(timezone.utc)
    expira = ahora + timedelta(minutes=minutos)
    carga = {"sub": str(usuario.id), "rol": rol, "correo": usuario.correo,
             "iat": ahora, "exp": expira, "jti": uuid.uuid4().hex}
    return jwt.encode(carga, config.JWT_SECRET, algorithm=config.JWT_ALGORITMO), expira


def leer_token(token: str) -> dict:
    """Solo acepta HS256 firmado con nuestro secreto; exige exp, iat y sub.
    Rechaza `alg: none`, firmas alteradas y tokens vencidos."""
    return jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITMO],
                      options={"require": ["exp", "iat", "sub"]})


def rol_de(usuario: m.Usuario) -> str:
    return usuario.tienda.rol if usuario.tienda else "CLIENTE"


# -------------------------------------------------------------- middleware
RUTAS_PUBLICAS = {
    # Las que en openapi_equipo.yaml tienen `security: []` y ya están implementadas.
    ("POST", "/clientes"),
    ("POST", "/auth/sesiones"),
    ("POST", "/usuarios/activacion"),
    # Alias que pide la actividad S05-S06-A2 para registro e inicio de sesión.
    ("POST", "/api/auth/register"),
    ("POST", "/api/auth/login"),
    # Operación y documentación.
    ("GET", "/salud"), ("GET", "/docs"), ("GET", "/docs/oauth2-redirect"),
    ("GET", "/openapi.json"), ("GET", "/redoc"),
}


def _no_autorizado(codigo: str, mensaje: str) -> JSONResponse:
    return JSONResponse(status_code=401, content={"mensaje": mensaje, "codigo": codigo},
                        headers={"WWW-Authenticate": "Bearer"})


def _cuenta_vigente(sesion_id: uuid.UUID, rol: str) -> bool:
    with FabricaSesion() as db:
        usuario = db.get(m.Usuario, sesion_id)
        return bool(usuario and usuario.estado == "ACTIVO" and rol_de(usuario) == rol)


class MiddlewareAutenticacion(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or (request.method, request.url.path) in RUTAS_PUBLICAS:
            return await call_next(request)

        encabezado = request.headers.get("Authorization", "")
        tipo, _, token = encabezado.partition(" ")
        if tipo.lower() != "bearer" or not token.strip():
            return _no_autorizado("TOKEN_AUSENTE", "Falta el token. Envía Authorization: Bearer <token>.")
        try:
            carga = leer_token(token.strip())
            sesion = Sesion(uuid.UUID(carga["sub"]), str(carga.get("rol", "")), str(carga.get("correo", "")))
        except jwt.ExpiredSignatureError:
            return _no_autorizado("TOKEN_EXPIRADO", "La sesión expiró. Inicia sesión de nuevo.")
        except (jwt.InvalidTokenError, ValueError, KeyError):
            return _no_autorizado("TOKEN_INVALIDO", "El token no es válido.")

        # RF-03-AC-2: una cuenta desactivada recibe 401 aunque su token siga vigente.
        if not await run_in_threadpool(_cuenta_vigente, sesion.usuario_id, sesion.rol):
            return _no_autorizado("CUENTA_INACTIVA", "La cuenta no está activa. Inicia sesión de nuevo.")

        request.state.sesion = sesion
        return await call_next(request)


# ------------------------------------------------------------------- roles
def sesion_actual(request: Request) -> Sesion:
    sesion = getattr(request.state, "sesion", None)
    if sesion is None:  # Solo pasaría si una ruta pública pide sesión por error.
        raise ErrorApi(401, "TOKEN_AUSENTE", "Falta el token. Envía Authorization: Bearer <token>.")
    return sesion


def _prohibido() -> ErrorApi:
    return ErrorApi(403, "PROHIBIDO", "Tu rol no tiene permiso para esta operación.")


def usuario_tienda(*roles: str):
    """Dependencia: exige un usuario de la tienda con alguno de los roles."""
    def dependencia(sesion: Sesion = Depends(sesion_actual), db: Session = Depends(obtener_db)) -> m.UsuarioTienda:
        if sesion.rol not in roles:
            raise _prohibido()
        usuario = db.get(m.UsuarioTienda, sesion.usuario_id)
        if usuario is None:
            raise _prohibido()
        return usuario
    return dependencia


def usuario_cliente(sesion: Sesion = Depends(sesion_actual), db: Session = Depends(obtener_db)) -> m.Cliente:
    if sesion.rol != "CLIENTE":
        raise _prohibido()
    cliente = db.get(m.Cliente, sesion.usuario_id)
    if cliente is None:
        raise _prohibido()
    return cliente


# Niveles de acceso que usan las rutas (columna «Roles» del contrato).
DUENO = usuario_tienda("DUENO")
TIENDA = usuario_tienda("DUENO", "EMPLEADO")
CLIENTE = usuario_cliente
