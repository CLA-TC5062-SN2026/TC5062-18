"""Catálogo interno: ficha del producto, costo, lotes y búsquedas (RF-04, RF-07, RF-15)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import modelos as m
from app.comun import (a_decimal, auditar, dinero, existencia, existencias, id_de_ruta,
                       json_lote, json_producto, json_producto_inventario, paginar)
from app.db import obtener_db
from app.seguridad import DUENO, TIENDA
from app.errores import ErrorApi, no_encontrado
from app.esquemas import CambioEstadoProducto, ProductoCrear, ProductoReemplazo

router = APIRouter(tags=["Productos e inventario"])


def _normaliza(columna):
    return func.f_normaliza(columna)


def _sin_duplicados(db: Session, cuerpo: ProductoReemplazo, excepto=None) -> None:
    """409 de RF-04: código de barras, o nombre + presentación sin mayúsculas,
    acentos ni espacios extremos."""
    if cuerpo.codigoBarras:
        q = select(m.Producto.id).where(m.Producto.codigo_barras == cuerpo.codigoBarras)
        if excepto:
            q = q.where(m.Producto.id != excepto)
        if db.scalar(q):
            raise ErrorApi(409, "CODIGO_DUPLICADO", "Código duplicado")
    q = select(m.Producto.id).where(_normaliza(m.Producto.nombre) == func.f_normaliza(cuerpo.nombre),
                                    _normaliza(m.Producto.presentacion) == func.f_normaliza(cuerpo.presentacion))
    if excepto:
        q = q.where(m.Producto.id != excepto)
    if db.scalar(q):
        raise ErrorApi(409, "PRODUCTO_DUPLICADO", "Ya existe un producto con ese nombre y presentación.")


def _producto(db: Session, producto_id: str) -> m.Producto:
    producto = db.get(m.Producto, id_de_ruta(producto_id))
    if producto is None:
        raise no_encontrado()
    return producto


def _buscar(consulta, q: str | None):
    if q:
        consulta = consulta.where(_normaliza(m.Producto.nombre).contains(func.f_normaliza(q)))
    return consulta


@router.post("/productos", status_code=201)
def crear_producto(cuerpo: ProductoCrear, db: Session = Depends(obtener_db),
                   actor: m.UsuarioTienda = Depends(DUENO)):
    _sin_duplicados(db, cuerpo)
    producto = m.Producto(
        codigo_barras=cuerpo.codigoBarras, nombre=cuerpo.nombre, presentacion=cuerpo.presentacion,
        categoria=cuerpo.categoria, precio_venta=a_decimal(cuerpo.precioVenta),
        costo_referencia=a_decimal(cuerpo.costoReferencia), pr_inicial=cuerpo.prInicial,
        pr_vigente=cuerpo.prInicial, origen_pr="INICIAL", dias_entrega_respaldo=cuerpo.diasEntregaRespaldo,
        perecedero=cuerpo.perecedero, restringido=cuerpo.restringido, estado="ACTIVO", marca_descuadre=False)
    db.add(producto)
    db.flush()
    auditar(db, actor.usuario_id, "crear_producto", "producto", producto.id, None,
            {"nombre": producto.nombre, "precioVenta": cuerpo.precioVenta})
    db.commit()
    return json_producto(producto, (0, 0, 0))


@router.get("/productos", dependencies=[Depends(DUENO)])
def listar_productos(pagina: int = Query(1, ge=1), tamano: int = Query(20, ge=1, le=100),
                     q: str | None = None, estado: str | None = Query(None, pattern="^(ACTIVO|INACTIVO)$"),
                     categoria: str | None = None, db: Session = Depends(obtener_db)):
    consulta = _buscar(select(m.Producto), q).order_by(m.Producto.nombre, m.Producto.presentacion)
    if estado:
        consulta = consulta.where(m.Producto.estado == estado)
    if categoria:
        consulta = consulta.where(_normaliza(m.Producto.categoria) == func.f_normaliza(categoria))
    filas, total = paginar(db, consulta, pagina, tamano)
    exist = existencias(db, [p.id for p in filas])
    return {"datos": [json_producto(p, exist.get(p.id, (0, 0, 0))) for p in filas],
            "pagina": pagina, "tamano": tamano, "total": total}


@router.get("/productos/{producto_id}", dependencies=[Depends(DUENO)])
def consultar_producto(producto_id: str, db: Session = Depends(obtener_db)):
    producto = _producto(db, producto_id)
    return json_producto(producto, existencia(db, producto.id))


@router.put("/productos/{producto_id}")
def reemplazar_producto(producto_id: str, cuerpo: ProductoReemplazo, db: Session = Depends(obtener_db),
                        actor: m.UsuarioTienda = Depends(DUENO)):
    producto = _producto(db, producto_id)
    _sin_duplicados(db, cuerpo, excepto=producto.id)
    anterior = {"nombre": producto.nombre, "precioVenta": dinero(producto.precio_venta),
                "costoReferencia": dinero(producto.costo_referencia)}
    # El código interno no cambia. El precio nuevo no recalcula ventas ni pedidos ya guardados.
    producto.codigo_barras = cuerpo.codigoBarras
    producto.nombre = cuerpo.nombre
    producto.presentacion = cuerpo.presentacion
    producto.categoria = cuerpo.categoria
    producto.precio_venta = a_decimal(cuerpo.precioVenta)
    producto.costo_referencia = a_decimal(cuerpo.costoReferencia)
    producto.perecedero = cuerpo.perecedero
    producto.restringido = cuerpo.restringido
    auditar(db, actor.usuario_id, "reemplazar_producto", "producto", producto.id, anterior,
            {"nombre": cuerpo.nombre, "precioVenta": cuerpo.precioVenta, "costoReferencia": cuerpo.costoReferencia})
    db.commit()
    return json_producto(producto, existencia(db, producto.id))


@router.patch("/productos/{producto_id}/estado")
def cambiar_estado_producto(producto_id: str, cuerpo: CambioEstadoProducto, db: Session = Depends(obtener_db),
                            actor: m.UsuarioTienda = Depends(DUENO)):
    """Es la «baja» del producto: no se borra (RNF-14), se oculta del POS y del catálogo."""
    producto = _producto(db, producto_id)
    anterior = producto.estado
    producto.estado = cuerpo.estado
    auditar(db, actor.usuario_id, "cambiar_estado_producto", "producto", producto.id,
            {"estado": anterior}, {"estado": cuerpo.estado})
    db.commit()
    return json_producto(producto, existencia(db, producto.id))


@router.get("/productos/{producto_id}/costo", dependencies=[Depends(DUENO)])
def consultar_costo(producto_id: str, db: Session = Depends(obtener_db)):
    producto = _producto(db, producto_id)
    return {"productoId": str(producto.id), "costoReferencia": dinero(producto.costo_referencia)}


@router.get("/productos/{producto_id}/lotes")
def listar_lotes(producto_id: str, db: Session = Depends(obtener_db),
                 actor: m.UsuarioTienda = Depends(TIENDA)):
    producto = _producto(db, producto_id)
    lotes = db.scalars(select(m.Lote).where(m.Lote.producto_id == producto.id)
                       .order_by(m.Lote.fecha_caducidad.asc().nulls_last(), m.Lote.recibido_en)).all()
    con_costo = actor.rol == "DUENO"
    return {"productoId": str(producto.id), "lotes": [json_lote(lote, con_costo) for lote in lotes]}


@router.get("/inventario/productos", dependencies=[Depends(TIENDA)])
def listar_inventario(pagina: int = Query(1, ge=1), tamano: int = Query(20, ge=1, le=100),
                      q: str | None = None, estado: str | None = Query(None, pattern="^(ACTIVO|INACTIVO)$"),
                      db: Session = Depends(obtener_db)):
    consulta = _buscar(select(m.Producto), q).order_by(m.Producto.nombre, m.Producto.presentacion)
    if estado:
        consulta = consulta.where(m.Producto.estado == estado)
    filas, total = paginar(db, consulta, pagina, tamano)
    exist = existencias(db, [p.id for p in filas])
    return {"datos": [json_producto_inventario(p, exist.get(p.id, (0, 0, 0))) for p in filas],
            "pagina": pagina, "tamano": tamano, "total": total}


@router.get("/pos/productos", dependencies=[Depends(TIENDA)])
def buscar_pos(q: str | None = None, codigoBarras: str | None = Query(None, pattern=r"^\d{13}$"),
               db: Session = Depends(obtener_db)):
    """RF-15: lector o tecleo exacto por código de barras, o nombre parcial sin mayúsculas ni acentos."""
    consulta = select(m.Producto).where(m.Producto.estado == "ACTIVO")
    if codigoBarras:
        consulta = consulta.where(m.Producto.codigo_barras == codigoBarras)
    elif q:
        consulta = _buscar(consulta, q)
    else:
        raise ErrorApi(400, "PETICION_INVALIDA", "Envía q o codigoBarras.")
    filas = db.scalars(consulta.order_by(m.Producto.nombre).limit(50)).all()
    exist = existencias(db, [p.id for p in filas])
    productos = [{"id": str(p.id), "nombre": p.nombre, "presentacion": p.presentacion,
                  "precioVenta": dinero(p.precio_venta),
                  "existenciaDisponible": exist.get(p.id, (0, 0, 0))[2]} for p in filas]
    return {"mensaje": None if productos else "Producto no encontrado", "productos": productos}
