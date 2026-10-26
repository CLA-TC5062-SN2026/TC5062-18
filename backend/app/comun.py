"""Utilidades compartidas: formatos, actor, existencias, auditoría,
idempotencia y la traducción de filas a los schemas del contrato."""
import hashlib
import json
import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from fastapi import Depends, Header
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import modelos as m
from app.db import obtener_db
from app.errores import ErrorApi, no_encontrado

TZ_MX = ZoneInfo("America/Mexico_City")
CENTAVO = Decimal("0.01")


# ----------------------------------------------------------------- formatos
def dinero(valor) -> str | None:
    if valor is None:
        return None
    return f"{Decimal(valor).quantize(CENTAVO, ROUND_HALF_UP):.2f}"


def a_decimal(valor: str | None) -> Decimal | None:
    return None if valor is None else Decimal(valor)


def fecha_hora(valor: datetime | None) -> str | None:
    if valor is None:
        return None
    return valor.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def hora(valor: time) -> str:
    return valor.strftime("%H:%M")


def a_hora(valor: str) -> time:
    h, mi = valor.split(":")
    return time(int(h), int(mi))


def ahora() -> datetime:
    return datetime.now(timezone.utc)


def hoy_mx() -> date:
    return datetime.now(TZ_MX).date()


def id_de_ruta(valor: str) -> uuid.UUID:
    """Un id mal formado en la ruta es un recurso que no existe: 404."""
    try:
        return uuid.UUID(str(valor))
    except ValueError:
        raise no_encontrado() from None


def sin_nulos(cuerpo: dict, *campos: str) -> dict:
    """Quita llaves con None cuando el schema no las declara nullable."""
    for campo in campos:
        if cuerpo.get(campo) is None:
            cuerpo.pop(campo, None)
    return cuerpo


def paginar(db: Session, consulta, pagina: int, tamano: int):
    total = db.scalar(select(func.count()).select_from(consulta.order_by(None).subquery()))
    filas = db.scalars(consulta.limit(tamano).offset((pagina - 1) * tamano)).unique().all()
    return filas, total


# -------------------------------------------------------------------- actor
# La seguridad (JWT y roles) se agrega en la siguiente actividad. Mientras,
# el encabezado opcional X-Usuario-Id dice quién hace la operación; sin él se
# usa el primer Dueño activo o el primer cliente, según el endpoint.
def actor_tienda(db: Session = Depends(obtener_db),
                 x_usuario_id: str | None = Header(None, alias="X-Usuario-Id")) -> m.UsuarioTienda:
    if x_usuario_id:
        usuario = db.get(m.UsuarioTienda, id_de_ruta(x_usuario_id))
        if usuario is None:
            raise ErrorApi(403, "PROHIBIDO", "X-Usuario-Id no corresponde a un usuario de la tienda.")
        return usuario
    usuario = db.scalars(
        select(m.UsuarioTienda).join(m.Usuario)
        .where(m.UsuarioTienda.rol == "DUENO", m.Usuario.estado == "ACTIVO")
        .order_by(m.Usuario.correo)).first()
    if usuario is None:
        raise ErrorApi(500, "ERROR_INTERNO", "No hay un Dueño activo. Carga datos_prueba.sql.")
    return usuario


def actor_cliente(db: Session = Depends(obtener_db),
                  x_usuario_id: str | None = Header(None, alias="X-Usuario-Id")) -> m.Cliente:
    if x_usuario_id:
        cliente = db.get(m.Cliente, id_de_ruta(x_usuario_id))
        if cliente is None:
            raise ErrorApi(403, "PROHIBIDO", "X-Usuario-Id no corresponde a un cliente.")
        return cliente
    cliente = db.scalars(select(m.Cliente).join(m.Usuario).order_by(m.Usuario.correo)).first()
    if cliente is None:
        raise ErrorApi(500, "ERROR_INTERNO", "No hay clientes. Carga datos_prueba.sql.")
    return cliente


# --------------------------------------------------------------- existencias
def existencias(db: Session, ids: list[uuid.UUID]) -> dict[uuid.UUID, tuple[int, int, int]]:
    """(física, apartado, disponible) desde la vista v_existencia_producto."""
    if not ids:
        return {}
    filas = db.execute(text(
        "SELECT producto_id, existencia_fisica, apartado, existencia_disponible "
        "FROM v_existencia_producto WHERE producto_id = ANY(:ids)"), {"ids": list(ids)}).all()
    return {f[0]: (int(f[1]), int(f[2]), int(f[3])) for f in filas}


def existencia(db: Session, producto_id: uuid.UUID) -> tuple[int, int, int]:
    return existencias(db, [producto_id]).get(producto_id, (0, 0, 0))


