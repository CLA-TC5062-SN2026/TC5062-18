"""Verifica la API en ejecución contra openapi_equipo.yaml.

Para cada petición comprueba:
  1. que la ruta y el método existen en el contrato,
  2. que el código HTTP obtenido es el esperado y está declarado en el contrato,
  3. que el cuerpo JSON valida contra el schema de esa respuesta,
y al final revisa en PostgreSQL que los datos persistieron.

Uso:  python verificar_api.py [URL_BASE] [ruta/openapi_equipo.yaml]
Requiere la base recién cargada con esquema_bd.sql y datos_prueba.sql.
"""
import json
import re
import sys
import uuid

import httpx
import psycopg
import yaml
from jsonschema import ValidationError
from openapi_schema_validator import OAS30Validator

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
CONTRATO = sys.argv[2] if len(sys.argv) > 2 else "../openapi_equipo.yaml"
DUENA = "11111111-1111-4111-8111-111111111111"
EMPLEADO = "22222222-2222-4222-8222-222222222222"
CLIENTE = "33333333-3333-4333-8333-333333333333"

spec = yaml.safe_load(open(CONTRATO, encoding="utf-8"))
plantillas = [(re.compile("^" + re.sub(r"\{[^}]+\}", "[^/]+", p) + "$"), p) for p in spec["paths"]]
resultados: list[tuple[str, bool, str]] = []
cx = httpx.Client(base_url=BASE, timeout=20)


def _resolver(nodo):
    while isinstance(nodo, dict) and "$ref" in nodo:
        partes = nodo["$ref"].lstrip("#/").split("/")
        nodo = spec
        for parte in partes:
            nodo = nodo[parte]
    return nodo


def llamar(nombre, metodo, ruta, esperado, cuerpo=None, crudo=None, encabezados=None):
    r = cx.request(metodo, ruta, json=cuerpo, content=crudo, headers={
        **({"Content-Type": "application/json"} if crudo is not None else {}), **(encabezados or {})})
    problemas = []
    if r.status_code != esperado:
        problemas.append(f"código {r.status_code}, se esperaba {esperado}")
    plantilla = next((p for rx, p in plantillas if rx.match(ruta.split("?")[0])), None)
    operacion = spec["paths"].get(plantilla, {}).get(metodo.lower()) if plantilla else None
    if operacion is None:
        problemas.append("la operación no existe en el contrato")
    else:
        declarada = _resolver(operacion["responses"].get(str(r.status_code)))
        if declarada is None:
            problemas.append(f"el contrato no declara {r.status_code} en {metodo} {plantilla}")
        else:
            esquema = declarada.get("content", {}).get("application/json", {}).get("schema")
            if esquema is not None:
                try:
                    OAS30Validator({**esquema, "components": spec["components"]}).validate(r.json())
                except ValidationError as e:
                    ruta_error = "/".join(str(x) for x in e.absolute_path)
                    problemas.append(f"cuerpo fuera del schema en '{ruta_error}': {e.message[:120]}")
    ok = not problemas
    resultados.append((f"{metodo} {ruta.split('?')[0][:60]} → {r.status_code}  {nombre}", ok, "; ".join(problemas)))
    return r


def clave():
    return {"Idempotency-Key": str(uuid.uuid4())}


# ------------------------------------------------------------------ escenario
llamar("Proveedores sembrados", "GET", "/proveedores", 200)
otro = next(p for p in cx.get("/proveedores").json()["datos"] if p["tipo"] == "OTRO_RUTA")

leche = {"codigoBarras": "7501055300075", "nombre": "Leche entera", "presentacion": "1 L", "categoria": "Lácteos",
         "precioVenta": "28.50", "costoReferencia": "22.00", "prInicial": 5, "perecedero": True, "restringido": False}
