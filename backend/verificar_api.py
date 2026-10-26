"""Verifica la API en ejecución contra openapi_equipo.yaml, incluida la seguridad.

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

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

import httpx
import jwt
import psycopg
import yaml
from dotenv import load_dotenv
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
load_dotenv()
SECRETO = os.environ["JWT_SECRET"]  # solo para fabricar un token vencido en la prueba
DSN = "postgresql://tiendinet:tiendinet@localhost:5432/tiendinet"
# Los alias de la actividad se validan contra la operación del contrato que ejecutan.
ALIAS = {"/api/auth/register": "/clientes", "/api/auth/login": "/auth/sesiones", "/api/auth/me": "/auth/yo"}


def iniciar(correo, contrasena="Tienda2026"):
    r = cx.post("/auth/sesiones", json={"correo": correo, "contrasena": contrasena})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


T_DUENA, T_EMPLEADO, T_CLIENTE = (iniciar(c) for c in ("duena@tiendinet.mx", "empleado@tiendinet.mx", "ana@correo.mx"))
cx.headers.update(bearer(T_DUENA))  # por omisión opera la Dueña
EMP, CLI = bearer(T_EMPLEADO), bearer(T_CLIENTE)


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
    sin_query = ruta.split("?")[0]
    plantilla = next((p for rx, p in plantillas if rx.match(ALIAS.get(sin_query, sin_query))), None)
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
           {**recepcion, "cantidad": 5, "fechaCaducidad": "2030-01-10"}, encabezados={**clave(), **EMP})
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
r = llamar("Empleado desactivado con token vigente", "GET", "/pos/productos?q=leche", 401, encabezados=EMP)
resultados.append(("   … 401 CUENTA_INACTIVA (RF-03-AC-2)", r.json().get("codigo") == "CUENTA_INACTIVA", r.text))
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

llamar("Carrito vacío", "GET", "/carrito", 200, encabezados=CLI)
r = llamar("Agregar al carrito", "POST", "/carrito/renglones", 201, {"productoId": leche_id, "cantidad": 2}, encabezados=CLI)
renglon_carrito = r.json()["renglones"][0]["id"]
r = llamar("Más de lo disponible", "POST", "/carrito/renglones", 422, {"productoId": leche_id, "cantidad": 40}, encabezados=CLI)
resultados.append(("   … «Solo hay N disponibles»", r.json().get("mensaje") == "Solo hay 12 disponibles", r.text))
r = llamar("Producto restringido", "POST", "/carrito/renglones", 422, {"productoId": cerveza_id, "cantidad": 1}, encabezados=CLI)
resultados.append(("   … «Producto no disponible en línea»", r.json().get("mensaje") == "Producto no disponible en línea", r.text))
llamar("Cambiar cantidad en el carrito", "PATCH", f"/carrito/renglones/{renglon_carrito}", 200, {"cantidad": 4}, encabezados=CLI)
llamar("Agregar pan al carrito", "POST", "/carrito/renglones", 201, {"productoId": pan_id, "cantidad": 1}, encabezados=CLI)
llamar("Quitar la leche del carrito", "DELETE", f"/carrito/renglones/{renglon_carrito}", 200, encabezados=CLI)
llamar("Renglón de carrito inexistente", "DELETE", f"/carrito/renglones/{uuid.uuid4()}", 404, encabezados=CLI)
r = llamar("Vaciar carrito", "DELETE", "/carrito", 200, encabezados=CLI)

# ----------------------------------------------------------------- seguridad
# Autenticación (Parte 1)
nuevo_cliente = {"nombre": "Paola Ríos", "correo": f"paola{secrets.randbelow(10**6)}@correo.mx", "telefono": "2225550101",
                 "contrasena": "Segura2026", "direccion": {"calle": "Reforma 300", "codigoPostal": "72000"},
                 "avisoPrivacidadAceptado": True}
r = llamar("Registro (alias de la actividad)", "POST", "/api/auth/register", 201, nuevo_cliente, encabezados={"Authorization": ""})
resultados.append(("   … la respuesta no trae contraseña ni hash",
                   not any(k in r.json() for k in ("contrasena", "password", "passwordHash", "password_hash")), r.text))
llamar("Contraseña de más de 72 bytes", "POST", "/api/auth/register", 422,
       {**nuevo_cliente, "correo": "largo@correo.mx", "contrasena": "Ñ1" * 40}, encabezados={"Authorization": ""})
r = llamar("Login (alias de la actividad)", "POST", "/api/auth/login", 200,
           {"correo": nuevo_cliente["correo"], "contrasena": "Segura2026"}, encabezados={"Authorization": ""})
t_nuevo = r.json()["token"]
carga = jwt.decode(t_nuevo, options={"verify_signature": False})
resultados.append(("   … JWT con exp explícito: 24 h para Cliente, rol y sub",
                   carga["exp"] - carga["iat"] == 24 * 3600 and carga["rol"] == "CLIENTE" and carga["sub"] == r.json()["usuario"]["id"],
                   str(carga)))
carga_d = jwt.decode(T_DUENA, options={"verify_signature": False})
resultados.append(("   … JWT de la Dueña dura 60 min", carga_d["exp"] - carga_d["iat"] == 3600, str(carga_d)))
r = llamar("Me (alias de la actividad)", "GET", "/api/auth/me", 200, encabezados=bearer(t_nuevo))
resultados.append(("   … devuelve al usuario del token", r.json().get("correo") == nuevo_cliente["correo"], r.text))
llamar("Me (ruta del contrato)", "GET", "/auth/yo", 200)
r = llamar("Contraseña incorrecta", "POST", "/auth/sesiones", 401, {"correo": "duena@tiendinet.mx", "contrasena": "Mala2026"},
           encabezados={"Authorization": ""})
r2 = llamar("Correo inexistente", "POST", "/auth/sesiones", 401, {"correo": "nadie@tiendinet.mx", "contrasena": "Mala2026"},
            encabezados={"Authorization": ""})
resultados.append(("   … mismo mensaje en los dos casos (no revela si el correo existe)", r.json() == r2.json(), r2.text))
for i in range(4):
    cx.post("/auth/sesiones", json={"correo": "nadie@tiendinet.mx", "contrasena": f"Mala{i}2026"}, headers={"Authorization": ""})
r = llamar("Sexto intento tras 5 fallos", "POST", "/auth/sesiones", 429, {"correo": "nadie@tiendinet.mx", "contrasena": "Mala2026"},
           encabezados={"Authorization": ""})
resultados.append(("   … 429 con reintentaEnSegundos (RF-01-AC-5)", 0 < r.json().get("reintentaEnSegundos", 0) <= 900, r.text))
llamar("Otro correo desde la misma IP no se bloquea", "POST", "/auth/sesiones", 200,
       {"correo": "duena@tiendinet.mx", "contrasena": "Tienda2026"}, encabezados={"Authorization": ""})

# Middleware (Parte 1 y 2)
r = llamar("Ruta protegida sin token", "GET", "/productos", 401, encabezados={"Authorization": ""})
resultados.append(("   … encabezado WWW-Authenticate: Bearer", r.headers.get("www-authenticate") == "Bearer", str(r.headers)))
llamar("Esquema distinto a Bearer", "GET", "/productos", 401, encabezados={"Authorization": f"Basic {T_DUENA}"})
alterado = T_DUENA[:-6] + ("A" if T_DUENA[-6] != "A" else "B") + T_DUENA[-5:]
r = llamar("Token con un carácter modificado", "GET", "/productos", 401, encabezados=bearer(alterado))
resultados.append(("   … TOKEN_INVALIDO", r.json().get("codigo") == "TOKEN_INVALIDO", r.text))
vencido = jwt.encode({"sub": carga_d["sub"], "rol": "DUENO", "correo": "duena@tiendinet.mx",
                      "iat": datetime.now(timezone.utc) - timedelta(hours=2),
                      "exp": datetime.now(timezone.utc) - timedelta(hours=1)}, SECRETO, algorithm="HS256")
r = llamar("Token expirado (firma correcta)", "GET", "/productos", 401, encabezados=bearer(vencido))
resultados.append(("   … TOKEN_EXPIRADO", r.json().get("codigo") == "TOKEN_EXPIRADO", r.text))
otro_secreto = jwt.encode({**carga_d}, "x" * 48, algorithm="HS256")
llamar("Token firmado con otro secreto", "GET", "/productos", 401, encabezados=bearer(otro_secreto))
sin_firma = jwt.encode({**carga_d}, None, algorithm="none")
llamar("Token con alg none", "GET", "/productos", 401, encabezados=bearer(sin_firma))
escalado = jwt.encode({**jwt.decode(T_EMPLEADO, options={"verify_signature": False}), "rol": "DUENO"}, "y" * 48, algorithm="HS256")
llamar("Empleado que se cambia el rol a DUENO en el token", "GET", "/productos", 401, encabezados=bearer(escalado))

# Roles (Parte 2)
llamar("Empleado en ruta de Dueño", "GET", "/productos", 403, encabezados=EMP)
llamar("Empleado pide el costo (RF-01-AC-3)", "GET", f"/productos/{leche_id}/costo", 403, encabezados=EMP)
llamar("Empleado cambia configuración", "PATCH", "/configuracion", 403, {"diasSeguridad": 5}, encabezados=EMP)
llamar("Empleado en ruta de tienda", "GET", "/pos/productos?q=leche", 200, encabezados=EMP)
llamar("Cliente en ruta de tienda", "POST", "/ventas", 403, encabezados=CLI)
llamar("Cliente crea producto", "POST", "/productos", 403, {**pan, "nombre": "Pan integral"}, encabezados=CLI)
llamar("Dueña en el carrito (solo Cliente)", "GET", "/carrito", 403)
llamar("Cliente en su carrito", "GET", "/carrito", 200, encabezados=CLI)

# Activación de una cuenta de la tienda (token de un solo uso)
nueva = llamar("Dueña crea un empleado", "POST", "/usuarios", 201,
               {"nombre": "Diego Luna", "correo": "diego@tiendinet.mx", "rol": "EMPLEADO"}).json()
enlace = secrets.token_urlsafe(32)
with psycopg.connect(DSN) as db:  # simula el correo: se guarda solo el hash, como hace la API
    db.execute("UPDATE token_cuenta SET token_hash = %s WHERE usuario_id = %s",
               (hashlib.sha256(enlace.encode()).hexdigest(), nueva["id"]))
llamar("Login antes de activar", "POST", "/auth/sesiones", 401, {"correo": "diego@tiendinet.mx", "contrasena": "Empleado2026"},
       encabezados={"Authorization": ""})
llamar("Activar la cuenta", "POST", "/usuarios/activacion", 200, {"token": enlace, "contrasena": "Empleado2026"},
       encabezados={"Authorization": ""})
llamar("Reusar el enlace", "POST", "/usuarios/activacion", 422, {"token": enlace, "contrasena": "Otra2026x"},
       encabezados={"Authorization": ""})
llamar("Login después de activar", "POST", "/auth/sesiones", 200, {"correo": "diego@tiendinet.mx", "contrasena": "Empleado2026"},
       encabezados={"Authorization": ""})

# --------------------------------------------------------------- persistencia
with psycopg.connect(DSN) as db:
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
        ("Contraseñas guardadas con bcrypt ($2b$, costo 12)",
         uno("SELECT bool_and(password_hash LIKE '$2b$12$%%') FROM usuario WHERE password_hash IS NOT NULL")),
        ("Ningún token de activación en claro", uno("SELECT bool_and(length(token_hash) = 64) FROM token_cuenta")),
        ("Intentos de login registrados", uno("SELECT count(*) FROM intento_inicio_sesion WHERE NOT exitoso") >= 7),
    ]
    for nombre, ok in checks:
        resultados.append((f"BD   {nombre}", ok, "no coincide"))

fallas = [r for r in resultados if not r[1]]
for texto, ok, problema in resultados:
    print(("OK    " if ok else "FALLA ") + texto + ("" if ok else f"\n        {problema}"))
peticiones = sum(1 for r in resultados if not r[0].startswith(("   ", "BD")))
print(f"\n{len(resultados) - len(fallas)}/{len(resultados)} verificaciones correctas ({peticiones} peticiones).")
sys.exit(1 if fallas else 0)
