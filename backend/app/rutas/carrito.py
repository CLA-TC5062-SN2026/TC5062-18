"""Carrito del cliente, guardado en el servidor (RF-22, RF-23-AC-4)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import modelos as m
from app.comun import actor_cliente, existencia, id_de_ruta, json_carrito
from app.db import obtener_db
from app.errores import ErrorApi, no_encontrado
from app.esquemas import RenglonCantidad, RenglonCarritoCrear

router = APIRouter(tags=["Pedidos en línea"])


def _carrito(db: Session, cliente: m.Cliente, crear: bool = False) -> m.Carrito | None:
    carrito = db.get(m.Carrito, cliente.usuario_id)
    if carrito is None and crear:
        carrito = m.Carrito(cliente_id=cliente.usuario_id)
        db.add(carrito)
        db.flush()
    return carrito


def _validar_disponible(db: Session, producto: m.Producto, cantidad: int) -> None:
    if producto.restringido:
        raise ErrorApi(422, "PRODUCTO_RESTRINGIDO", "Producto no disponible en línea")
    disponible = existencia(db, producto.id)[2]
    if disponible == 0:
        raise ErrorApi(422, "AGOTADO", "Agotado")
    if cantidad > disponible:
        raise ErrorApi(422, "CANTIDAD_NO_DISPONIBLE", f"Solo hay {disponible} disponibles")


def _renglon(carrito: m.Carrito | None, renglon_id: str) -> m.RenglonCarrito:
    rid = id_de_ruta(renglon_id)
    for renglon in (carrito.renglones if carrito else []):
        if renglon.id == rid:
            return renglon
    raise no_encontrado("El renglón no existe en tu carrito.")


@router.get("/carrito")
def consultar_carrito(db: Session = Depends(obtener_db), cliente: m.Cliente = Depends(actor_cliente)):
    return json_carrito(_carrito(db, cliente))


@router.delete("/carrito")
def vaciar_carrito(db: Session = Depends(obtener_db), cliente: m.Cliente = Depends(actor_cliente)):
    carrito = _carrito(db, cliente)
    if carrito:
        carrito.renglones.clear()
        db.commit()
    return json_carrito(carrito)


@router.post("/carrito/renglones", status_code=201)
def agregar_al_carrito(cuerpo: RenglonCarritoCrear, db: Session = Depends(obtener_db),
                       cliente: m.Cliente = Depends(actor_cliente)):
    producto = db.get(m.Producto, cuerpo.productoId)
    if producto is None or producto.estado != "ACTIVO":
        raise no_encontrado("El producto no existe.")
    carrito = _carrito(db, cliente, crear=True)
    existente = next((r for r in carrito.renglones if r.producto_id == producto.id), None)
    # Agregar un producto que ya está suma la cantidad; se valida el total.
    nueva = cuerpo.cantidad + (existente.cantidad if existente else 0)
    _validar_disponible(db, producto, nueva)
    if existente:
        existente.cantidad = nueva
    else:
        carrito.renglones.append(m.RenglonCarrito(producto_id=producto.id, cantidad=cuerpo.cantidad))
    db.commit()
    db.refresh(carrito)
    return json_carrito(carrito)


@router.patch("/carrito/renglones/{renglon_id}")
def cambiar_cantidad(renglon_id: str, cuerpo: RenglonCantidad, db: Session = Depends(obtener_db),
                     cliente: m.Cliente = Depends(actor_cliente)):
    carrito = _carrito(db, cliente)
    renglon = _renglon(carrito, renglon_id)
    _validar_disponible(db, renglon.producto, cuerpo.cantidad)
    renglon.cantidad = cuerpo.cantidad
    db.commit()
    return json_carrito(carrito)


@router.delete("/carrito/renglones/{renglon_id}")
def quitar_del_carrito(renglon_id: str, db: Session = Depends(obtener_db),
                       cliente: m.Cliente = Depends(actor_cliente)):
    carrito = _carrito(db, cliente)
    renglon = _renglon(carrito, renglon_id)
    carrito.renglones.remove(renglon)
    db.commit()
    return json_carrito(carrito)
