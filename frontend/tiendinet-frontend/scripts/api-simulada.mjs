// API simulada de TiendiNet SOLO PARA DEMOSTRACIONES (Codespaces, video, pruebas manuales).
// Responde con la forma de contrato/openapi_equipo.yaml para los endpoints que usan las
// pantallas actuales. No guarda nada y no sustituye al backend FastAPI.
//
//   npm run api:simulada        → http://localhost:8000
//
// Usuarios de prueba (contraseña: Demo1234):
//   duena@tiendinet.local     Dueño
//   empleado@tiendinet.local  Empleado

import { createServer } from 'node:http'

const PUERTO = Number(process.env.PUERTO_API_SIMULADA ?? 8000)
const CONTRASENA = 'Demo1234'
const USUARIOS = {
  'duena@tiendinet.local': { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', nombre: 'Ana Ramírez', rol: 'DUENO' },
  'empleado@tiendinet.local': { id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', nombre: 'Luis Pérez', rol: 'EMPLEADO' },
}
const sesiones = new Map() // token → correo

const CATALOGO = [
  { id: 'p1', nombre: 'Aceite vegetal', presentacion: '1 L', categoria: 'Abarrotes', precioVenta: '38.50', disponibilidad: 'DISPONIBLE', perecedero: false },
  { id: 'p2', nombre: 'Leche entera', presentacion: '1 L', categoria: 'Lácteos', precioVenta: '28.50', disponibilidad: 'DISPONIBLE', perecedero: true },
  { id: 'p3', nombre: 'Frijol negro', presentacion: '1 kg', categoria: 'Abarrotes', precioVenta: '32.00', disponibilidad: 'AGOTADO', perecedero: false },
  { id: 'p4', nombre: 'Tortillas de maíz', presentacion: '1 kg', categoria: 'Tortillería', precioVenta: '24.00', disponibilidad: 'DISPONIBLE', perecedero: true },
]
const ALERTAS = [
  { id: 'a1', tipo: 'REORDEN', estado: 'ACTIVA', fecha: new Date().toISOString(), productoId: 'p1', nombreProducto: 'Aceite vegetal 1 L', existenciaDisponible: 3, puntoReorden: 10, cantidadSugerida: 14 },
  { id: 'a2', tipo: 'REORDEN', estado: 'ACTIVA', fecha: new Date().toISOString(), productoId: 'p3', nombreProducto: 'Frijol negro 1 kg', existenciaDisponible: 0, puntoReorden: 8, cantidadSugerida: 12 },
]

function responder(res, estado, cuerpo) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(cuerpo === undefined ? '' : JSON.stringify(cuerpo))
}

function leerCuerpo(req) {
  return new Promise((resolver) => {
    let datos = ''
    req.on('data', (c) => (datos += c))
    req.on('end', () => {
      try {
        resolver(datos ? JSON.parse(datos) : {})
      } catch {
        resolver(null)
      }
    })
  })
}

function usuarioDeSesion(req) {
  const [, token] = (req.headers.authorization ?? '').split(' ')
  const correo = sesiones.get(token)
  return correo ? { correo, ...USUARIOS[correo] } : null
}

const resumen = (u) => ({ id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, estado: 'ACTIVO' })
const NO_AUTORIZADO = { mensaje: 'Correo o contraseña incorrectos', codigo: 'NO_AUTORIZADO' }

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const ruta = url.pathname.replace(/\/$/, '') || '/'
  console.log(`${new Date().toLocaleTimeString('es-MX')}  ${req.method} ${ruta}`)

  // Públicos
  if (req.method === 'POST' && ruta === '/auth/sesiones') {
    const cuerpo = await leerCuerpo(req)
    if (!cuerpo) return responder(res, 400, { mensaje: 'El cuerpo de la petición no es JSON válido.', codigo: 'PETICION_INVALIDA' })
    const u = USUARIOS[cuerpo.correo]
    if (!u || cuerpo.contrasena !== CONTRASENA) {
      return responder(res, 401, { mensaje: 'Correo o contraseña incorrectos', codigo: 'CREDENCIALES_INVALIDAS' })
    }
    const token = `demo.${crypto.randomUUID()}`
    sesiones.set(token, cuerpo.correo)
    return responder(res, 200, {
      token,
      tipo: 'Bearer',
      expiraEn: new Date(Date.now() + 60 * 60_000).toISOString(),
      usuario: resumen({ correo: cuerpo.correo, ...u }),
    })
  }
  if (req.method === 'GET' && ruta === '/catalogo') {
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    const datos = CATALOGO.filter((p) => p.nombre.toLowerCase().includes(q))
    return responder(res, 200, { datos, pagina: 1, tamano: 20, total: datos.length })
  }

  // Protegidos (Dueño y Empleado)
  const usuario = usuarioDeSesion(req)
  if (!usuario) return responder(res, 401, NO_AUTORIZADO)

  if (req.method === 'GET' && ruta === '/auth/yo') return responder(res, 200, resumen(usuario))
  if (req.method === 'GET' && ruta === '/alertas') {
    return responder(res, 200, { datos: ALERTAS, pagina: 1, tamano: 20, total: ALERTAS.length })
  }
  if (req.method === 'GET' && ruta === '/cortes-caja/vista-previa') {
    return responder(res, 200, {
      fecha: new Date().toISOString().slice(0, 10),
      efectivoEsperado: '1250.50',
      totalTarjeta: '300.00',
      ventasEnLineaExcluidas: true,
    })
  }
  return responder(res, 404, { mensaje: 'No encontrado (la API simulada solo cubre login y dashboard)', codigo: 'NO_ENCONTRADO' })
})

servidor.listen(PUERTO, () => {
  console.log(`API simulada de TiendiNet en http://localhost:${PUERTO}`)
  console.log(`Usuarios: ${Object.keys(USUARIOS).join(', ')}  ·  contraseña: ${CONTRASENA}`)
})
