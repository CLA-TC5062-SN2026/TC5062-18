"""Configuración leída de variables de entorno (.env)."""
import os

from dotenv import load_dotenv

load_dotenv()


def url_base_datos() -> str:
    host = os.getenv("DB_HOST", "localhost")
    puerto = os.getenv("DB_PORT", "5432")
    nombre = os.getenv("DB_NAME", "tiendinet")
    usuario = os.getenv("DB_USER", "tiendinet")
    contrasena = os.getenv("DB_PASSWORD", "")
    return f"postgresql+psycopg://{usuario}:{contrasena}@{host}:{puerto}/{nombre}"