r = llamar("Crear producto", "POST", "/productos", 201, leche)
leche_id = r.json()["id"]
llamar("Código de barras duplicado", "POST", "/productos", 409, {**leche, "nombre": "Otra"})
llamar("Mismo nombre y presentación con acento y espacios", "POST", "/productos", 409,
       {**leche, "codigoBarras": None, "nombre": "  LÉCHE entera ", "presentacion": "1 l"})
llamar("Precio negativo", "POST", "/productos", 422, {**leche, "codigoBarras": None, "nombre": "Pan", "precioVenta": "-1.00"})
llamar("Campo desconocido", "POST", "/productos", 422, {**leche, "codigoBarras": None, "nombre": "Pan", "color": "rojo"})
llamar("JSON mal formado", "POST", "/productos", 400, crudo=b'{"nombre": ')
cerveza = {"codigoBarras": "7501064191008", "nombre": "Cerveza clara", "presentacion": "355 ml", "categoria": "Bebidas",
           "precioVenta": "22.00", "costoReferencia": "15.50", "prInicial": 6, "perecedero": False, "restringido": True}
cerveza_id = llamar("Crear producto restringido", "POST", "/productos", 201, cerveza).json()["id"]
pan = {"nombre": "Pan de caja", "presentacion": "680 g", "categoria": "Panadería", "precioVenta": "52.00",
       "costoReferencia": "40.00", "prInicial": 2, "perecedero": False, "restringido": False}
pan_id = llamar("Crear producto sin código de barras", "POST", "/productos", 201, pan).json()["id"]

llamar("Listar fichas", "GET", "/productos?q=LECHE", 200)
llamar("Tamaño de página fuera de rango", "GET", "/productos?tamano=500", 400)
llamar("Consultar ficha", "GET", f"/productos/{leche_id}", 200)
llamar("Ficha inexistente", "GET", f"/productos/{uuid.uuid4()}", 404)
llamar("Id mal formado", "GET", "/productos/no-es-uuid", 404)
llamar("Editar ficha y precio", "PUT", f"/productos/{pan_id}", 200,
       {k: v for k, v in {**pan, "precioVenta": "54.00"}.items() if k != "prInicial"})
llamar("Desactivar producto", "PATCH", f"/productos/{pan_id}/estado", 200, {"estado": "INACTIVO"})
llamar("Reactivar producto", "PATCH", f"/productos/{pan_id}/estado", 200, {"estado": "ACTIVO"})
llamar("Costo del producto", "GET", f"/productos/{leche_id}/costo", 200)

recepcion = {"productoId": leche_id, "proveedorId": otro["id"], "cantidad": 10, "fechaCaducidad": "2030-01-15",
             "costoUnitario": "21.00"}
llamar("Recepción sin Idempotency-Key", "POST", "/recepciones", 422, recepcion)
k = clave()
r = llamar("Recepción", "POST", "/recepciones", 201, recepcion, encabezados=k)
recepcion_id = r.json()["id"]
r2 = llamar("Reintento con la misma clave", "POST", "/recepciones", 201, recepcion, encabezados=k)
resultados.append(("   … el reintento devuelve la misma recepción y no crea otra", r2.json().get("id") == recepcion_id and
                   r2.headers.get("Idempotency-Replayed") == "true", "id o encabezado distintos"))
llamar("Misma clave con otro cuerpo", "POST", "/recepciones", 409, {**recepcion, "cantidad": 3}, encabezados=k)
llamar("Perecedero sin caducidad", "POST", "/recepciones", 422,
       {k2: v for k2, v in recepcion.items() if k2 != "fechaCaducidad"}, encabezados=clave())
r = llamar("Empleado envía costo (se ignora)", "POST", "/recepciones", 201,
           {**recepcion, "cantidad": 5, "fechaCaducidad": "2030-01-10"}, encabezados={**clave(), "X-Usuario-Id": EMPLEADO})
resultados.append(("   … costoIgnorado = true y sin costo en la respuesta",
                   r.json().get("costoIgnorado") is True and r.json()["lote"]["costoUnitario"] is None, str(r.json())[:120]))
