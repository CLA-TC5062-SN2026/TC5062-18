"""Configuración leída de variables de entorno (.env).

Ningún secreto vive en el código: si falta JWT_SECRET, o es corto, la API
no arranca.
"""
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


def _entero(nombre: str, por_defecto: int, minimo: int, maximo: int) -> int:
    valor = os.getenv(nombre, str(por_defecto))
    try:
        numero = int(valor)
    except ValueError:
        raise RuntimeError(f"{nombre} debe ser un número entero de minutos, no '{valor}'.") from None
    if not minimo <= numero <= maximo:
        raise RuntimeError(f"{nombre} debe estar entre {minimo} y {maximo}.")
    return numero


JWT_SECRET = os.getenv("JWT_SECRET", "")
if len(JWT_SECRET) < 32:
    raise RuntimeError(
        "JWT_SECRET falta o tiene menos de 32 caracteres. Genera uno con:\n"
        "  python -c \"import secrets; print(secrets.token_urlsafe(48))\"\n"
        "y ponlo en el archivo .env.")

JWT_ALGORITMO = "HS256"
# Minutos de vida del token (contrato: 60 min Dueño y Empleado, 24 h Cliente).
JWT_EXPIRATION = _entero("JWT_EXPIRATION", 60, 1, 24 * 60)
JWT_EXPIRATION_CLIENTE = _entero("JWT_EXPIRATION_CLIENTE", 24 * 60, 1, 7 * 24 * 60)
BCRYPT_ROUNDS = _entero("BCRYPT_ROUNDS", 12, 10, 15)
# Solo en desarrollo: escribe en la consola el enlace de activación, porque
# todavía no hay servidor de correo conectado.
MOSTRAR_ENLACES_EN_CONSOLA = os.getenv("MOSTRAR_ENLACES_EN_CONSOLA", "false").lower() == "true"
