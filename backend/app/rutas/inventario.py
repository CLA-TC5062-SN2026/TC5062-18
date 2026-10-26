"""Recepciones: entrada de mercancía que crea un lote (RF-05)."""
import uuid

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import modelos as m
from app.comun import (a_decimal, actor_tienda, auditar, clave_idempotencia, existencia, guardar_respuesta,
                       id_de_ruta, json_recepcion, paginar, repetir_si_existe)
from app.db import obtener_db
from app.errores import datos_invalidos, no_encontrado
from app.esquemas import RecepcionCrear

router = APIRouter(tags=["Productos e inventario"])


def _resolver_alerta_reorden(db: Session, producto: m.Producto, disponible: int) -> None:
    """RF-09-AC-5: si la disponible supera el PR, la alerta activa pasa a resuelta."""
    if disponible <= producto.pr_vigente:
        return
    alerta = db.scalars(select(m.Alerta).where(m.Alerta.producto_id == producto.id, m.Alerta.tipo == "REORDEN",
                                               m.Alerta.estado == "ACTIVA")).first()
    if alerta:
        alerta.estado = "RESUELTA"
        alerta.existencia_disponible = disponible


@router.post("/recepciones", status_code=201)
def registrar_recepcion(cuerpo: RecepcionCrear, db: Session = Depends(obtener_db),
                        actor: m.UsuarioTienda = Depends(actor_tienda),
                        clave: uuid.UUID = Depends(clave_idempotencia)):
    entrada = cuerpo.model_dump(mode="json")
    repetida = repetir_si_existe(db, clave, "registrar_recepcion", entrada)
    if repetida:
        return JSONResponse(status_code=repetida[0], content=repetida[1],
                            headers={"Idempotency-Replayed": "true"})

    # Bloqueo de la fila del producto: dos recepciones simultáneas no pisan la existencia (RNF-06).
    producto = db.scalars(select(m.Producto).where(m.Producto.id == cuerpo.productoId).with_for_update()).first()
    if producto is None:
        raise no_encontrado("El producto no existe.")
    proveedor = db.get(m.Proveedor, cuerpo.proveedorId)
    if proveedor is None:
        raise no_encontrado("El proveedor no existe.")
    if producto.perecedero and cuerpo.fechaCaducidad is None:
        raise datos_invalidos("fechaCaducidad", "La fecha de caducidad es obligatoria en productos perecederos.")

    # RF-05-AC-3: el costo solo lo aplica el Dueño; si lo manda un Empleado, se ignora.
    costo_ignorado = cuerpo.costoUnitario is not None and actor.rol != "DUENO"
    costo = a_decimal(cuerpo.costoUnitario) if actor.rol == "DUENO" else None
    oferta = None
    if proveedor.tipo != "OTRO_RUTA":
        oferta = db.scalars(select(m.Oferta).where(m.Oferta.producto_id == producto.id,
                                                   m.Oferta.proveedor_id == proveedor.id)
                            .order_by(m.Oferta.fecha_actualizacion.desc())).first()
        if costo is None and oferta is not None:
            costo = oferta.costo

    fisica_antes, _, _ = existencia(db, producto.id)
    lote = m.Lote(producto_id=producto.id, cantidad=cuerpo.cantidad, fecha_caducidad=cuerpo.fechaCaducidad,
                  costo_unitario=costo, proveedor_id=proveedor.id, oferta_id=oferta.id if oferta else None)
    db.add(lote)
    db.flush()
    movimiento = m.MovimientoInventario(tipo="RECEPCION", producto_id=producto.id, lote_id=lote.id,
                                        cantidad=cuerpo.cantidad, cantidad_anterior=fisica_antes,
                                        cantidad_nueva=fisica_antes + cuerpo.cantidad,
                                        usuario_id=actor.usuario_id)
    db.add(movimiento)
    db.flush()
    fisica, _, disponible = existencia(db, producto.id)
    recepcion = m.Recepcion(producto_id=producto.id, proveedor_id=proveedor.id, lote_id=lote.id,
                            movimiento_id=movimiento.id, cantidad=cuerpo.cantidad, existencia_fisica=fisica,
                            existencia_disponible=disponible, costo_ignorado=costo_ignorado)
    db.add(recepcion)
    _resolver_alerta_reorden(db, producto, disponible)
    db.flush()
    db.refresh(lote)
    recepcion.lote = lote
    respuesta = json_recepcion(recepcion, con_costo=actor.rol == "DUENO")
    auditar(db, actor.usuario_id, "registrar_recepcion", "recepcion", recepcion.id, None,
            {"productoId": str(producto.id), "cantidad": cuerpo.cantidad, "loteId": str(lote.id)})
    guardar_respuesta(db, clave, "registrar_recepcion", entrada, actor.usuario_id, 201, respuesta)
    db.commit()
    return JSONResponse(status_code=201, content=respuesta)


@router.get("/recepciones")
def listar_recepciones(pagina: int = Query(1, ge=1), tamano: int = Query(20, ge=1, le=100),
                       productoId: uuid.UUID | None = None, db: Session = Depends(obtener_db),
                       actor: m.UsuarioTienda = Depends(actor_tienda)):
    consulta = (select(m.Recepcion).join(m.MovimientoInventario, m.Recepcion.movimiento_id == m.MovimientoInventario.id)
                .order_by(m.MovimientoInventario.fecha_hora.desc()))
    if productoId:
        consulta = consulta.where(m.Recepcion.producto_id == productoId)
    filas, total = paginar(db, consulta, pagina, tamano)
    con_costo = actor.rol == "DUENO"
    return {"datos": [json_recepcion(r, con_costo) for r in filas], "pagina": pagina, "tamano": tamano,
            "total": total}


@router.get("/recepciones/{recepcion_id}")
def consultar_recepcion(recepcion_id: str, db: Session = Depends(obtener_db),
                        actor: m.UsuarioTienda = Depends(actor_tienda)):
    recepcion = db.get(m.Recepcion, id_de_ruta(recepcion_id))
    if recepcion is None:
        raise no_encontrado()
    return json_recepcion(recepcion, con_costo=actor.rol == "DUENO")
