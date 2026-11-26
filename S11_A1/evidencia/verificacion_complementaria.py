"""Verificación complementaria para la matriz de trazabilidad (S11-A1).

Cubre criterios que el código implementa pero que `backend/verificar_api.py`
no revisa: pago con tarjeta, alertas de reorden (también por GET /alertas), la vista
previa del corte de caja, producto inactivo oculto en
el POS, lotes que caducan hoy o ya caducaron, la venta concurrente por la
última unidad (RF-16-AC-6) y la prueba de RNF-06 (50 cobros simultáneos sobre
10 unidades).

Uso (con la API en http://localhost:8000, datos_prueba.sql cargado y el
.env del backend en la ruta indicada):

    cd backend && source .venv/bin/activate
    python ../S11_A1/evidencia/verificacion_complementaria.py

Crea sus propios productos con un sufijo aleatorio, así que puede correrse
varias veces sin recargar la base.
"""
import concurrent.futures as cf
import datetime
import os
import subprocess
import sys
import uuid
from collections import Counter
from zoneinfo import ZoneInfo

import httpx
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))  # el .env de backend/, desde donde se ejecuta
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
c = httpx.Client(base_url=BASE, timeout=20)
resultados: list[tuple[str, bool, str]] = []


def revisar(criterio: str, ok: bool, detalle: str) -> None:
    resultados.append((criterio, ok, detalle))
    print(f"{'OK   ' if ok else 'FALLA'} {criterio}: {detalle}")


def token(correo: str) -> str:
    r = c.post("/auth/sesiones", json={"correo": correo, "contrasena": "Tienda2026"})
    r.raise_for_status()
    return r.json()["token"]


DUENA = {"Authorization": "Bearer " + token("duena@tiendinet.mx")}
EMPLEADO = {"Authorization": "Bearer " + token("empleado@tiendinet.mx")}
PROVEEDOR_A = next(p["id"] for p in c.get("/proveedores", headers=DUENA).json()["datos"]
                   if p["nombre"] == "Proveedor A")
SUFIJO = uuid.uuid4().hex[:5]


def clave() -> dict:
    return {**DUENA, "Idempotency-Key": str(uuid.uuid4())}


def producto(nombre: str, pr: int, perecedero: bool = False) -> str:
    r = c.post("/productos", headers=DUENA, json={
        "nombre": f"{nombre} {SUFIJO}", "presentacion": "1 pza", "categoria": "Prueba",
        "precioVenta": "10.00", "costoReferencia": "7.00", "perecedero": perecedero,
        "restringido": False, "prInicial": pr})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def recibir(producto_id: str, cantidad: int, caducidad: str | None = None) -> None:
    cuerpo = {"productoId": producto_id, "proveedorId": PROVEEDOR_A, "cantidad": cantidad}
    if caducidad:
        cuerpo["fechaCaducidad"] = caducidad
    r = c.post("/recepciones", headers=clave(), json=cuerpo)
    assert r.status_code == 201, r.text


def borrador(producto_id: str, cantidad: int) -> str:
    venta = c.post("/ventas", headers=DUENA).json()["id"]
    c.post(f"/ventas/{venta}/renglones", headers=DUENA, json={"productoId": producto_id, "cantidad": cantidad})
    return venta


def confirmar(venta: str, forma: str = "EFECTIVO") -> httpx.Response:
    cuerpo = {"formaPago": forma}
    if forma == "EFECTIVO":
        cuerpo["montoRecibido"] = "1000.00"
    # Cliente nuevo por llamada para que las peticiones concurrentes sean independientes.
    return httpx.post(f"{BASE}/ventas/{venta}/confirmaciones", headers=clave(), json=cuerpo, timeout=20)


def disponible(nombre: str) -> int:
    r = c.get("/pos/productos", headers=EMPLEADO, params={"q": f"{nombre} {SUFIJO}"}).json()
    return r["productos"][0]["existenciaDisponible"]


# RF-16-AC-4: tarjeta sin monto recibido ni cambio
p = producto("Tarjeta", 0)
recibir(p, 10)
r = confirmar(borrador(p, 2), "TARJETA_TERMINAL").json()
revisar("RF-16-AC-4", r["estado"] == "COMPLETADA" and r.get("formaPago") == "TARJETA_TERMINAL"
        and r.get("montoRecibido") is None and r.get("cambio") is None,
        f"estado={r['estado']}, formaPago={r.get('formaPago')}, montoRecibido={r.get('montoRecibido')}, "
        f"cambio={r.get('cambio')}")

