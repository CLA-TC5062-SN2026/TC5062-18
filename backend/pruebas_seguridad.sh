#!/usr/bin/env bash
# Pruebas manuales de protección de rutas (S05-S06-A2, Parte 2).
# Uso: ./pruebas_seguridad.sh [URL_BASE]   (la API debe estar corriendo con datos_prueba.sql)
B=${1:-http://localhost:8000}
RUTA=/proveedores   # ruta del Dueño en el contrato (security: bearerAuth, "Roles Dueño")

token() {
  curl -s -X POST "$B/auth/sesiones" -H "Content-Type: application/json" \
       -d "{\"correo\":\"$1\",\"contrasena\":\"Tienda2026\"}" | sed -E 's/.*"token":"([^"]+)".*/\1/'
}
caso() {  # $1 = descripción, $2 = encabezado Authorization (vacío = sin encabezado)
  echo "### $1"
  if [ -z "$2" ]; then
    echo "\$ curl $B$RUTA"
    curl -s -w "  -> HTTP %{http_code}\n\n" "$B$RUTA"
  else
    echo "\$ curl -H \"Authorization: ${2:0:40}…\" $B$RUTA"
    curl -s -w "  -> HTTP %{http_code}\n\n" -H "Authorization: $2" "$B$RUTA"
  fi
}

DUENA=$(token duena@tiendinet.mx)
EMPLEADO=$(token empleado@tiendinet.mx)
# Token inválido: se cambia un carácter de la firma (último bloque del JWT).
ULTIMO=${DUENA: -1}; [ "$ULTIMO" = "A" ] && OTRO=B || OTRO=A
ALTERADO="${DUENA%?}$OTRO"

caso "1. Sin token -> 401"                         ""
caso "2. Token con un carácter cambiado -> 401"    "Bearer $ALTERADO"
caso "3. Token válido de Empleado (rol incorrecto) -> 403" "Bearer $EMPLEADO"
caso "4. Token válido de Dueña (rol correcto) -> 200"     "Bearer $DUENA"