# ----------------------------------------------------------------- auditoría
def auditar(db: Session, usuario_id, operacion: str, entidad: str, entidad_id,
            anterior: dict | None = None, nuevo: dict | None = None, resultado: str = "EXITO") -> None:
    """RNF-07: se escribe en la misma transacción que la operación."""
    db.add(m.RegistroAuditoria(usuario_id=usuario_id, operacion=operacion, entidad=entidad,
                               entidad_id=str(entidad_id), valor_anterior=anterior,
                               valor_nuevo=nuevo, resultado=resultado))


# -------------------------------------------------------------- idempotencia
def _hash(cuerpo: dict) -> str:
    return hashlib.sha256(json.dumps(cuerpo, sort_keys=True, default=str).encode()).hexdigest()


def repetir_si_existe(db: Session, clave: uuid.UUID, operacion: str, cuerpo: dict):
    """Si la clave ya se usó, devuelve (código, cuerpo) guardados o lanza 409.
    Si no existe (o ya expiró), devuelve None y la operación sigue."""
    previo = db.get(m.RegistroIdempotencia, clave)
    if previo is None:
        return None
    if previo.expira_en <= ahora():
        db.delete(previo)
        db.flush()
        return None
    if previo.operacion != operacion or previo.hash_cuerpo != _hash(cuerpo):
        raise ErrorApi(409, "IDEMPOTENCIA_CONFLICTO",
                       "La clave de idempotencia ya se usó con otra operación")
    if previo.estado != "COMPLETADA":
        raise ErrorApi(409, "IDEMPOTENCIA_EN_PROCESO",
                       "La operación anterior con esta clave sigue en proceso. Intenta en unos segundos.")
    return previo.codigo_respuesta, previo.cuerpo_respuesta


def guardar_respuesta(db: Session, clave: uuid.UUID, operacion: str, cuerpo: dict,
                      usuario_id, codigo: int, respuesta: dict) -> None:
    """Se guarda en la misma transacción: si la operación falla, no queda clave."""
    db.add(m.RegistroIdempotencia(
        clave=clave, usuario_id=usuario_id, operacion=operacion, hash_cuerpo=_hash(cuerpo),
        estado="COMPLETADA", codigo_respuesta=codigo, cuerpo_respuesta=respuesta,
        expira_en=ahora() + timedelta(hours=24)))
    try:
        db.flush()
    except IntegrityError:
        # Otra petición con la misma clave ganó la carrera.
        db.rollback()
        raise ErrorApi(409, "IDEMPOTENCIA_EN_PROCESO",
                       "La operación anterior con esta clave sigue en proceso. Intenta en unos segundos.") from None


def clave_idempotencia(idempotency_key: uuid.UUID = Header(..., alias="Idempotency-Key")) -> uuid.UUID:
    return idempotency_key


# ------------------------------------------------- filas -> schemas del API
def json_producto(p: m.Producto, exist: tuple[int, int, int]) -> dict:
    fisica, apartado, disponible = exist
    return {
        "id": str(p.id), "codigoInterno": p.codigo_interno, "codigoBarras": p.codigo_barras,
        "nombre": p.nombre, "presentacion": p.presentacion, "categoria": p.categoria,
        "precioVenta": dinero(p.precio_venta), "costoReferencia": dinero(p.costo_referencia),
        "prInicial": p.pr_inicial, "prVigente": p.pr_vigente, "origenPR": p.origen_pr,
        "prManual": p.pr_manual,
        "vigenciaPRManual": p.vigencia_pr_manual.isoformat() if p.vigencia_pr_manual else None,
        "diasEntregaRespaldo": p.dias_entrega_respaldo,
        "proveedorPreferidoId": str(p.proveedor_preferido_id) if p.proveedor_preferido_id else None,
        "perecedero": p.perecedero, "restringido": p.restringido, "estado": p.estado,
        "marcaDescuadre": p.marca_descuadre,
        "existenciaFisica": fisica, "apartado": apartado, "existenciaDisponible": disponible,
    }


def json_producto_inventario(p: m.Producto, exist: tuple[int, int, int]) -> dict:
    fisica, apartado, disponible = exist
    return {"id": str(p.id), "nombre": p.nombre, "presentacion": p.presentacion, "categoria": p.categoria,
            "perecedero": p.perecedero, "estado": p.estado, "existenciaFisica": fisica,
            "apartado": apartado, "existenciaDisponible": disponible, "marcaDescuadre": p.marca_descuadre}


