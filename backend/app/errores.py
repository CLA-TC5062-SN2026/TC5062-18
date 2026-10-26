"""Errores con el schema `Error` del contrato: {mensaje, codigo, detalles[]}."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("tiendinet")


class ErrorApi(Exception):
    """Error de negocio que se responde tal cual."""

    def __init__(self, estado: int, codigo: str, mensaje: str,
                 detalles: list[dict] | None = None, extra: dict | None = None):
        self.estado = estado
        self.codigo = codigo
        self.mensaje = mensaje
        self.detalles = detalles
        self.extra = extra or {}

    def cuerpo(self) -> dict:
        cuerpo = {"mensaje": self.mensaje, "codigo": self.codigo}
        if self.detalles:
            cuerpo["detalles"] = self.detalles
        cuerpo.update(self.extra)
        return cuerpo


def no_encontrado(mensaje: str = "No encontrado") -> ErrorApi:
    return ErrorApi(404, "NO_ENCONTRADO", mensaje)


def datos_invalidos(campo: str, mensaje: str) -> ErrorApi:
    return ErrorApi(422, "DATOS_INVALIDOS", "Revisa los campos marcados.",
                    detalles=[{"campo": campo, "mensaje": mensaje}])


# ---------------------------------------------------------------- 422 / 400
CAMPOS_DINERO = {"precioVenta": "El precio", "costoReferencia": "El costo", "costoUnitario": "El costo",
                 "costoEnvio": "El costo de envío", "pedidoMinimoEnvio": "El pedido mínimo",
                 "montoRecibido": "El monto recibido", "costo": "El costo"}

MENSAJES_CAMPO = {
    "cantidad": "La cantidad debe ser un número entero mayor a 0",
    "diasSeguridad": "Los días de seguridad deben estar entre 0 y 14",
}


def _mensaje(campo: str, error: dict) -> str:
    tipo = error.get("type", "")
    hoja = campo.split(".")[-1]
    if hoja in MENSAJES_CAMPO and tipo not in ("missing", "extra_forbidden"):
        return MENSAJES_CAMPO[hoja]
    if tipo == "missing":
        return "Campo obligatorio."
    if tipo == "extra_forbidden":
        return "Campo no reconocido."
    if tipo == "string_pattern_mismatch":
        if hoja in CAMPOS_DINERO:
            valor = str(error.get("input", ""))
            if valor.startswith("-"):
                return f"{CAMPOS_DINERO[hoja]} no puede ser negativo."
            return "Debe ser un importe con dos decimales, por ejemplo 38.50."
        patron = error.get("ctx", {}).get("pattern", "")
        if "[01]" in patron:
            return "Debe ser una hora HH:MM, por ejemplo 09:00."
        if "\\d{5}" in patron:
            return "El código postal debe tener 5 dígitos."
        if "\\d{10}" in patron:
            return "El teléfono debe tener 10 dígitos."
        if "\\d{13}" in patron:
            return "El código de barras debe tener 13 dígitos."
        return "Formato no válido."
    if tipo in ("int_type", "int_parsing", "int_from_float"):
        return "Debe ser un número entero."
    if tipo == "greater_than_equal":
        return f"Debe ser mayor o igual a {error['ctx']['ge']}."
    if tipo == "less_than_equal":
        return f"Debe ser menor o igual a {error['ctx']['le']}."
    if tipo in ("string_too_short", "too_short"):
        return "No puede estar vacío."
    if tipo in ("bool_type", "bool_parsing"):
        return "Debe ser verdadero o falso."
    if tipo in ("uuid_type", "uuid_parsing"):
        return "Debe ser un UUID."
    if tipo in ("enum", "literal_error"):
        return "Valor no permitido. Opciones: " + error.get("ctx", {}).get("expected", "")
    if tipo in ("date_type", "date_from_datetime_parsing", "date_parsing"):
        return "Debe ser una fecha AAAA-MM-DD."
    if tipo in ("value_error", "assertion_error"):
        return str(error.get("ctx", {}).get("error", error.get("msg", "Valor no válido.")))
    if tipo in ("string_type",):
        return "Debe ser texto."
    if tipo in ("dict_type", "model_type", "model_attributes_type"):
        return "Debe ser un objeto JSON."
    return error.get("msg", "Valor no válido.")


def _campo(loc: tuple) -> str:
    partes = [str(p) for p in loc if p not in ("body", "query", "path", "header")]
    return ".".join(partes) or "cuerpo"


def instalar_manejadores(app: FastAPI) -> None:

    @app.exception_handler(ErrorApi)
    async def _error_api(_: Request, exc: ErrorApi):
        return JSONResponse(status_code=exc.estado, content=exc.cuerpo())

    @app.exception_handler(RequestValidationError)
    async def _validacion(_: Request, exc: RequestValidationError):
        errores = exc.errors()
        # JSON mal formado, o un cuerpo que no es objeto: 400.
        if any(e.get("type") == "json_invalid" for e in errores) or any(
                e.get("type") in ("model_attributes_type", "dict_type") and tuple(e.get("loc", ())) == ("body",)
                for e in errores):
            return JSONResponse(status_code=400, content={
                "mensaje": "El cuerpo de la petición no es JSON válido.", "codigo": "PETICION_INVALIDA"})
        detalles = []
        solo_consulta = all(tuple(e.get("loc", ("",)))[0] == "query" for e in errores)
        for e in errores:
            campo = _campo(tuple(e.get("loc", ())))
            if campo.lower() == "idempotency-key":
                campo = "Idempotency-Key"
            detalle = {"campo": campo, "mensaje": _mensaje(campo, e)}
            if detalle not in detalles:
                detalles.append(detalle)
        if solo_consulta:
            # Un parámetro de consulta mal formado es una petición inválida (400 en el contrato).
            return JSONResponse(status_code=400, content={
                "mensaje": "Algún parámetro de la consulta no es válido.", "codigo": "PETICION_INVALIDA",
                "detalles": detalles})
        mensaje = "Revisa los campos marcados."
        if len(detalles) == 1 and detalles[0]["mensaje"] in MENSAJES_CAMPO.values():
            mensaje = detalles[0]["mensaje"]
        return JSONResponse(status_code=422, content={
            "mensaje": mensaje, "codigo": "DATOS_INVALIDOS", "detalles": detalles})

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException):
        if exc.status_code == 404:
            cuerpo = {"mensaje": "No encontrado", "codigo": "NO_ENCONTRADO"}
        elif exc.status_code == 405:
            cuerpo = {"mensaje": "Método no permitido en este recurso.", "codigo": "METODO_NO_PERMITIDO"}
        else:
            cuerpo = {"mensaje": str(exc.detail), "codigo": "ERROR_HTTP"}
        return JSONResponse(status_code=exc.status_code, content=cuerpo, headers=getattr(exc, "headers", None))

    @app.exception_handler(IntegrityError)
    async def _integridad(_: Request, exc: IntegrityError):
        # Red de seguridad: las reglas se validan antes, pero si dos peticiones
        # chocan, la restricción de la base decide.
        diag = getattr(exc.orig, "diag", None)
        restriccion = getattr(diag, "constraint_name", "") or ""
        estado_sql = getattr(exc.orig, "sqlstate", "") or ""
        conocidas = {
            "ux_usuario_correo": (409, "CORREO_DUPLICADO", "El correo ya está registrado."),
            "producto_codigo_barras_key": (409, "CODIGO_DUPLICADO", "Código duplicado"),
            "ux_producto_nombre_presentacion": (409, "PRODUCTO_DUPLICADO",
                                                "Ya existe un producto con ese nombre y presentación."),
            "ux_proveedor_nombre_activo": (409, "PROVEEDOR_DUPLICADO",
                                           "Ya existe un proveedor activo con ese nombre."),
            "codigo_postal_entrega_pkey": (409, "CODIGO_POSTAL_DUPLICADO", "El código postal ya existe."),
            "ck_config_horario": (422, "DATOS_INVALIDOS", "El horario de fin debe ser posterior al de inicio."),
            "ck_config_hora_limite": (422, "DATOS_INVALIDOS",
                                      "La hora límite del mismo día debe estar dentro del horario."),
        }
        if restriccion in conocidas:
            estado, codigo, mensaje = conocidas[restriccion]
        elif estado_sql == "23505":
            estado, codigo, mensaje = 409, "CONFLICTO", "El registro choca con uno existente."
        else:
            estado, codigo, mensaje = 422, "DATOS_INVALIDOS", "Los datos no cumplen una regla del negocio."
        log.info("IntegrityError %s %s", estado_sql, restriccion)
        return JSONResponse(status_code=estado, content={"mensaje": mensaje, "codigo": codigo})

    @app.exception_handler(Exception)
    async def _interno(_: Request, exc: Exception):
        log.exception("Error no previsto", exc_info=exc)
        return JSONResponse(status_code=500, content={
            "mensaje": "Ocurrió un error. Intenta de nuevo.", "codigo": "ERROR_INTERNO"})
