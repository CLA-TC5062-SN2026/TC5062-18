"""Cuerpos de petición, con los nombres y reglas de openapi_equipo.yaml.

Todos rechazan campos desconocidos (additionalProperties: false) y usan
tipos estrictos: 2.5 o "2" en un entero responden 422, no se redondean.
"""
import uuid
from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, StringConstraints, model_validator

Dinero = Annotated[str, StringConstraints(pattern=r"^\d+\.\d{2}$")]
Hora = Annotated[str, StringConstraints(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")]
CodigoPostal = Annotated[str, StringConstraints(pattern=r"^\d{5}$")]
TextoNoVacio = Annotated[str, StringConstraints(min_length=1, strip_whitespace=True)]
Correo = Annotated[str, StringConstraints(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=254)]
EnteroPositivo = Annotated[StrictInt, Field(ge=1)]
EnteroNoNegativo = Annotated[StrictInt, Field(ge=0)]


class Cerrado(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ------------------------------------------------------------------ acceso
class Direccion(Cerrado):
    calle: TextoNoVacio
    codigoPostal: CodigoPostal


class RegistroCliente(Cerrado):
    nombre: TextoNoVacio
    correo: Correo
    telefono: Annotated[str, StringConstraints(pattern=r"^\d{10}$")]
    contrasena: Annotated[str, StringConstraints(min_length=8)]
    direccion: Direccion
    avisoPrivacidadAceptado: StrictBool


class UsuarioCrear(Cerrado):
    nombre: TextoNoVacio
    correo: Correo
    rol: Literal["DUENO", "EMPLEADO"]


class UsuarioEstado(Cerrado):
    estado: Literal["ACTIVO", "INACTIVO"]


# --------------------------------------------------------------- productos
class ProductoReemplazo(Cerrado):
    codigoBarras: Annotated[str, StringConstraints(pattern=r"^\d{13}$")] | None = None
    nombre: TextoNoVacio
    presentacion: TextoNoVacio
    categoria: TextoNoVacio
    precioVenta: Dinero
    costoReferencia: Dinero
    perecedero: StrictBool
    restringido: StrictBool


class ProductoCrear(ProductoReemplazo):
    prInicial: EnteroNoNegativo
    diasEntregaRespaldo: EnteroPositivo | None = None


class CambioEstadoProducto(Cerrado):
    estado: Literal["ACTIVO", "INACTIVO"]


class RecepcionCrear(Cerrado):
    productoId: uuid.UUID
    proveedorId: uuid.UUID
    cantidad: EnteroPositivo
    fechaCaducidad: date | None = None
    costoUnitario: Dinero | None = None


# ------------------------------------------------------------- proveedores
class ProveedorCrear(Cerrado):
    nombre: TextoNoVacio
    tipo: Literal["MANUAL_RUTA", "OTRO_RUTA"]


# ----------------------------------------------------------- configuración
class ConfiguracionActualizar(Cerrado):
    diasSeguridad: Annotated[StrictInt, Field(ge=0, le=14)] | None = None
    pedidoMinimoEnvio: Dinero | None = None
    costoEnvio: Dinero | None = None
    horarioInicio: Hora | None = None
    horarioFin: Hora | None = None
    horaLimiteMismoDia: Hora | None = None
    diasAvisoCaducidad: EnteroNoNegativo | None = None
    plazoRespuestaFaltanteMin: EnteroPositivo | None = None

    @model_validator(mode="after")
    def _al_menos_uno(self):
        if not self.model_fields_set:
            raise ValueError("Envía al menos un parámetro.")
        return self


class CodigoPostalCrear(Cerrado):
    codigo: CodigoPostal


class CodigoPostalEstado(Cerrado):
    activo: StrictBool


# --------------------------------------------------------------------- pos
class RenglonVentaCrear(Cerrado):
    productoId: uuid.UUID
    cantidad: EnteroPositivo


class RenglonCantidad(Cerrado):
    cantidad: EnteroPositivo


class ConfirmarVenta(Cerrado):
    formaPago: Literal["EFECTIVO", "TARJETA_TERMINAL"]
    montoRecibido: Dinero | None = None


# ----------------------------------------------------------------- carrito
class RenglonCarritoCrear(Cerrado):
    productoId: uuid.UUID
    cantidad: EnteroPositivo