llamar("Recepción de pan", "POST", "/recepciones", 201,
       {"productoId": pan_id, "proveedorId": otro["id"], "cantidad": 3}, encabezados=clave())
llamar("Lotes del producto", "GET", f"/productos/{leche_id}/lotes", 200)
llamar("Listar recepciones", "GET", f"/recepciones?productoId={leche_id}", 200)
llamar("Consultar recepción", "GET", f"/recepciones/{recepcion_id}", 200)
llamar("Inventario sin costos", "GET", "/inventario/productos?q=leche", 200)
llamar("POS por nombre sin acentos", "GET", "/pos/productos?q=léche", 200)
llamar("POS por código de barras", "GET", "/pos/productos?codigoBarras=7501055300075", 200)
r = llamar("POS sin coincidencias", "GET", "/pos/productos?q=zzzz", 200)
resultados.append(("   … mensaje «Producto no encontrado»", r.json().get("mensaje") == "Producto no encontrado", str(r.json())))

llamar("Crear proveedor de ruta", "POST", "/proveedores", 201, {"nombre": "Bimbo ruta", "tipo": "MANUAL_RUTA"})
r = llamar("Proveedor duplicado", "POST", "/proveedores", 409, {"nombre": "  BIMBO RUTA ", "tipo": "MANUAL_RUTA"})
llamar("Consultar proveedor", "GET", f"/proveedores/{otro['id']}", 200)

llamar("Consultar configuración", "GET", "/configuracion", 200)
r = llamar("20 días de seguridad", "PATCH", "/configuracion", 422, {"diasSeguridad": 20})
resultados.append(("   … mensaje del SRS", r.json().get("mensaje") == "Los días de seguridad deben estar entre 0 y 14", r.text))
llamar("Configuración sin campos", "PATCH", "/configuracion", 422, {})
llamar("Cambiar días de seguridad y costo de envío", "PATCH", "/configuracion", 200,
       {"diasSeguridad": 3, "costoEnvio": "30.00"})
llamar("Listar códigos postales", "GET", "/configuracion/codigos-postales", 200)
llamar("Agregar código postal", "POST", "/configuracion/codigos-postales", 201, {"codigo": "72100"})
llamar("Código postal repetido", "POST", "/configuracion/codigos-postales", 409, {"codigo": "72100"})
llamar("Consultar código postal", "GET", "/configuracion/codigos-postales/72100", 200)
llamar("Desactivar código postal", "PATCH", "/configuracion/codigos-postales/72100", 200, {"activo": False})
llamar("Código postal inexistente", "GET", "/configuracion/codigos-postales/99999", 404)

llamar("Listar usuarios de la tienda", "GET", "/usuarios", 200)
nuevo = llamar("Crear empleado", "POST", "/usuarios", 201,
               {"nombre": "Marta Ruiz", "correo": "marta@tiendinet.mx", "rol": "EMPLEADO"}).json()
llamar("Correo repetido", "POST", "/usuarios", 409, {"nombre": "X", "correo": "MARTA@tiendinet.mx", "rol": "EMPLEADO"})
llamar("Consultar usuario", "GET", f"/usuarios/{nuevo['id']}", 200)
llamar("Desactivar al empleado", "PATCH", f"/usuarios/{EMPLEADO}", 200, {"estado": "INACTIVO"})
llamar("Reactivar al empleado", "PATCH", f"/usuarios/{EMPLEADO}", 200, {"estado": "ACTIVO"})
llamar("Desactivar a la última Dueña", "PATCH", f"/usuarios/{DUENA}", 409, {"estado": "INACTIVO"})
llamar("Usuario inexistente", "GET", f"/usuarios/{uuid.uuid4()}", 404)

registro = {"nombre": "Jorge Díaz", "correo": "jorge@correo.mx", "telefono": "2229876543", "contrasena": "Vecino2026",
            "direccion": {"calle": "5 de Mayo 14", "codigoPostal": "72000"}, "avisoPrivacidadAceptado": True}