# RF-09: PR 5. 8 -> 7 sin alerta; 7 -> 5 crea alerta; 5 -> 4 la misma; recepción la resuelve
p = producto("Alerta", 5)
recibir(p, 8)
r = confirmar(borrador(p, 1)).json()
revisar("RF-09-AC-3", r.get("alertasGeneradas", []) == [], "disponible 8 -> 7 con PR 5: sin alerta")
r = confirmar(borrador(p, 2)).json()
alerta = r.get("alertasGeneradas", [])
revisar("RF-09-AC-1", len(alerta) == 1, f"disponible 7 -> 5 con PR 5: alerta {alerta}")
r = confirmar(borrador(p, 1)).json()
revisar("RF-09-AC-4", r.get("alertasGeneradas", []) == alerta, "disponible 5 -> 4: se actualiza la misma alerta")


def alerta_de(estado: str, cabeceras: dict) -> dict | None:
    lista = c.get("/alertas", headers=cabeceras, params={"tipo": "REORDEN", "estado": estado, "tamano": 100}).json()
    return next((a for a in lista["datos"] if a["productoId"] == p), None)


a = alerta_de("ACTIVA", EMPLEADO)
revisar("RF-09-AC-1 (GET /alertas)", a is not None and a["existenciaDisponible"] == 4 and a["puntoReorden"] == 5
        and a["cantidadSugerida"] == 2 and a["proveedorSugeridoId"] is None,
        f"el Empleado ve la alerta: disponible {a and a['existenciaDisponible']}, PR {a and a['puntoReorden']}, "
        f"sugerida {a and a['cantidadSugerida']} (PR - disponible + 1 = 2), sin proveedor")
recibir(p, 10)
a = alerta_de("RESUELTA", DUENA)
revisar("RF-09-AC-5 (GET /alertas)", a is not None and alerta_de("ACTIVA", DUENA) is None,
        "tras recibir 10, la alerta sale de las activas y aparece como resuelta")
fila = subprocess.run(
    ["psql", "-h", os.getenv("DB_HOST", "localhost"), "-U", os.getenv("DB_USER", "tiendinet"),
     "-d", os.getenv("DB_NAME", "tiendinet"), "-tAc",
     f"SELECT estado, existencia_disponible FROM alerta WHERE producto_id = '{p}'"],
    capture_output=True, text=True, env={**os.environ, "PGPASSWORD": os.getenv("DB_PASSWORD", "")})
revisar("RF-09-AC-5", fila.stdout.startswith("RESUELTA"), f"tras recibir 10: {fila.stdout.strip() or fila.stderr.strip()}")

# RF-20-AC-1 y AC-2: la vista previa del corte suma el efectivo y separa la tarjeta
antes = c.get("/cortes-caja/vista-previa", headers=EMPLEADO).json()
p = producto("Corte", 0)
recibir(p, 5)
confirmar(borrador(p, 2))                       # 2 × 10.00 en efectivo
confirmar(borrador(p, 1), "TARJETA_TERMINAL")   # 1 × 10.00 con tarjeta
despues = c.get("/cortes-caja/vista-previa", headers=EMPLEADO).json()
from decimal import Decimal
delta_efectivo = Decimal(despues["efectivoEsperado"]) - Decimal(antes["efectivoEsperado"])
delta_tarjeta = Decimal(despues["totalTarjeta"]) - Decimal(antes["totalTarjeta"])
revisar("RF-20-AC-1/AC-2 (vista previa)", delta_efectivo == Decimal("20.00") and delta_tarjeta == Decimal("10.00")
        and despues["ventasEnLineaExcluidas"] is True,
        f"efectivo +{delta_efectivo}, tarjeta +{delta_tarjeta} (esperado +20.00 y +10.00)")

# RF-04-AC-5: un producto inactivo ya no aparece en el POS
p = producto("Inactivo", 0)
c.patch(f"/productos/{p}/estado", headers=DUENA, json={"estado": "INACTIVO"})
r = c.get("/pos/productos", headers=EMPLEADO, params={"q": f"Inactivo {SUFIJO}"}).json()
revisar("RF-04-AC-5", r["productos"] == [] and r["mensaje"] == "Producto no encontrado", str(r))

