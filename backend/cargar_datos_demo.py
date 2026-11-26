"""Carga datos realistas de una tienda de abarrotes para grabar la demo (S11-A1).

Da de alta al proveedor de ruta del pan, crea 15 productos con precio, código de barras y punto de reorden, los recibe por
lote (la leche en dos lotes con caducidad distinta, para mostrar FEFO) y registra
unas ventas del día. El frijol queda justo en su punto de reorden, así que se
genera su alerta.

Uso, con la base recién cargada (esquema_bd.sql + datos_prueba.sql) y la API arriba:

    cd backend && source .venv/bin/activate
    python cargar_datos_demo.py                 # usa http://localhost:8000
    python cargar_datos_demo.py http://otra:8000

Si un producto ya existe (409), se salta y no se le vuelve a recibir mercancía.
"""
import datetime
import sys
import uuid

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
c = httpx.Client(base_url=BASE, timeout=20)
HOY = datetime.date.today()


def ean13(doce: str) -> str:
    """Agrega el dígito verificador a 12 dígitos."""
    suma = sum(int(d) * (3 if i % 2 else 1) for i, d in enumerate(doce))
    return doce + str((10 - suma % 10) % 10)


def dias(n: int) -> str:
    return (HOY + datetime.timedelta(days=n)).isoformat()


def sesion(correo: str) -> dict:
    r = c.post("/auth/sesiones", json={"correo": correo, "contrasena": "Tienda2026"})
    r.raise_for_status()
    return {"Authorization": "Bearer " + r.json()["token"]}


DUENA = sesion("duena@tiendinet.mx")
EMPLEADO = sesion("empleado@tiendinet.mx")
PROVEEDORES = {p["nombre"]: p["id"] for p in c.get("/proveedores", headers=DUENA).json()["datos"]}
if "Bimbo ruta" not in PROVEEDORES:  # proveedor de ruta del pan; el esquema solo trae A, B y "Otro (ruta)"
    r = c.post("/proveedores", headers=DUENA, json={"nombre": "Bimbo ruta", "tipo": "MANUAL_RUTA"})
    r.raise_for_status()
    PROVEEDORES["Bimbo ruta"] = r.json()["id"]


def con_clave(h: dict) -> dict:
    return {**h, "Idempotency-Key": str(uuid.uuid4())}


# nombre, presentación, categoría, precio, costo, perecedero, restringido, PR,
# código (12 dígitos o None), proveedor, lotes [(cantidad, días a caducidad o None)]
PRODUCTOS = [
    ("Aceite vegetal", "1 L", "Abarrotes", "38.50", "29.00", False, False, 10, "750100000101", "Proveedor A", [(15, None), (12, None)]),
    ("Frijol negro", "1 kg", "Abarrotes", "42.00", "31.50", False, False, 8, "750100000102", "Proveedor A", [(12, None)]),
    ("Arroz blanco", "1 kg", "Abarrotes", "32.00", "23.00", False, False, 6, "750100000103", "Proveedor B", [(18, None)]),
    ("Azúcar estándar", "1 kg", "Abarrotes", "34.00", "25.50", False, False, 5, "750100000104", "Proveedor B", [(15, None)]),
    ("Leche entera", "1 L", "Lácteos", "28.50", "22.00", True, False, 8, "750100000105", "Proveedor A", [(10, 5), (14, 12)]),
    ("Huevo blanco", "12 pzas", "Lácteos", "45.00", "36.00", True, False, 4, "750100000106", "Proveedor B", [(20, 20)]),
    ("Pan de caja grande", "680 g", "Panadería", "52.00", "40.00", True, False, 3, "750100000107", "Bimbo ruta", [(8, 6)]),
    ("Refresco de cola", "600 ml", "Bebidas", "19.00", "13.50", False, False, 12, "750100000108", "Proveedor A", [(48, None)]),
    ("Agua natural", "1.5 L", "Bebidas", "17.00", "11.00", False, False, 10, "750100000109", "Proveedor A", [(30, None)]),
    ("Atún en agua", "140 g", "Enlatados", "24.50", "18.00", False, False, 6, "750100000110", "Proveedor B", [(20, None)]),
    ("Sopa de pasta", "200 g", "Abarrotes", "11.00", "7.50", False, False, 10, "750100000111", "Proveedor B", [(40, None)]),
    ("Café soluble", "120 g", "Abarrotes", "79.00", "61.00", False, False, 3, "750100000112", "Proveedor A", [(10, None)]),
    ("Papel higiénico", "4 rollos", "Limpieza", "36.00", "27.00", False, False, 5, "750100000113", "Proveedor B", [(16, None)]),
    ("Jabón de barra", "150 g", "Limpieza", "18.00", "12.50", False, False, 5, "750100000114", "Proveedor B", [(20, None)]),
    ("Cerveza clara", "355 ml", "Bebidas", "22.00", "16.00", False, True, 12, "750100000115", "Otro (ruta)", [(24, None)]),
]

