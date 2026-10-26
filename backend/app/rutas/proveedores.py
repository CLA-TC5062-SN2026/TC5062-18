"""Proveedores sin base de datos (RF-11) y consulta de todos."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import modelos as m
from app.comun import actor_tienda, auditar, id_de_ruta, json_proveedor
from app.db import obtener_db
from app.errores import ErrorApi, no_encontrado
from app.esquemas import ProveedorCrear

router = APIRouter(tags=["Proveedores"])


@router.get("/proveedores")
def listar_proveedores(db: Session = Depends(obtener_db)):
    filas = db.scalars(select(m.Proveedor).order_by(m.Proveedor.tipo, m.Proveedor.nombre)).all()
    return {"datos": [json_proveedor(p) for p in filas]}


@router.post("/proveedores", status_code=201)
def crear_proveedor(cuerpo: ProveedorCrear, db: Session = Depends(obtener_db),
                    actor: m.UsuarioTienda = Depends(actor_tienda)):
    repetido = db.scalar(select(m.Proveedor.id).where(
        m.Proveedor.activo, func.f_normaliza(m.Proveedor.nombre) == func.f_normaliza(cuerpo.nombre)))
    if repetido:
        raise ErrorApi(409, "PROVEEDOR_DUPLICADO", "Ya existe un proveedor activo con ese nombre.")
    proveedor = m.Proveedor(nombre=cuerpo.nombre, tipo=cuerpo.tipo, activo=True)
    db.add(proveedor)
    db.flush()
    auditar(db, actor.usuario_id, "crear_proveedor", "proveedor", proveedor.id, None,
            {"nombre": proveedor.nombre, "tipo": proveedor.tipo})
    db.commit()
    return json_proveedor(proveedor)


@router.get("/proveedores/{proveedor_id}")
def consultar_proveedor(proveedor_id: str, db: Session = Depends(obtener_db)):
    proveedor = db.get(m.Proveedor, id_de_ruta(proveedor_id))
    if proveedor is None:
        raise no_encontrado()
    return json_proveedor(proveedor)
