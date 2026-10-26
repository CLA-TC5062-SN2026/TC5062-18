"""Modelo ORM. Refleja las tablas de esquema_bd.sql que usa este CRUD.

Las columnas van en snake_case como en la base. Las respuestas del API
las traducen a camelCase con los nombres de los schemas del contrato.
"""
import os
import time as _reloj
import uuid
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (Boolean, Date, DateTime, FetchedValue, ForeignKey, Integer,
                        Numeric, SmallInteger, String, Time, Uuid, func)
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


_ultimo = [0, 0]  # [milisegundo, contador]


def uuid7() -> uuid.UUID:
    """UUID versión 7: empieza con el instante en milisegundos y un contador,
    así ordenar por id es ordenar por momento de alta (renglones en el orden
    en que se capturaron)."""
    ms = _reloj.time_ns() // 1_000_000
    if ms <= _ultimo[0]:
        ms = _ultimo[0]
        _ultimo[1] += 1
    else:
        _ultimo[0], _ultimo[1] = ms, 0
    contador = _ultimo[1] & 0xFFF
    aleatorio = int.from_bytes(os.urandom(8), "big") & ((1 << 62) - 1)
    valor = (ms & ((1 << 48) - 1)) << 80 | 0x7 << 76 | contador << 64 | 0b10 << 62 | aleatorio
    return uuid.UUID(int=valor)


Dinero = Numeric(12, 2)


# ----------------------------------------------------------------- acceso
class Usuario(Base):
    __tablename__ = "usuario"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    tipo: Mapped[str] = mapped_column(String(10))
    nombre: Mapped[str] = mapped_column(String(120))
    correo: Mapped[str] = mapped_column(String(254))
    password_hash: Mapped[str | None] = mapped_column(String(255))
    estado: Mapped[str] = mapped_column(String(10), default="ACTIVO")

    tienda: Mapped["UsuarioTienda | None"] = relationship(back_populates="usuario", uselist=False)
    cliente: Mapped["Cliente | None"] = relationship(back_populates="usuario", uselist=False)


class UsuarioTienda(Base):
    __tablename__ = "usuario_tienda"
    usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("usuario.id"), primary_key=True)
    tipo: Mapped[str] = mapped_column(String(10), default="TIENDA")
    rol: Mapped[str] = mapped_column(String(10))
    activacion_enviada: Mapped[bool] = mapped_column(Boolean, default=False)

    usuario: Mapped[Usuario] = relationship(back_populates="tienda", lazy="joined")


class Cliente(Base):
    __tablename__ = "cliente"
    usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("usuario.id"), primary_key=True)
    tipo: Mapped[str] = mapped_column(String(10), default="CLIENTE")
    telefono: Mapped[str] = mapped_column(String(10))
    calle: Mapped[str] = mapped_column(String(200))
    codigo_postal: Mapped[str] = mapped_column(String(5))
    aviso_privacidad_aceptado: Mapped[bool] = mapped_column(Boolean)

    usuario: Mapped[Usuario] = relationship(back_populates="cliente", lazy="joined")


class TokenCuenta(Base):
    __tablename__ = "token_cuenta"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("usuario.id"))
    proposito: Mapped[str] = mapped_column(String(12))
    token_hash: Mapped[str] = mapped_column(String(64))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    usado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class RegistroAuditoria(Base):
    __tablename__ = "registro_auditoria"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("usuario.id"))
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    operacion: Mapped[str] = mapped_column(String(60))
    entidad: Mapped[str] = mapped_column(String(60))
    entidad_id: Mapped[str] = mapped_column(String(64))
    valor_anterior: Mapped[dict | None] = mapped_column(JSONB)
    valor_nuevo: Mapped[dict | None] = mapped_column(JSONB)
    resultado: Mapped[str] = mapped_column(String(20))


class RegistroIdempotencia(Base):
    __tablename__ = "registro_idempotencia"
    clave: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("usuario.id"))
    operacion: Mapped[str] = mapped_column(String(60))
    hash_cuerpo: Mapped[str] = mapped_column(String(64))
    estado: Mapped[str] = mapped_column(String(12), default="EN_PROCESO")
    codigo_respuesta: Mapped[int | None] = mapped_column(SmallInteger)
    cuerpo_respuesta: Mapped[dict | None] = mapped_column(JSONB)
    creada_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))


