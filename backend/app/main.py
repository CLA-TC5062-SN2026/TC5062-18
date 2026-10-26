"""API TiendiNet: servicios CRUD sobre la base concentradora.

Ejecutar:  uvicorn app.main:app --reload --port 8000
Documentación interactiva: http://localhost:8000/docs

Esta versión NO tiene seguridad (JWT ni roles); se agrega en la siguiente
actividad. El encabezado opcional X-Usuario-Id indica quién hace la operación.
"""
import logging

from fastapi import FastAPI
from sqlalchemy import text

from app.db import motor
from app.errores import instalar_manejadores
from app.rutas import acceso, carrito, configuracion, inventario, productos, proveedores, ventas

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(
    title="API TiendiNet",
    version="2.0.0",
    description="Implementación de openapi_equipo.yaml (Parte 2: CRUD sin seguridad).",
)
instalar_manejadores(app)

for modulo in (acceso, productos, inventario, proveedores, configuracion, ventas, carrito):
    app.include_router(modulo.router)


@app.get("/salud", tags=["Operación"], include_in_schema=False)
def salud():
    """Comprueba la conexión a PostgreSQL."""
    with motor.connect() as cx:
        version = cx.execute(text("SHOW server_version")).scalar()
        tablas = cx.execute(text(
            "SELECT count(*) FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")).scalar()
    return {"estado": "ok", "postgresql": version, "tablas": tablas}