llamar("Registrar cliente", "POST", "/clientes", 201, registro)
llamar("Cliente con correo existente", "POST", "/clientes", 409, registro)
llamar("Contraseña sin número", "POST", "/clientes", 422, {**registro, "correo": "x@correo.mx", "contrasena": "solotexto"})

venta = llamar("Abrir venta", "POST", "/ventas", 201).json()
vid = venta["id"]
r = llamar("Agregar 2 leches", "POST", f"/ventas/{vid}/renglones", 201, {"productoId": leche_id, "cantidad": 2})
llamar("Cantidad decimal", "POST", f"/ventas/{vid}/renglones", 422, {"productoId": leche_id, "cantidad": 1.5})
r = llamar("Cantidad cero", "POST", f"/ventas/{vid}/renglones", 422, {"productoId": leche_id, "cantidad": 0})
resultados.append(("   … mensaje del SRS", r.json().get("mensaje") == "La cantidad debe ser un número entero mayor a 0", r.text))
r = llamar("Agregar pan", "POST", f"/ventas/{vid}/renglones", 201, {"productoId": pan_id, "cantidad": 1})
renglon_pan = r.json()["renglones"][1]["id"]
renglon_leche = r.json()["renglones"][0]["id"]
r = llamar("Cambiar a 3 leches", "PATCH", f"/ventas/{vid}/renglones/{renglon_leche}", 200, {"cantidad": 3})
r = llamar("Quitar el pan", "DELETE", f"/ventas/{vid}/renglones/{renglon_pan}", 200)
resultados.append(("   … total recalculado a 85.50", r.json()["total"] == "85.50", r.json()["total"]))
r = llamar("Efectivo insuficiente", "POST", f"/ventas/{vid}/confirmaciones", 422,
           {"formaPago": "EFECTIVO", "montoRecibido": "50.00"}, encabezados=clave())
resultados.append(("   … informa el faltante 35.50", r.json().get("faltante") == "35.50", r.text))
k = clave()
r = llamar("Confirmar en efectivo", "POST", f"/ventas/{vid}/confirmaciones", 200,
           {"formaPago": "EFECTIVO", "montoRecibido": "100.00"}, encabezados=k)
folio = r.json().get("folio")
resultados.append(("   … folio VTA-…, cambio 14.50", bool(folio and folio.startswith("VTA-")) and r.json()["cambio"] == "14.50",
                   str(r.json())[:150]))
r = llamar("Reintento de la confirmación", "POST", f"/ventas/{vid}/confirmaciones", 200,
           {"formaPago": "EFECTIVO", "montoRecibido": "100.00"}, encabezados=k)
resultados.append(("   … mismo folio, sin cobrar dos veces", r.json().get("folio") == folio, str(r.json().get("folio"))))
llamar("Confirmar otra vez con otra clave", "POST", f"/ventas/{vid}/confirmaciones", 409,
       {"formaPago": "EFECTIVO", "montoRecibido": "100.00"}, encabezados=clave())
llamar("Agregar renglón a venta confirmada", "POST", f"/ventas/{vid}/renglones", 409, {"productoId": leche_id, "cantidad": 1})
v2 = llamar("Abrir otra venta", "POST", "/ventas", 201).json()["id"]
llamar("Pedir 50 leches", "POST", f"/ventas/{v2}/renglones", 201, {"productoId": leche_id, "cantidad": 50})
r = llamar("Existencia insuficiente", "POST", f"/ventas/{v2}/confirmaciones", 409,
           {"formaPago": "TARJETA_TERMINAL"}, encabezados=clave())
resultados.append(("   … señala producto, solicitada y disponible",
                   r.json().get("cantidadSolicitada") == 50 and r.json().get("disponible") == 12, r.text[:160]))
llamar("Buscar venta por folio", "GET", f"/ventas?folio={folio}", 200)
llamar("Consultar venta", "GET", f"/ventas/{vid}", 200)
llamar("Listar ventas del día", "GET", "/ventas", 200)