# ---------------------------------------------------------- administracion
class ConfiguracionTienda(Base):
    __tablename__ = "configuracion_tienda"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, default=1)
    dias_seguridad: Mapped[int] = mapped_column(SmallInteger)
    pedido_minimo_envio: Mapped[Decimal] = mapped_column(Dinero)
    costo_envio: Mapped[Decimal] = mapped_column(Dinero)
    horario_inicio: Mapped[time] = mapped_column(Time)
    horario_fin: Mapped[time] = mapped_column(Time)
    hora_limite_mismo_dia: Mapped[time] = mapped_column(Time)
    dias_aviso_caducidad: Mapped[int] = mapped_column(SmallInteger)
    plazo_respuesta_faltante_min: Mapped[int] = mapped_column(Integer)


class CodigoPostalEntrega(Base):
    __tablename__ = "codigo_postal_entrega"
    codigo: Mapped[str] = mapped_column(String(5), primary_key=True)
    configuracion_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("configuracion_tienda.id"), default=1)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


# ------------------------------------------------------------- proveedores
class Proveedor(Base):
    __tablename__ = "proveedor"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(120))
    tipo: Mapped[str] = mapped_column(String(12))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Oferta(Base):
    __tablename__ = "oferta"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    proveedor_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("proveedor.id"))
    producto_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("producto.id"))
    origen: Mapped[str] = mapped_column(String(12))
    codigo_proveedor: Mapped[str | None] = mapped_column(String(40))
    presentacion: Mapped[str] = mapped_column(String(80))
    factor_conversion: Mapped[int] = mapped_column(Integer)
    costo: Mapped[Decimal] = mapped_column(Dinero)
    existencia_proveedor: Mapped[int] = mapped_column(Integer)
    dias_entrega: Mapped[int] = mapped_column(Integer)
    fecha_actualizacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# -------------------------------------------------------------- inventario
class Producto(Base):
    __tablename__ = "producto"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Lo genera la base con la secuencia seq_codigo_interno (PRD-000001).
    codigo_interno: Mapped[str] = mapped_column(String(12), server_default=FetchedValue())
    codigo_barras: Mapped[str | None] = mapped_column(String(13))
    nombre: Mapped[str] = mapped_column(String(150))
    presentacion: Mapped[str] = mapped_column(String(80))
    categoria: Mapped[str] = mapped_column(String(80))
    precio_venta: Mapped[Decimal] = mapped_column(Dinero)
    costo_referencia: Mapped[Decimal] = mapped_column(Dinero)
    pr_inicial: Mapped[int] = mapped_column(Integer)
    pr_vigente: Mapped[int] = mapped_column(Integer)
    origen_pr: Mapped[str] = mapped_column(String(10), default="INICIAL")
    pr_manual: Mapped[int | None] = mapped_column(Integer)
    vigencia_pr_manual: Mapped[date | None] = mapped_column(Date)
    dias_entrega_respaldo: Mapped[int | None] = mapped_column(Integer)
    proveedor_preferido_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("proveedor.id"))
    perecedero: Mapped[bool] = mapped_column(Boolean)
    restringido: Mapped[bool] = mapped_column(Boolean)
    estado: Mapped[str] = mapped_column(String(10), default="ACTIVO")
    marca_descuadre: Mapped[bool] = mapped_column(Boolean, default=False)

    __mapper_args__ = {"eager_defaults": True}



class Lote(Base):
    __tablename__ = "lote"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    producto_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("producto.id"))
    cantidad: Mapped[int] = mapped_column(Integer)
    fecha_caducidad: Mapped[date | None] = mapped_column(Date)
    costo_unitario: Mapped[Decimal | None] = mapped_column(Dinero)
    proveedor_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("proveedor.id"))
    oferta_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("oferta.id"))
    recibido_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MovimientoInventario(Base):
    __tablename__ = "movimiento_inventario"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    tipo: Mapped[str] = mapped_column(String(16))
    producto_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("producto.id"))
    lote_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("lote.id"))
    cantidad: Mapped[int] = mapped_column(Integer)
    cantidad_anterior: Mapped[int] = mapped_column(Integer)
    cantidad_nueva: Mapped[int] = mapped_column(Integer)
    motivo: Mapped[str | None] = mapped_column(String(200))
    usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("usuario_tienda.usuario_id"))
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Recepcion(Base):
    __tablename__ = "recepcion"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    producto_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("producto.id"))
    proveedor_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("proveedor.id"))
    lote_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("lote.id"))
    movimiento_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("movimiento_inventario.id"))
    cantidad: Mapped[int] = mapped_column(Integer)
    existencia_fisica: Mapped[int] = mapped_column(Integer)
    existencia_disponible: Mapped[int] = mapped_column(Integer)
    costo_ignorado: Mapped[bool] = mapped_column(Boolean, default=False)

    lote: Mapped[Lote] = relationship(lazy="joined")
    movimiento: Mapped[MovimientoInventario] = relationship(lazy="joined")


