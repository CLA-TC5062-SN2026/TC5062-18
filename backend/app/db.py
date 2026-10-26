"""Motor y sesión de SQLAlchemy. Una sesión por petición."""
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import url_base_datos

motor = create_engine(url_base_datos(), pool_pre_ping=True)
FabricaSesion = sessionmaker(bind=motor, autoflush=False, expire_on_commit=False)


def obtener_db() -> Iterator[Session]:
    db = FabricaSesion()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