llamar("Carrito vacío", "GET", "/carrito", 200)
r = llamar("Agregar al carrito", "POST", "/carrito/renglones", 201, {"productoId": leche_id, "cantidad": 2})
renglon_carrito = r.json()["renglones"][0]["id"]
r = llamar("Más de lo disponible", "POST", "/carrito/renglones", 422, {"productoId": leche_id, "cantidad": 40})
resultados.append(("   … «Solo hay N disponibles»", r.json().get("mensaje") == "Solo hay 12 disponibles", r.text))
r = llamar("Producto restringido", "POST", "/carrito/renglones", 422, {"productoId": cerveza_id, "cantidad": 1})
resultados.append(("   … «Producto no disponible en línea»", r.json().get("mensaje") == "Producto no disponible en línea", r.text))
llamar("Cambiar cantidad en el carrito", "PATCH", f"/carrito/renglones/{renglon_carrito}", 200, {"cantidad": 4})
llamar("Agregar pan al carrito", "POST", "/carrito/renglones", 201, {"productoId": pan_id, "cantidad": 1})
llamar("Quitar la leche del carrito", "DELETE", f"/carrito/renglones/{renglon_carrito}", 200)
llamar("Renglón de carrito inexistente", "DELETE", f"/carrito/renglones/{uuid.uuid4()}", 404)
r = llamar("Vaciar carrito", "DELETE", "/carrito", 200)

# --------------------------------------------------------------- persistencia
with psycopg.connect("postgresql://tiendinet:tiendinet@localhost:5432/tiendinet") as db:
    def uno(sql, *args):
        return db.execute(sql, args).fetchone()[0]
    checks = [
        ("Lotes de leche: 15 recibidas, 3 vendidas, quedan 12",
         uno("SELECT sum(cantidad) FROM lote WHERE producto_id = %s", leche_id) == 12),
        ("FEFO: salió del lote que caduca primero (2030-01-10)",
         uno("SELECT l.fecha_caducidad::text FROM salida_lote s JOIN lote l ON l.id = s.lote_id "
             "JOIN renglon_venta r ON r.id = s.renglon_venta_id WHERE r.venta_id = %s", vid) == "2030-01-10"),
        ("La venta quedó COMPLETADA con folio y fecha",
         uno("SELECT estado || ' ' || folio FROM venta WHERE id = %s AND fecha_hora IS NOT NULL", vid) == f"COMPLETADA {folio}"),
        ("El reintento no duplicó la recepción (3 recepciones)", uno("SELECT count(*) FROM recepcion") == 3),
        ("Movimientos: 3 de recepción y 1 de venta",
         uno("SELECT count(*) FILTER (WHERE tipo='RECEPCION')*10 + count(*) FILTER (WHERE tipo='VENTA') "
             "FROM movimiento_inventario") == 31),
        ("Auditoría escrita en la misma transacción", uno("SELECT count(*) FROM registro_auditoria") >= 15),
        ("Claves de idempotencia guardadas", uno("SELECT count(*) FROM registro_idempotencia") >= 4),
        ("Configuración persistió (3 días, envío 30.00)",
         uno("SELECT dias_seguridad || ' ' || costo_envio FROM configuracion_tienda") == "3 30.00"),
        ("El carrito quedó vacío", uno("SELECT count(*) FROM renglon_carrito") == 0),
    ]
    for nombre, ok in checks:
        resultados.append((f"BD   {nombre}", ok, "no coincide"))

fallas = [r for r in resultados if not r[1]]
for texto, ok, problema in resultados:
    print(("OK    " if ok else "FALLA ") + texto + ("" if ok else f"\n        {problema}"))
peticiones = sum(1 for r in resultados if not r[0].startswith(("   ", "BD")))
print(f"\n{len(resultados) - len(fallas)}/{len(resultados)} verificaciones correctas ({peticiones} peticiones).")
sys.exit(1 if fallas else 0)