def json_lote(lote: m.Lote, con_costo: bool = True) -> dict:
    cuerpo = {
        "id": str(lote.id), "productoId": str(lote.producto_id), "cantidad": lote.cantidad,
        "fechaCaducidad": lote.fecha_caducidad.isoformat() if lote.fecha_caducidad else None,
        "costoUnitario": dinero(lote.costo_unitario) if con_costo else None,
        "proveedorId": str(lote.proveedor_id) if lote.proveedor_id else None,
        "ofertaId": str(lote.oferta_id) if lote.oferta_id else None,
        "recibidoEn": fecha_hora(lote.recibido_en),
        # Un lote que caduca hoy todavía se vende (RF-07-AC-4).
        "caducado": bool(lote.fecha_caducidad and lote.fecha_caducidad < hoy_mx()),
    }
    return cuerpo


def json_usuario_tienda(u: m.UsuarioTienda) -> dict:
    return {"id": str(u.usuario_id), "nombre": u.usuario.nombre, "correo": u.usuario.correo,
            "rol": u.rol, "estado": u.usuario.estado, "activacionEnviada": u.activacion_enviada}


def json_cliente(c: m.Cliente) -> dict:
    return {"id": str(c.usuario_id), "nombre": c.usuario.nombre, "correo": c.usuario.correo,
            "telefono": c.telefono, "rol": "CLIENTE", "estado": c.usuario.estado,
            "direccion": {"calle": c.calle, "codigoPostal": c.codigo_postal}}


def json_proveedor(p: m.Proveedor) -> dict:
    return {"id": str(p.id), "nombre": p.nombre, "tipo": p.tipo, "activo": p.activo}


def json_recepcion(r: m.Recepcion, con_costo: bool = True) -> dict:
    return {"id": str(r.id), "productoId": str(r.producto_id), "proveedorId": str(r.proveedor_id),
            "cantidad": r.cantidad, "existenciaFisica": r.existencia_fisica,
            "existenciaDisponible": r.existencia_disponible, "costoIgnorado": r.costo_ignorado,
            "movimientoId": str(r.movimiento_id), "lote": json_lote(r.lote, con_costo)}


def json_venta(v: m.Venta, alertas: list[str] | None = None) -> dict:
    cuerpo = {
        "id": str(v.id), "folio": v.folio, "estado": v.estado, "diferida": v.diferida,
        "formaPago": v.forma_pago, "total": dinero(v.total),
        "montoRecibido": dinero(v.monto_recibido), "cambio": dinero(v.cambio),
        "usuarioResponsableId": str(v.usuario_responsable_id),
        "usuarioResponsableNombre": v.responsable.usuario.nombre,
        "fechaHora": fecha_hora(v.fecha_hora),
        "corteId": str(v.corte_id) if v.corte_id else None,
        "renglones": [{"id": str(r.id), "productoId": str(r.producto_id), "nombre": r.producto.nombre,
                       "cantidad": r.cantidad, "precioUnitario": dinero(r.precio_unitario),
                       "subtotal": dinero(r.subtotal)} for r in v.renglones],
        "cancelacion": None, "descuadres": [], "alertasGeneradas": alertas or [],
    }
    # fechaHora no es nullable en el schema, y formaPago y cancelacion usan
    # nullable + allOf, que en OpenAPI 3.0 no admite null. Ninguno es
    # obligatorio, así que se omiten cuando no tienen valor.
    return sin_nulos(cuerpo, "fechaHora", "formaPago", "cancelacion")


def json_carrito(c: m.Carrito | None) -> dict:
    renglones, subtotal = [], Decimal("0")
    for r in (c.renglones if c else []):
        precio = r.producto.precio_venta  # precio vigente; el pedido lo congela al crearse
        importe = precio * r.cantidad
        subtotal += importe
        renglones.append({"id": str(r.id), "productoId": str(r.producto_id), "nombre": r.producto.nombre,
                          "presentacion": r.producto.presentacion, "cantidad": r.cantidad,
                          "precioUnitario": dinero(precio), "subtotal": dinero(importe)})
    return {"renglones": renglones, "subtotal": dinero(subtotal)}


def json_configuracion(db: Session, c: m.ConfiguracionTienda) -> dict:
    codigos = db.scalars(select(m.CodigoPostalEntrega.codigo)
                         .where(m.CodigoPostalEntrega.activo).order_by(m.CodigoPostalEntrega.codigo)).all()
    return {"diasSeguridad": c.dias_seguridad, "pedidoMinimoEnvio": dinero(c.pedido_minimo_envio),
            "costoEnvio": dinero(c.costo_envio), "horarioInicio": hora(c.horario_inicio),
            "horarioFin": hora(c.horario_fin), "horaLimiteMismoDia": hora(c.hora_limite_mismo_dia),
            "diasAvisoCaducidad": c.dias_aviso_caducidad,
            "plazoRespuestaFaltanteMin": c.plazo_respuesta_faltante_min,
            "codigosPostalesEntrega": list(codigos)}
