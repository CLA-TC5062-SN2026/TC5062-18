"""Acceso y usuarios: registro de clientes y cuentas de la tienda (RF-02, RF-03)."""
import logging
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import modelos as m
from app import config
from app.comun import ahora, auditar, id_de_ruta, json_cliente, json_usuario_tienda, paginar
from app.db import obtener_db
from app.errores import ErrorApi, datos_invalidos, no_encontrado
from app.esquemas import RegistroCliente, UsuarioCrear, UsuarioEstado
from app.seguridad import DUENO, hash_contrasena, hash_token, validar_contrasena

router = APIRouter(tags=["Acceso"])
log = logging.getLogger("tiendinet")


def _correo_libre(db: Session, correo: str) -> None:
    if db.scalar(select(m.Usuario.id).where(func.lower(m.Usuario.correo) == correo.lower())):
        raise ErrorApi(409, "CORREO_DUPLICADO", "El correo ya está registrado.")


@router.post("/clientes", status_code=201)
@router.post("/api/auth/register", status_code=201, include_in_schema=False)
def registrar_cliente(cuerpo: RegistroCliente, db: Session = Depends(obtener_db)):
    """Registro público: solo crea clientes. Las cuentas de la tienda las crea el Dueño.
    La respuesta nunca incluye la contraseña ni su hash."""
    if not cuerpo.avisoPrivacidadAceptado:
        raise datos_invalidos("avisoPrivacidadAceptado", "Debes aceptar el aviso de privacidad.")
    validar_contrasena(cuerpo.contrasena)
    _correo_libre(db, cuerpo.correo)
    usuario = m.Usuario(tipo="CLIENTE", nombre=cuerpo.nombre, correo=cuerpo.correo,
                        password_hash=hash_contrasena(cuerpo.contrasena), estado="ACTIVO")
    db.add(usuario)
    db.flush()
    cliente = m.Cliente(usuario_id=usuario.id, telefono=cuerpo.telefono, calle=cuerpo.direccion.calle,
                        codigo_postal=cuerpo.direccion.codigoPostal, aviso_privacidad_aceptado=True)
    db.add(cliente)
    db.flush()
    auditar(db, usuario.id, "registrar_cliente", "cliente", usuario.id, None,
            {"correo": usuario.correo, "nombre": usuario.nombre})
    db.commit()
    db.refresh(cliente)
    return json_cliente(cliente)


@router.get("/usuarios", dependencies=[Depends(DUENO)])
def listar_usuarios(pagina: int = Query(1, ge=1), tamano: int = Query(20, ge=1, le=100),
                    estado: str | None = Query(None, pattern="^(ACTIVO|INACTIVO)$"),
                    db: Session = Depends(obtener_db)):
    consulta = select(m.UsuarioTienda).join(m.Usuario).order_by(m.Usuario.nombre)
    if estado:
        consulta = consulta.where(m.Usuario.estado == estado)
    filas, total = paginar(db, consulta, pagina, tamano)
    return {"datos": [json_usuario_tienda(u) for u in filas], "pagina": pagina, "tamano": tamano, "total": total}


@router.post("/usuarios", status_code=201)
def crear_usuario(cuerpo: UsuarioCrear, db: Session = Depends(obtener_db),
                  actor: m.UsuarioTienda = Depends(DUENO)):
    _correo_libre(db, cuerpo.correo)
    usuario = m.Usuario(tipo="TIENDA", nombre=cuerpo.nombre, correo=cuerpo.correo,
                        password_hash=None, estado="INACTIVO")
    db.add(usuario)
    db.flush()
    tienda = m.UsuarioTienda(usuario_id=usuario.id, rol=cuerpo.rol, activacion_enviada=True)
    db.add(tienda)
    # Enlace de activación de un solo uso. Se guarda solo el hash; el envío de
    # correo (ServicioCorreo) se conecta con la seguridad en la siguiente actividad.
    token = secrets.token_urlsafe(32)
    db.add(m.TokenCuenta(usuario_id=usuario.id, proposito="ACTIVACION", token_hash=hash_token(token),
                         expira_en=ahora() + timedelta(hours=24)))
    if config.MOSTRAR_ENLACES_EN_CONSOLA:
        log.warning("Activación de %s (solo desarrollo): POST /usuarios/activacion con token=%s",
                    cuerpo.correo, token)
    auditar(db, actor.usuario_id, "crear_usuario", "usuario_tienda", usuario.id, None,
            {"correo": usuario.correo, "rol": cuerpo.rol})
    db.commit()
    db.refresh(tienda)
    return json_usuario_tienda(tienda)


@router.get("/usuarios/{usuario_id}", dependencies=[Depends(DUENO)])
def consultar_usuario(usuario_id: str, db: Session = Depends(obtener_db)):
    usuario = db.get(m.UsuarioTienda, id_de_ruta(usuario_id))
    if usuario is None:
        raise no_encontrado()
    return json_usuario_tienda(usuario)


@router.patch("/usuarios/{usuario_id}")
def actualizar_estado_usuario(usuario_id: str, cuerpo: UsuarioEstado, db: Session = Depends(obtener_db),
                              actor: m.UsuarioTienda = Depends(DUENO)):
    tienda = db.get(m.UsuarioTienda, id_de_ruta(usuario_id))
    if tienda is None:
        raise no_encontrado()
    anterior = tienda.usuario.estado
    if cuerpo.estado == "INACTIVO" and tienda.rol == "DUENO" and anterior == "ACTIVO":
        # Se bloquean los Dueños activos para que dos bajas simultáneas no dejen la tienda sin Dueño.
        duenos = db.scalars(select(m.Usuario.id).join(m.UsuarioTienda)
                            .where(m.UsuarioTienda.rol == "DUENO", m.Usuario.estado == "ACTIVO")
                            .with_for_update()).all()
        if len(duenos) <= 1:
            raise ErrorApi(409, "ULTIMO_DUENO", "No se puede desactivar al último Dueño activo.")
    if cuerpo.estado == "ACTIVO" and tienda.usuario.password_hash is None:
        raise ErrorApi(409, "CUENTA_SIN_ACTIVAR",
                       "La cuenta aún no define contraseña. Debe completar el correo de activación.")
    tienda.usuario.estado = cuerpo.estado
    auditar(db, actor.usuario_id, "cambiar_estado_usuario", "usuario_tienda", tienda.usuario_id,
            {"estado": anterior}, {"estado": cuerpo.estado})
    db.commit()
    return json_usuario_tienda(tienda)