# RF-07-AC-4: un lote que caduca hoy se vende; RF-07-AC-3: uno caducado no cuenta como disponible
hoy = datetime.datetime.now(ZoneInfo("America/Mexico_City")).date()
p = producto("Yogurt", 0, perecedero=True)
recibir(p, 3, hoy.isoformat())
r = confirmar(borrador(p, 1))
revisar("RF-07-AC-4", r.status_code == 200, f"venta de lote que caduca {hoy}: HTTP {r.status_code}")
recibir(producto_caducado := producto("Caducado", 0, perecedero=True), 4, (hoy - datetime.timedelta(days=1)).isoformat())
revisar("RF-07-AC-3 (disponible)", disponible("Caducado") == 0, f"4 unidades caducadas ayer, disponible = {disponible('Caducado')}")

# RF-16-AC-6: dos confirmaciones simultáneas por la última unidad
p = producto("Ultima", 0)
recibir(p, 1)
ventas = [borrador(p, 1) for _ in range(2)]
with cf.ThreadPoolExecutor(2) as ex:
    respuestas = list(ex.map(confirmar, ventas))
codigos = sorted(x.status_code for x in respuestas)
mensaje = [x.json().get("mensaje") for x in respuestas if x.status_code == 409]
revisar("RF-16-AC-6", codigos == [200, 409] and mensaje == ["Producto agotado"] and disponible("Ultima") == 0,
        f"códigos {codigos}, mensaje {mensaje}, disponible final {disponible('Ultima')}")

# RNF-06: 50 confirmaciones simultáneas sobre 10 unidades
p = producto("Carga", 0)
recibir(p, 10)
ventas = [borrador(p, 1) for _ in range(50)]
with cf.ThreadPoolExecutor(25) as ex:
    conteo = Counter(x.status_code for x in ex.map(confirmar, ventas))
revisar("RNF-06", conteo == {200: 10, 409: 40} and disponible("Carga") == 0,
        f"{dict(conteo)}, disponible final {disponible('Carga')}")

# RF-17-AC-2: la venta conserva el precio del momento aunque el producto cambie de precio
p = producto("Precio", 0)
recibir(p, 5)
venta = borrador(p, 1)
confirmar(venta)
c.put(f"/productos/{p}", headers=DUENA, json={
    "nombre": f"Precio {SUFIJO}", "presentacion": "1 pza", "categoria": "Prueba", "precioVenta": "99.00",
    "costoReferencia": "7.00", "perecedero": False, "restringido": False})
r = c.get(f"/ventas/{venta}", headers=EMPLEADO).json()
precio = r["renglones"][0]["precioUnitario"]
revisar("RF-17-AC-2", precio == "10.00" and r["total"] == "10.00",
        f"precio nuevo 99.00; la venta {r.get('folio')} conserva {precio} (total {r['total']})")

# RF-08-AC-2 y RF-04-AC-4: validación de campos al crear la ficha
base = {"nombre": f"Validacion {SUFIJO}", "presentacion": "1 pza", "categoria": "x", "precioVenta": "1.00",
        "costoReferencia": "1.00", "perecedero": False, "restringido": False}
for valor in (-1, 2.5, "diez"):
    r = c.post("/productos", headers=DUENA, json={**base, "prInicial": valor})
    campo = r.json().get("detalles", [{}])[0].get("campo")
    revisar("RF-08-AC-2", r.status_code == 422 and campo == "prInicial", f"prInicial={valor!r}: HTTP {r.status_code}, campo {campo}")
r = c.post("/productos", headers=DUENA, json={k: v for k, v in base.items() if k != "categoria"} | {"prInicial": 1})
campo = r.json().get("detalles", [{}])[0].get("campo")
revisar("RF-04-AC-4", r.status_code == 422 and campo == "categoria", f"sin categoría: HTTP {r.status_code}, campo {campo}")

correctas = sum(ok for _, ok, _ in resultados)
print(f"\n{correctas}/{len(resultados)} verificaciones correctas.")
sys.exit(0 if correctas == len(resultados) else 1)