class Alerta(Base):
    __tablename__ = "alerta"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    tipo: Mapped[str] = mapped_column(String(10))
    estado: Mapped[str] = mapped_column(String(10), default="ACTIVA")
    producto_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("producto.id"))
    lote_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("lote.id"))
    existencia_disponible: Mapped[int | None] = mapped_column(Integer)
    punto_reorden: Mapped[int | None] = mapped_column(Integer)
    cantidad_sugerida: Mapped[int | None] = mapped_column(Integer)
    proveedor_sugerido_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("proveedor.id"))
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# --------------------------------------------------------------------- pos
class Venta(Base):
    __tablename__ = "venta"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    folio: Mapped[str | None] = mapped_column(String(12))
    estado: Mapped[str] = mapped_column(String(10), default="BORRADOR")
    diferida: Mapped[bool] = mapped_column(Boolean, default=False)
    forma_pago: Mapped[str | None] = mapped_column(String(16))
    total: Mapped[Decimal] = mapped_column(Dinero, default=Decimal("0.00"))
    monto_recibido: Mapped[Decimal | None] = mapped_column(Dinero)
    cambio: Mapped[Decimal | None] = mapped_column(Dinero)
    usuario_responsable_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("usuario_tienda.usuario_id"))
    fecha_hora: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    corte_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)

    renglones: Mapped[list["RenglonVenta"]] = relationship(
        back_populates="venta", cascade="all, delete-orphan", order_by="RenglonVenta.id")
    responsable: Mapped[UsuarioTienda] = relationship(lazy="joined")
    cancelacion: Mapped["CancelacionVenta | None"] = relationship(uselist=False)
    descuadres: Mapped[list["Descuadre"]] = relationship()


class RenglonVenta(Base):
    __tablename__ = "renglon_venta"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid7)
    venta_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("venta.id"))
    producto_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("producto.id"))
    cantidad: Mapped[int] = mapped_column(Integer)
    precio_unitario: Mapped[Decimal] = mapped_column(Dinero)
    subtotal: Mapped[Decimal] = mapped_column(Dinero)

    venta: Mapped[Venta] = relationship(back_populates="renglones")
    producto: Mapped[Producto] = relationship(lazy="joined")


class CancelacionVenta(Base):
    __tablename__ = "cancelacion_venta"
    venta_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("venta.id"), primary_key=True)
    motivo: Mapped[str] = mapped_column(String(200))
    usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("usuario_tienda.usuario_id"))
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Descuadre(Base):
    __tablename__ = "descuadre"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    venta_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("venta.id"))
    producto_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("producto.id"))
    solicitado: Mapped[int] = mapped_column(Integer)
    descontado: Mapped[int] = mapped_column(Integer)
    disponible_antes: Mapped[int | None] = mapped_column(Integer)


class SalidaLote(Base):
    __tablename__ = "salida_lote"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    renglon_venta_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("renglon_venta.id"))
    renglon_pedido_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    lote_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("lote.id"))
    cantidad: Mapped[int] = mapped_column(Integer)


# ----------------------------------------------------------------- pedidos
class Carrito(Base):
    __tablename__ = "carrito"
    cliente_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("cliente.usuario_id"), primary_key=True)

    renglones: Mapped[list["RenglonCarrito"]] = relationship(
        cascade="all, delete-orphan", order_by="RenglonCarrito.id")


class RenglonCarrito(Base):
    __tablename__ = "renglon_carrito"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid7)
    cliente_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("carrito.cliente_id"))
    producto_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("producto.id"))
    cantidad: Mapped[int] = mapped_column(Integer)

    producto: Mapped[Producto] = relationship(lazy="joined")


class IntentoInicioSesion(Base):
    __tablename__ = "intento_inicio_sesion"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    correo: Mapped[str] = mapped_column(String(254))
    ip: Mapped[str] = mapped_column(INET)
    exitoso: Mapped[bool] = mapped_column(Boolean)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
