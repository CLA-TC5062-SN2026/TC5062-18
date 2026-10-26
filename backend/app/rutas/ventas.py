"""Punto de venta: borrador, renglones y confirmación con FEFO (RF-16, RF-17)."""
import uuid
from collections import defaultdict
from datetime import datetime, time, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy import or_, select, text
from sqlalchemy.orm import Session

from app import modelos as m
from app.comun import (TZ_MX, a_decimal, ahora, auditar, clave_idempotencia, dinero,
                       existencias, guardar_respuesta, hoy_mx, id_de_ruta, json_venta, paginar,
                       repetir_si_existe)
from app.db import obtener_db
from app.seguridad import TIENDA
from app.errores import ErrorApi, datos_invalidos, no_encontrado
from app.esquemas import ConfirmarVenta, RenglonCantidad, RenglonVentaCrear

router = APIRouter(tags=["Punto de venta"])


def _venta(db: Session, venta_id: str, bloquear: bool = False) -> m.Venta:
    consulta = select(m.Venta).where(m.Venta.id == id_de_ruta(venta_id))
    if bloquear:
        consulta = consulta.with_for_update(of=m.Venta)
    venta = db.scalars(consulta).unique().first()
    if venta is None:
        raise no_encontrado()
    return venta


def _en_curso(venta: m.Venta) -> None:
    if venta.estado != "BORRADOR":
        raise ErrorApi(409, "VENTA_NO_EN_CURSO", "La venta ya no está en curso.")


def _recalcular(venta: m.Venta) -> None:
    venta.total = sum((r.subtotal for r in venta.renglones), Decimal("0.00"))


def _renglon(venta: m.Venta, renglon_id: str) -> m.RenglonVenta:
    rid = id_de_ruta(renglon_id)
    for renglon in venta.renglones:
        if renglon.id == rid:
            return renglon
    raise no_encontrado("El renglón no existe en esta venta.")


@router.post("/ventas", status_code=201)
def crear_venta(db: Session = Depends(obtener_db), actor: m.UsuarioTienda = Depends(TIENDA)):
    """Borrador sin folio y sin tocar existencias. El total empieza en 0.00."""
    venta = m.Venta(estado="BORRADOR", diferida=False, total=Decimal("0.00"),
                    usuario_responsable_id=actor.usuario_id)
    db.add(venta)
    db.commit()
    return json_venta(_venta(db, str(venta.id)))


@router.get("/ventas", dependencies=[Depends(TIENDA)])
def listar_ventas(pagina: int = Query(1, ge=1), tamano: int = Query(20, ge=1, le=100),
                  estado: str | None = Query(None, pattern="^(BORRADOR|COMPLETADA|CANCELADA)$"),
                  fecha: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
                  folio: str | None = None, db: Session = Depends(obtener_db)):
    consulta = select(m.Venta).order_by(m.Venta.fecha_hora.desc().nulls_last(), m.Venta.id.desc())
    if estado:
        consulta = consulta.where(m.Venta.estado == estado)
    else:
        consulta = consulta.where(m.Venta.estado != "BORRADOR")  # por defecto sin borradores
    if folio:
        consulta = consulta.where(m.Venta.folio == folio)
    if fecha:
        dia = datetime.fromisoformat(fecha).date()
        inicio = datetime.combine(dia, time.min, TZ_MX)
        fin = datetime.combine(dia, time.max, TZ_MX)
        consulta = consulta.where(m.Venta.fecha_hora.between(inicio, fin))
    filas, total = paginar(db, consulta, pagina, tamano)
    return {"datos": [json_venta(v) for v in filas], "pagina": pagina, "tamano": tamano, "total": total}


@router.get("/ventas/{venta_id}", dependencies=[Depends(TIENDA)])
def consultar_venta(venta_id: str, db: Session = Depends(obtener_db)):
    return json_venta(_venta(db, venta_id))


