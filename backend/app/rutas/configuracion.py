"""Configuración de la tienda y códigos postales de entrega (RF-28)."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import modelos as m
from app.comun import a_decimal, a_hora, auditar, json_configuracion
from app.db import obtener_db
from app.seguridad import DUENO
from app.errores import ErrorApi, datos_invalidos, no_encontrado
from app.esquemas import CodigoPostalCrear, CodigoPostalEstado, ConfiguracionActualizar

router = APIRouter(tags=["Configuración"])

COLUMNAS = {
    "diasSeguridad": ("dias_seguridad", int), "pedidoMinimoEnvio": ("pedido_minimo_envio", a_decimal),
    "costoEnvio": ("costo_envio", a_decimal), "horarioInicio": ("horario_inicio", a_hora),
    "horarioFin": ("horario_fin", a_hora), "horaLimiteMismoDia": ("hora_limite_mismo_dia", a_hora),
    "diasAvisoCaducidad": ("dias_aviso_caducidad", int),
    "plazoRespuestaFaltanteMin": ("plazo_respuesta_faltante_min", int),
}


def _configuracion(db: Session, bloquear: bool = False) -> m.ConfiguracionTienda:
    consulta = select(m.ConfiguracionTienda).where(m.ConfiguracionTienda.id == 1)
    if bloquear:
        consulta = consulta.with_for_update()
    config = db.scalars(consulta).first()
    if config is None:
        raise ErrorApi(500, "ERROR_INTERNO", "Falta la fila de configuración. Carga esquema_bd.sql.")
    return config


def _json_codigo(c: m.CodigoPostalEntrega) -> dict:
    return {"codigo": c.codigo, "activo": c.activo}


@router.get("/configuracion", dependencies=[Depends(DUENO)])
def consultar_configuracion(db: Session = Depends(obtener_db)):
    return json_configuracion(db, _configuracion(db))


@router.patch("/configuracion")
def actualizar_configuracion(cuerpo: ConfiguracionActualizar, db: Session = Depends(obtener_db),
                             actor: m.UsuarioTienda = Depends(DUENO)):
    """Solo cambia lo que se envía. El costo de envío nuevo aplica a pedidos creados después."""
    config = _configuracion(db, bloquear=True)
    anterior, nuevo = {}, {}
    for campo in cuerpo.model_fields_set:
        valor = getattr(cuerpo, campo)
        if valor is None:
            raise datos_invalidos(campo, "No puede ser nulo.")
        columna, convertir = COLUMNAS[campo]
        anterior[campo] = str(getattr(config, columna))
        setattr(config, columna, convertir(valor))
        nuevo[campo] = valor
    if not (config.horario_inicio < config.horario_fin):
        raise datos_invalidos("horarioFin", "El horario de fin debe ser posterior al de inicio.")
    if not (config.horario_inicio <= config.hora_limite_mismo_dia <= config.horario_fin):
        raise datos_invalidos("horaLimiteMismoDia", "La hora límite del mismo día debe estar dentro del horario.")
    auditar(db, actor.usuario_id, "actualizar_configuracion", "configuracion_tienda", 1, anterior, nuevo)
    db.commit()
    return json_configuracion(db, config)


@router.get("/configuracion/codigos-postales", dependencies=[Depends(DUENO)])
def listar_codigos(db: Session = Depends(obtener_db)):
    filas = db.scalars(select(m.CodigoPostalEntrega).order_by(m.CodigoPostalEntrega.codigo)).all()
    return {"datos": [_json_codigo(c) for c in filas]}


@router.post("/configuracion/codigos-postales", status_code=201)
def agregar_codigo(cuerpo: CodigoPostalCrear, db: Session = Depends(obtener_db),
                   actor: m.UsuarioTienda = Depends(DUENO)):
    if db.get(m.CodigoPostalEntrega, cuerpo.codigo):
        raise ErrorApi(409, "CODIGO_POSTAL_DUPLICADO",
                       "El código postal ya existe. Para reactivarlo usa PATCH sobre ese código.")
    codigo = m.CodigoPostalEntrega(codigo=cuerpo.codigo, configuracion_id=1, activo=True)
    db.add(codigo)
    auditar(db, actor.usuario_id, "agregar_codigo_postal", "codigo_postal_entrega", cuerpo.codigo, None,
            {"activo": True})
    db.commit()
    return _json_codigo(codigo)


@router.get("/configuracion/codigos-postales/{codigo}", dependencies=[Depends(DUENO)])
def consultar_codigo(codigo: str, db: Session = Depends(obtener_db)):
    fila = db.get(m.CodigoPostalEntrega, codigo) if codigo.isdigit() and len(codigo) == 5 else None
    if fila is None:
        raise no_encontrado()
    return _json_codigo(fila)


@router.patch("/configuracion/codigos-postales/{codigo}")
def cambiar_codigo(codigo: str, cuerpo: CodigoPostalEstado, db: Session = Depends(obtener_db),
                   actor: m.UsuarioTienda = Depends(DUENO)):
    """Desactivar no borra el registro; los pedidos ya creados conservan su dirección."""
    fila = db.get(m.CodigoPostalEntrega, codigo) if codigo.isdigit() and len(codigo) == 5 else None
    if fila is None:
        raise no_encontrado()
    anterior = fila.activo
    fila.activo = cuerpo.activo
    auditar(db, actor.usuario_id, "cambiar_codigo_postal", "codigo_postal_entrega", codigo,
            {"activo": anterior}, {"activo": cuerpo.activo})
    db.commit()
    return _json_codigo(fila)