ids: dict[str, str] = {}
usa_codigo = True
for (nombre, pres, cat, precio, costo, perecedero, restringido, pr, codigo, prov, lotes) in PRODUCTOS:
    cuerpo = {"nombre": nombre, "presentacion": pres, "categoria": cat, "precioVenta": precio,
              "costoReferencia": costo, "perecedero": perecedero, "restringido": restringido, "prInicial": pr}
    if usa_codigo and codigo:
        cuerpo["codigoBarras"] = ean13(codigo)
    r = c.post("/productos", headers=DUENA, json=cuerpo)
    if r.status_code == 422 and "codigoBarras" in r.text and usa_codigo:
        print("  ! El contrato no acepta 'codigoBarras' con ese nombre; sigo sin código de barras.")
        usa_codigo = False
        cuerpo.pop("codigoBarras", None)
        r = c.post("/productos", headers=DUENA, json=cuerpo)
    if r.status_code == 409:
        print(f"  = {nombre} {pres} ya existía, se salta")
        continue
    r.raise_for_status()
    ids[nombre] = r.json()["id"]
    for cantidad, caduca in lotes:
        rec = {"productoId": ids[nombre], "proveedorId": PROVEEDORES[prov], "cantidad": cantidad}
        if caduca is not None:
            rec["fechaCaducidad"] = dias(caduca)
        c.post("/recepciones", headers=con_clave(DUENA), json=rec).raise_for_status()
    print(f"  + {nombre} {pres}: {sum(x for x, _ in lotes)} unidades, PR {pr}")


def vender(renglones: list[tuple[str, int]], forma: str = "EFECTIVO", recibido: str = "500.00") -> None:
    if not all(n in ids for n, _ in renglones):
        return
    venta = c.post("/ventas", headers=EMPLEADO).json()["id"]
    for nombre, cantidad in renglones:
        c.post(f"/ventas/{venta}/renglones", headers=EMPLEADO,
               json={"productoId": ids[nombre], "cantidad": cantidad}).raise_for_status()
    pago = {"formaPago": forma}
    if forma == "EFECTIVO":
        pago["montoRecibido"] = recibido
    r = c.post(f"/ventas/{venta}/confirmaciones", headers=con_clave(EMPLEADO), json=pago)
    r.raise_for_status()
    print(f"  $ {r.json().get('folio')} ({forma.lower()})")


print("\nVentas del día:")
vender([("Refresco de cola", 2), ("Sopa de pasta", 3)], recibido="100.00")
vender([("Leche entera", 2), ("Huevo blanco", 1), ("Pan de caja grande", 1)], "TARJETA_TERMINAL")
vender([("Frijol negro", 4), ("Arroz blanco", 1)])          # frijol: 12 -> 8 = PR, nace su alerta
vender([("Agua natural", 2), ("Atún en agua", 2)], recibido="200.00")

print(f"\nListo: {len(ids)} productos nuevos. Entra con duena@tiendinet.mx / Tienda2026.")