@router.post("/ventas/{venta_id}/renglones", status_code=201, dependencies=[Depends(TIENDA)])
def agregar_renglon(venta_id: str, cuerpo: RenglonVentaCrear, db: Session = Depends(obtener_db)):
    venta = _venta(db, venta_id, bloquear=True)
    _en_curso(venta)
    producto = db.get(m.Producto, cuerpo.productoId)
    if producto is None or producto.estado != "ACTIVO":
        raise no_encontrado("El producto no existe o está inactivo.")
    precio = producto.precio_venta  # se guarda el precio del momento (RF-17-AC-2)
    venta.renglones.append(m.RenglonVenta(producto_id=producto.id, cantidad=cuerpo.cantidad,
                                          precio_unitario=precio, subtotal=precio * cuerpo.cantidad))
    _recalcular(venta)
    db.commit()
    return json_venta(_venta(db, venta_id))


@router.patch("/ventas/{venta_id}/renglones/{renglon_id}", dependencies=[Depends(TIENDA)])
def cambiar_renglon(venta_id: str, renglon_id: str, cuerpo: RenglonCantidad, db: Session = Depends(obtener_db)):
    venta = _venta(db, venta_id, bloquear=True)
    renglon = _renglon(venta, renglon_id)
    _en_curso(venta)
    renglon.cantidad = cuerpo.cantidad
    renglon.subtotal = renglon.precio_unitario * cuerpo.cantidad
    _recalcular(venta)
    db.commit()
    return json_venta(_venta(db, venta_id))


@router.delete("/ventas/{venta_id}/renglones/{renglon_id}", dependencies=[Depends(TIENDA)])
def quitar_renglon(venta_id: str, renglon_id: str, db: Session = Depends(obtener_db)):
    venta = _venta(db, venta_id, bloquear=True)
    renglon = _renglon(venta, renglon_id)
    _en_curso(venta)
    venta.renglones.remove(renglon)
    _recalcular(venta)
    db.commit()
    return json_venta(_venta(db, venta_id))


def _actualizar_alerta_reorden(db: Session, producto: m.Producto, disponible: int) -> str | None:
    """RF-09: si la disponible queda en o bajo el PR, una sola alerta activa por producto."""
    if disponible > producto.pr_vigente:
        return None
    sugerida = max(producto.pr_vigente * 2 - disponible, 1)
    alerta = db.scalars(select(m.Alerta).where(m.Alerta.producto_id == producto.id, m.Alerta.tipo == "REORDEN",
                                               m.Alerta.estado == "ACTIVA").with_for_update()).first()
    if alerta is None:
        alerta = m.Alerta(tipo="REORDEN", estado="ACTIVA", producto_id=producto.id)
        db.add(alerta)
    alerta.existencia_disponible = disponible
    alerta.punto_reorden = producto.pr_vigente
    alerta.cantidad_sugerida = sugerida
    alerta.proveedor_sugerido_id = producto.proveedor_preferido_id
    alerta.fecha = ahora()
    db.flush()
    return str(alerta.id)


