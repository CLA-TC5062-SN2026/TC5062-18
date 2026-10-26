"""Cruza el nivel de acceso de cada ruta de la API con openapi_equipo.yaml.

Por cada ruta implementada compara:
  - pública o protegida: contra `security` de la operación en el contrato,
  - roles: contra la frase «Roles ...» de su descripción.
Imprime la tabla en Markdown para revision_seguridad.md.
Uso: python verificar_roles.py [ruta/openapi_equipo.yaml]
"""
import re
import sys

import yaml
from fastapi.routing import APIRoute

from app.main import app
from app.seguridad import CLIENTE, DUENO, RUTAS_PUBLICAS, TIENDA, sesion_actual

CONTRATO = sys.argv[1] if len(sys.argv) > 1 else "../openapi_equipo.yaml"
spec = yaml.safe_load(open(CONTRATO, encoding="utf-8"))
ALIAS = {"/api/auth/register": "/clientes", "/api/auth/login": "/auth/sesiones", "/api/auth/me": "/auth/yo"}
NIVEL = {DUENO: "Dueño", TIENDA: "Dueño y Empleado", CLIENTE: "Cliente"}
# Operaciones cuyo rol el contrato da en otra frase de la descripción.
ROL_IMPLICITO = {("POST", "/usuarios"): "Dueño", ("PATCH", "/usuarios/{usuarioId}"): "Dueño",
                 ("GET", "/auth/yo"): "Cualquier rol"}


def deps(dependant):
    for d in dependant.dependencies:
        yield d.call
        yield from deps(d)


def plantilla(ruta):
    ruta = ALIAS.get(ruta, ruta)
    return re.sub(r"\{(\w+)_id\}", lambda m: "{" + re.sub(r"_(\w)", lambda x: x.group(1).upper(), m.group(1)) + "Id}", ruta)


def rutas(lista):
    """Aplana los routers incluidos (FastAPI reciente los envuelve)."""
    for r in lista:
        if isinstance(r, APIRoute):
            yield r
        elif hasattr(r, "original_router"):
            yield from rutas(r.original_router.routes)


filas, errores = [], []
for r in rutas(app.routes):
    if not isinstance(r, APIRoute) or r.path == "/salud":
        continue
    for metodo in sorted(r.methods):
        llamadas = set(deps(r.dependant))
        nivel = next((n for f, n in NIVEL.items() if f in llamadas), None)
        if nivel is None and sesion_actual in llamadas:
            nivel = "Cualquier rol"
        publica = (metodo, r.path) in RUTAS_PUBLICAS
        op = spec["paths"].get(plantilla(r.path), {}).get(metodo.lower())
        if op is None:
            errores.append(f"{metodo} {r.path}: no está en el contrato")
            continue
        en_contrato_publica = op.get("security", spec.get("security")) == []
        rol = re.search(r"Roles? ([^.]+)\.", op.get("description") or "")
        rol_contrato = ROL_IMPLICITO.get((metodo, plantilla(r.path))) or (rol.group(1) if rol else "—")
        ok = (publica == en_contrato_publica) and (publica or nivel == rol_contrato)
        if not ok:
            errores.append(f"{metodo} {r.path}: API={'pública' if publica else nivel} contrato={'pública' if en_contrato_publica else rol_contrato}")
        alias = f" (alias de `{plantilla(r.path)}`)" if r.path in ALIAS else ""
        filas.append((r.path, metodo, "Pública" if publica else "Bearer", "—" if publica else nivel, "✓" if ok else "✗", alias))

print("| Método | Ruta | Token | Roles permitidos | Coincide con el contrato |")
print("|---|---|---|---|---|")
for ruta, metodo, token, nivel, ok, alias in sorted(filas, key=lambda f: (f[2] != "Pública", f[0], f[1])):
    print(f"| {metodo} | `{ruta}`{alias} | {token} | {nivel} | {ok} |")
print(f"\n{len(filas)} operaciones; {sum(f[2] == 'Bearer' for f in filas)} protegidas, "
      f"{sum(f[2] == 'Pública' for f in filas)} públicas; diferencias con el contrato: {len(errores)}")
for e in errores:
    print("  ✗", e)
sys.exit(1 if errores else 0)
