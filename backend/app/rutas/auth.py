"""Autenticación: inicio de sesión, usuario actual y activación (RF-01, RF-03).

Rutas del contrato y su alias de la actividad S05-S06-A2:
  POST /auth/sesiones  = POST /api/auth/login
  GET  /auth/yo        = GET  /api/auth/me
  POST /clientes       = POST /api/auth/register   (en rutas/acceso.py)
"""
from datetime import timedelta

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import modelos as m
from app.comun import ahora, auditar, fecha_hora, json_usuario_tienda
from app.db import obtener_db
from app.errores import ErrorApi
from app.esquemas import Correo
from app.seguridad import (Sesion, crear_token, hash_contrasena, hash_token, rol_de, sesion_actual,
                           validar_contrasena, verificar_contrasena)

router = APIRouter(tags=["Acceso"])

INTENTOS_MAXIMOS = 5
BLOQUEO = timedelta(minutes=15)
CREDENCIALES_INVALIDAS = ErrorApi(401, "CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos.")


class InicioSesion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    correo: Correo
    contrasena: str


class ActivacionUsuario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str
    contrasena: str


def json_usuario_resumen(usuario: m.Usuario) -> dict:
    return {"id": str(usuario.id), "nombre": usuario.nombre, "correo": usuario.correo,
            "rol": rol_de(usuario), "estado": usuario.estado}


def _segundos_de_bloqueo(db: Session, correo: str, ip: str) -> int:
    """RF-01-AC-5: cinco fallos consecutivos de correo + IP en 15 minutos
    bloquean 15 minutos. Un inicio exitoso corta la racha."""
    recientes = db.execute(
        select(m.IntentoInicioSesion.exitoso, m.IntentoInicioSesion.fecha_hora)
        .where(func.lower(m.IntentoInicioSesion.correo) == correo.lower(),
               m.IntentoInicioSesion.ip == ip,
               m.IntentoInicioSesion.fecha_hora > ahora() - BLOQUEO)
        .order_by(m.IntentoInicioSesion.fecha_hora.desc()).limit(INTENTOS_MAXIMOS)).all()
    if len(recientes) < INTENTOS_MAXIMOS or any(exitoso for exitoso, _ in recientes):
        return 0
    restante = (recientes[0].fecha_hora + BLOQUEO - ahora()).total_seconds()
    return max(int(restante), 1)


@router.post("/auth/sesiones")
@router.post("/api/auth/login", include_in_schema=False)
def iniciar_sesion(cuerpo: InicioSesion, request: Request, db: Session = Depends(obtener_db)):
    ip = request.client.host if request.client else "0.0.0.0"
    espera = _segundos_de_bloqueo(db, cuerpo.correo, ip)
    if espera:
        return JSONResponse(status_code=429, headers={"Retry-After": str(espera)}, content={
            "mensaje": "Demasiados intentos fallidos. Espera antes de intentar de nuevo.",
            "codigo": "DEMASIADOS_INTENTOS", "reintentaEnSegundos": espera})

    usuario = db.scalars(select(m.Usuario).where(func.lower(m.Usuario.correo) == cuerpo.correo.lower())).first()
    # Se verifica la contraseña aunque el usuario no exista o esté inactivo, y
    # el mensaje es el mismo: la respuesta no dice cuál de los datos falló.
    valida = verificar_contrasena(cuerpo.contrasena, usuario.password_hash if usuario else None)
    exitoso = bool(usuario and valida and usuario.estado == "ACTIVO")
    db.add(m.IntentoInicioSesion(correo=cuerpo.correo.lower(), ip=ip, exitoso=exitoso))
    if not exitoso:
        auditar(db, usuario.id if usuario else None, "iniciar_sesion", "usuario",
                usuario.id if usuario else "-", None, {"correo": cuerpo.correo.lower(), "ip": ip}, "RECHAZADO")
        db.commit()
        raise CREDENCIALES_INVALIDAS

    rol = rol_de(usuario)
    token, expira = crear_token(usuario, rol)
    auditar(db, usuario.id, "iniciar_sesion", "usuario", usuario.id, None, {"rol": rol, "ip": ip})
    db.commit()
    return JSONResponse(status_code=200, headers={"Cache-Control": "no-store"}, content={
        "token": token, "tipo": "Bearer", "expiraEn": fecha_hora(expira), "usuario": json_usuario_resumen(usuario)})


@router.get("/auth/yo")
@router.get("/api/auth/me", include_in_schema=False)
def usuario_actual(sesion: Sesion = Depends(sesion_actual), db: Session = Depends(obtener_db)):
    usuario = db.get(m.Usuario, sesion.usuario_id)
    return json_usuario_resumen(usuario)


@router.post("/usuarios/activacion")
def activar_usuario(cuerpo: ActivacionUsuario, db: Session = Depends(obtener_db)):
    """Completa el correo de activación: define la contraseña y activa la cuenta."""
    registro = db.scalars(select(m.TokenCuenta).where(
        m.TokenCuenta.token_hash == hash_token(cuerpo.token), m.TokenCuenta.proposito == "ACTIVACION")
        .with_for_update()).first()
    if registro is None or registro.usado_en is not None or registro.expira_en <= ahora():
        raise ErrorApi(422, "ENLACE_INVALIDO", "El enlace de activación no es válido o ya expiró.")
    validar_contrasena(cuerpo.contrasena)
    usuario = db.get(m.Usuario, registro.usuario_id)
    usuario.password_hash = hash_contrasena(cuerpo.contrasena)
    usuario.estado = "ACTIVO"
    registro.usado_en = ahora()  # un solo uso
    auditar(db, usuario.id, "activar_usuario", "usuario_tienda", usuario.id, {"estado": "INACTIVO"},
            {"estado": "ACTIVO"})
    db.commit()
    return json_usuario_tienda(db.get(m.UsuarioTienda, usuario.id))