@router.post("/ventas/{venta_id}/confirmaciones")
def confirmar_venta(venta_id: str, cuerpo: ConfirmarVenta, db: Session = Depends(obtener_db),
                    actor: m.UsuarioTienda = Depends(TIENDA),
                    clave: uuid.UUID = Depends(clave_idempotencia)):
    """Una sola transacción: valida el pago, bloquea cada producto, descuenta
    con FEFO, guarda de qué lote salió cada unidad, asigna folio y audita."""
    entrada = {"ventaId": venta_id, **cuerpo.model_dump(mode="json")}
    repetida = repetir_si_existe(db, clave, "confirmar_venta", entrada)
    if repetida:
        return JSONResponse(status_code=repetida[0], content=repetida[1],
                            headers={"Idempotency-Replayed": "true"})

    venta = _venta(db, venta_id, bloquear=True)
    _en_curso(venta)
    if not venta.renglones:
        raise ErrorApi(422, "VENTA_SIN_RENGLONES", "La venta no tiene renglones.", extra={"faltante": "0.00"})

    recibido = a_decimal(cuerpo.montoRecibido)
    if cuerpo.formaPago == "EFECTIVO":
        if recibido is None:
            raise datos_invalidos("montoRecibido", "El monto recibido es obligatorio en efectivo.")
        if recibido < venta.total:
            raise ErrorApi(422, "PAGO_INSUFICIENTE", f"Faltan {dinero(venta.total - recibido)} para cubrir el total.",
                           extra={"faltante": dinero(venta.total - recibido)})
    else:
        recibido = None  # con tarjeta no hay monto recibido ni cambio (RF-16-AC-4)

    # Bloqueo por fila en orden de id: dos cobros por la última unidad no se
    # esperan en círculo, y solo uno gana (RNF-06).
    pedidos = defaultdict(int)
    for r in venta.renglones:
        pedidos[r.producto_id] += r.cantidad
    ids = sorted(pedidos)
    productos = {p.id: p for p in db.scalars(select(m.Producto).where(m.Producto.id.in_(ids))
                                             .order_by(m.Producto.id).with_for_update())}
    exist = existencias(db, ids)
    for pid in ids:
        disponible = exist.get(pid, (0, 0, 0))[2]
        if pedidos[pid] > disponible:
            producto = productos[pid]
            raise ErrorApi(409, "EXISTENCIA_INSUFICIENTE",
                           "Producto agotado" if disponible == 0 else "Existencia insuficiente",
                           extra={"productoId": str(pid), "nombreProducto": producto.nombre,
                                  "cantidadSolicitada": pedidos[pid], "disponible": disponible})

    hoy = hoy_mx()
    for renglon in venta.renglones:
        pendiente = renglon.cantidad
        lotes = db.scalars(
            select(m.Lote).where(m.Lote.producto_id == renglon.producto_id, m.Lote.cantidad > 0,
                                 or_(m.Lote.fecha_caducidad.is_(None), m.Lote.fecha_caducidad >= hoy))
            .order_by(m.Lote.fecha_caducidad.asc().nulls_last(), m.Lote.recibido_en, m.Lote.id)
            .with_for_update()).all()
        for lote in lotes:  # FEFO; un lote que caduca hoy sí se vende (RF-07-AC-4)
            if pendiente == 0:
                break
            toma = min(pendiente, lote.cantidad)
            antes = lote.cantidad
            lote.cantidad -= toma
            pendiente -= toma
            db.add(m.SalidaLote(renglon_venta_id=renglon.id, lote_id=lote.id, cantidad=toma))
            db.add(m.MovimientoInventario(tipo="VENTA", producto_id=renglon.producto_id, lote_id=lote.id,
                                          cantidad=toma, cantidad_anterior=antes, cantidad_nueva=lote.cantidad,
                                          usuario_id=actor.usuario_id))
        if pendiente:
            # La disponible ya descuenta apartados y caducados; si aun así faltan
            # unidades en lotes, se rechaza todo sin tocar existencias.
            db.rollback()
            raise ErrorApi(409, "EXISTENCIA_INSUFICIENTE", "Existencia insuficiente",
                           extra={"productoId": str(renglon.producto_id), "cantidadSolicitada": renglon.cantidad,
                                  "disponible": renglon.cantidad - pendiente})

    folio_num = db.scalar(text("SELECT nextval('seq_folio_venta')"))
    venta.folio = f"VTA-{folio_num:06d}"
    venta.estado = "COMPLETADA"
    venta.forma_pago = cuerpo.formaPago
    venta.monto_recibido = recibido
    venta.cambio = (recibido - venta.total) if recibido is not None else None
    venta.usuario_responsable_id = actor.usuario_id
    venta.fecha_hora = datetime.now(timezone.utc)
    db.flush()

    alertas = []
    despues = existencias(db, ids)
    for pid in ids:
        alerta = _actualizar_alerta_reorden(db, productos[pid], despues.get(pid, (0, 0, 0))[2])
        if alerta:
            alertas.append(alerta)

    auditar(db, actor.usuario_id, "confirmar_venta", "venta", venta.id, {"estado": "BORRADOR"},
            {"estado": "COMPLETADA", "folio": venta.folio, "total": dinero(venta.total),
             "formaPago": cuerpo.formaPago})
    db.flush()
    db.refresh(venta)
    respuesta = json_venta(venta, alertas)
    guardar_respuesta(db, clave, "confirmar_venta", entrada, actor.usuario_id, 200, respuesta)
    db.commit()
    return JSONResponse(status_code=200, content=respuesta)
