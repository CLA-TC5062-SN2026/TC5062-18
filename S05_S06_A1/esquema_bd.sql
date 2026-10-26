-- =====================================================================
-- TiendiNet · Esquema físico de la base concentradora
-- Manejador: PostgreSQL 16
-- Fuentes: diagrama_clases_equipo.puml y openapi_equipo.yaml (v2.0.0)
-- Revisión del equipo: revision_sql.md
--
-- Convenciones
--   * Tablas y columnas en snake_case. El ORM las expone en camelCase,
--     con los nombres de los schemas del contrato (precio_venta -> precioVenta).
--   * Llaves primarias UUID generadas por la base (gen_random_uuid()).
--   * Dinero en NUMERIC(12,2). El contrato lo transporta como texto "38.50".
--   * Enumeraciones del contrato como VARCHAR + CHECK con los mismos valores.
--   * Fechas con hora en TIMESTAMPTZ (UTC). Fechas sin hora en DATE.
--   * Los atributos derivados del diagrama (/existenciaFisica, /apartado,
--     /existenciaDisponible, /caducado, /costoPorUnidadBase, /vigente,
--     /puedeReintentar, /codigosPostalesEntrega) NO son columnas: se
--     calculan en consultas para que no se desincronicen.
--   * Nada se borra físicamente si tiene historial (RNF-14): no hay
--     ON DELETE CASCADE salvo en partes de una composición.
--
-- Uso:  psql -U tiendinet -d tiendinet -f esquema_bd.sql
-- =====================================================================

BEGIN;

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- ---------------------------------------------------------------------
-- Extensiones y tipos de apoyo
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- búsqueda parcial por nombre (RF-15)
CREATE EXTENSION IF NOT EXISTS unaccent;   -- sin distinguir acentos (RF-15)

-- unaccent() no es IMMUTABLE; este envoltorio permite usarlo en índices.
CREATE FUNCTION f_normaliza(texto TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, btrim(texto))) $$;

CREATE DOMAIN dinero           AS NUMERIC(12,2) CHECK (VALUE >= 0);
CREATE DOMAIN dinero_con_signo AS NUMERIC(12,2);
CREATE DOMAIN codigo_postal    AS CHAR(5)       CHECK (VALUE ~ '^[0-9]{5}$');

-- Folios y códigos visibles. La llave real de cada tabla es el UUID.
CREATE SEQUENCE seq_codigo_interno;   -- PRD-000001
CREATE SEQUENCE seq_folio_venta;      -- VTA-000001, se asigna al confirmar
CREATE SEQUENCE seq_folio_pedido;     -- PED-000001

-- =====================================================================
-- Paquete administracion
-- =====================================================================

-- Una sola configuración en el MVP: la fila id = 1.
CREATE TABLE configuracion_tienda (
    id                           SMALLINT     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    dias_seguridad               SMALLINT     NOT NULL CHECK (dias_seguridad BETWEEN 0 AND 14),
    pedido_minimo_envio          dinero       NOT NULL,
    costo_envio                  dinero       NOT NULL,
    horario_inicio               TIME         NOT NULL,
    horario_fin                  TIME         NOT NULL,
    hora_limite_mismo_dia        TIME         NOT NULL,
    dias_aviso_caducidad         SMALLINT     NOT NULL CHECK (dias_aviso_caducidad >= 0),
    plazo_respuesta_faltante_min INTEGER      NOT NULL CHECK (plazo_respuesta_faltante_min >= 1),
    CONSTRAINT ck_config_horario CHECK (horario_fin > horario_inicio),
    CONSTRAINT ck_config_hora_limite CHECK (hora_limite_mismo_dia BETWEEN horario_inicio AND horario_fin)
);

CREATE TABLE codigo_postal_entrega (
    codigo           codigo_postal PRIMARY KEY,
    configuracion_id SMALLINT      NOT NULL DEFAULT 1 REFERENCES configuracion_tienda (id),
    activo           BOOLEAN       NOT NULL DEFAULT TRUE
);

-- =====================================================================
-- Paquete acceso
-- Herencia Usuario <|-- UsuarioTienda, Cliente: una tabla por clase.
-- La columna tipo + la FK compuesta (usuario_id, tipo) impiden que un
-- mismo usuario sea a la vez de la tienda y cliente.
-- =====================================================================

CREATE TABLE usuario (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo          VARCHAR(10)  NOT NULL CHECK (tipo IN ('TIENDA', 'CLIENTE')),
    nombre        VARCHAR(120) NOT NULL CHECK (btrim(nombre) <> ''),
    correo        VARCHAR(254) NOT NULL CHECK (correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    password_hash VARCHAR(255),
    estado        VARCHAR(10)  NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    CONSTRAINT uq_usuario_id_tipo UNIQUE (id, tipo),
    -- Un usuario de la tienda nace INACTIVO y sin contraseña hasta activarse (RF-03-AC-1).
    CONSTRAINT ck_usuario_activo_con_password CHECK (estado = 'INACTIVO' OR password_hash IS NOT NULL)
);
-- Correo único sin distinguir mayúsculas (409 de RF-02 y RF-03).
CREATE UNIQUE INDEX ux_usuario_correo ON usuario (lower(correo));
CREATE INDEX ix_usuario_nombre ON usuario (f_normaliza(nombre));

CREATE TABLE usuario_tienda (
    usuario_id         UUID        PRIMARY KEY,
    tipo               VARCHAR(10) NOT NULL DEFAULT 'TIENDA' CHECK (tipo = 'TIENDA'),
    rol                VARCHAR(10) NOT NULL CHECK (rol IN ('DUENO', 'EMPLEADO')),
    activacion_enviada BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_usuario_tienda_usuario FOREIGN KEY (usuario_id, tipo) REFERENCES usuario (id, tipo)
);
CREATE INDEX ix_usuario_tienda_rol ON usuario_tienda (rol);

CREATE TABLE cliente (
    usuario_id                UUID          PRIMARY KEY,
    tipo                      VARCHAR(10)   NOT NULL DEFAULT 'CLIENTE' CHECK (tipo = 'CLIENTE'),
    telefono                  CHAR(10)      NOT NULL CHECK (telefono ~ '^[0-9]{10}$'),
    -- Objeto de valor Direccion embebido.
    calle                     VARCHAR(200)  NOT NULL CHECK (btrim(calle) <> ''),
    codigo_postal             codigo_postal NOT NULL,
    -- RF-02: sin aceptar el aviso no hay cuenta.
    aviso_privacidad_aceptado BOOLEAN       NOT NULL CHECK (aviso_privacidad_aceptado),
    CONSTRAINT fk_cliente_usuario FOREIGN KEY (usuario_id, tipo) REFERENCES usuario (id, tipo)
);

-- Enlaces de un solo uso: activación de cuentas de la tienda (RF-03-AC-1)
-- y recuperación de contraseña de clientes, 30 minutos (RF-02-AC-3).
CREATE TABLE token_cuenta (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID        NOT NULL REFERENCES usuario (id),
    proposito  VARCHAR(12) NOT NULL CHECK (proposito IN ('ACTIVACION', 'RECUPERACION')),
    token_hash CHAR(64)    NOT NULL UNIQUE,          -- SHA-256 del token; el token en claro no se guarda
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_en  TIMESTAMPTZ NOT NULL,
    usado_en   TIMESTAMPTZ,
    CONSTRAINT ck_token_vigencia CHECK (expira_en > creado_en)
);
CREATE INDEX ix_token_cuenta_usuario ON token_cuenta (usuario_id, proposito);

-- Intentos de inicio de sesión: 5 fallos de correo + IP bloquean 15 min (RF-01-AC-5).
CREATE TABLE intento_inicio_sesion (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    correo     VARCHAR(254) NOT NULL,
    ip         INET         NOT NULL,
    exitoso    BOOLEAN      NOT NULL,
    fecha_hora TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_intento_correo_ip ON intento_inicio_sesion (lower(correo), ip, fecha_hora DESC);

-- Auditoría polimórfica (entidad + entidad_id). Usuario nulo si la escribe el worker.
CREATE TABLE registro_auditoria (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id     UUID        REFERENCES usuario (id),
    fecha_hora     TIMESTAMPTZ NOT NULL DEFAULT now(),
    operacion      VARCHAR(60) NOT NULL,
    entidad        VARCHAR(60) NOT NULL,
    entidad_id     VARCHAR(64) NOT NULL,
    valor_anterior JSONB,
    valor_nuevo    JSONB,
    resultado      VARCHAR(20) NOT NULL CHECK (resultado IN ('EXITO', 'RECHAZADO', 'ERROR'))
);
CREATE INDEX ix_auditoria_entidad ON registro_auditoria (entidad, entidad_id);
CREATE INDEX ix_auditoria_fecha ON registro_auditoria (fecha_hora DESC);
CREATE INDEX ix_auditoria_usuario ON registro_auditoria (usuario_id);

-- RNF-07: la auditoría es de solo inserción.
CREATE FUNCTION fn_auditoria_solo_insercion() RETURNS trigger
LANGUAGE plpgsql AS
$$ BEGIN RAISE EXCEPTION 'registro_auditoria es de solo inserción (RNF-07)'; END $$;

CREATE TRIGGER trg_auditoria_sin_cambios
    BEFORE UPDATE OR DELETE ON registro_auditoria
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria_solo_insercion();
CREATE TRIGGER trg_auditoria_sin_truncate
    BEFORE TRUNCATE ON registro_auditoria
    FOR EACH STATEMENT EXECUTE FUNCTION fn_auditoria_solo_insercion();

-- Idempotency-Key de los POST que cobran o mueven existencia. Vive 24 h.
CREATE TABLE registro_idempotencia (
    clave            UUID        PRIMARY KEY,
    usuario_id       UUID        REFERENCES usuario (id),
    operacion        VARCHAR(60) NOT NULL,
    hash_cuerpo      CHAR(64)    NOT NULL,           -- SHA-256 del cuerpo de la petición
    estado           VARCHAR(12) NOT NULL DEFAULT 'EN_PROCESO' CHECK (estado IN ('EN_PROCESO', 'COMPLETADA')),
    codigo_respuesta SMALLINT    CHECK (codigo_respuesta BETWEEN 100 AND 599),
    cuerpo_respuesta JSONB,
    creada_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_en        TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
    CONSTRAINT ck_idempotencia_completada CHECK (estado = 'EN_PROCESO' OR codigo_respuesta IS NOT NULL)
);
CREATE INDEX ix_idempotencia_expira ON registro_idempotencia (expira_en);

-- =====================================================================
-- Paquete proveedores (primera parte: Proveedor, que usa inventario)
-- =====================================================================

CREATE TABLE proveedor (
    id     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(120) NOT NULL CHECK (btrim(nombre) <> ''),
    tipo   VARCHAR(12)  NOT NULL CHECK (tipo IN ('CON_BD', 'MANUAL_RUTA', 'OTRO_RUTA')),
    activo BOOLEAN      NOT NULL DEFAULT TRUE
);
-- 409 "Ya existe un proveedor activo con ese nombre".
CREATE UNIQUE INDEX ux_proveedor_nombre_activo ON proveedor (f_normaliza(nombre)) WHERE activo;

-- =====================================================================
-- Paquete inventario
-- =====================================================================

CREATE TABLE producto (
    id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_interno         VARCHAR(12)  NOT NULL UNIQUE
                                        DEFAULT ('PRD-' || lpad(nextval('seq_codigo_interno')::text, 6, '0')),
    codigo_barras          CHAR(13)     UNIQUE CHECK (codigo_barras ~ '^[0-9]{13}$'),
    nombre                 VARCHAR(150) NOT NULL CHECK (btrim(nombre) <> ''),
    presentacion           VARCHAR(80)  NOT NULL CHECK (btrim(presentacion) <> ''),
    categoria              VARCHAR(80)  NOT NULL CHECK (btrim(categoria) <> ''),
    precio_venta           dinero       NOT NULL,
    costo_referencia       dinero       NOT NULL,
    pr_inicial             INTEGER      NOT NULL CHECK (pr_inicial >= 0),
    pr_vigente             INTEGER      NOT NULL CHECK (pr_vigente >= 0),
    origen_pr              VARCHAR(10)  NOT NULL DEFAULT 'INICIAL'
                                        CHECK (origen_pr IN ('INICIAL', 'CALCULADO', 'MANUAL')),
    pr_manual              INTEGER      CHECK (pr_manual >= 0),
    vigencia_pr_manual     DATE,
    dias_entrega_respaldo  INTEGER      CHECK (dias_entrega_respaldo >= 1),
    proveedor_preferido_id UUID         REFERENCES proveedor (id),
    perecedero             BOOLEAN      NOT NULL,
    restringido            BOOLEAN      NOT NULL,
    estado                 VARCHAR(10)  NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    marca_descuadre        BOOLEAN      NOT NULL DEFAULT FALSE,
    -- El PR manual siempre lleva su vigencia (RF-08-AC-5).
    CONSTRAINT ck_producto_pr_manual CHECK ((pr_manual IS NULL) = (vigencia_pr_manual IS NULL)),
    CONSTRAINT ck_producto_origen_manual CHECK (origen_pr <> 'MANUAL' OR pr_manual IS NOT NULL)
);
-- 409 de RF-04: mismo nombre + presentación sin distinguir mayúsculas, acentos ni espacios extremos.
CREATE UNIQUE INDEX ux_producto_nombre_presentacion ON producto (f_normaliza(nombre), f_normaliza(presentacion));
-- Búsqueda parcial del POS y del catálogo sin mayúsculas ni acentos (RF-15-AC-1, RF-21).
CREATE INDEX ix_producto_nombre_trgm ON producto USING gin (f_normaliza(nombre) gin_trgm_ops);
CREATE INDEX ix_producto_categoria ON producto (categoria);
CREATE INDEX ix_producto_estado ON producto (estado) WHERE estado = 'ACTIVO';
CREATE INDEX ix_producto_proveedor_preferido ON producto (proveedor_preferido_id);

-- La tabla oferta va aquí porque lote la referencia.
CREATE TABLE oferta (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor_id         UUID         NOT NULL REFERENCES proveedor (id),
    producto_id          UUID         REFERENCES producto (id),
    origen               VARCHAR(12)  NOT NULL CHECK (origen IN ('SINCRONIZADA', 'MANUAL')),
    codigo_proveedor     VARCHAR(40),
    presentacion         VARCHAR(80)  NOT NULL CHECK (btrim(presentacion) <> ''),
    factor_conversion    INTEGER      NOT NULL CHECK (factor_conversion >= 1),
    costo                dinero       NOT NULL,
    existencia_proveedor INTEGER      NOT NULL CHECK (existencia_proveedor >= 0),
    dias_entrega         INTEGER      NOT NULL CHECK (dias_entrega >= 1),
    fecha_actualizacion  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_oferta_sincronizada_codigo CHECK (origen <> 'SINCRONIZADA' OR codigo_proveedor IS NOT NULL),
    CONSTRAINT ck_oferta_manual_producto CHECK (origen <> 'MANUAL' OR producto_id IS NOT NULL)
);
-- Una sincronización reemplaza la oferta del mismo código, no la duplica.
CREATE UNIQUE INDEX ux_oferta_proveedor_codigo ON oferta (proveedor_id, codigo_proveedor)
    WHERE origen = 'SINCRONIZADA';
CREATE INDEX ix_oferta_producto ON oferta (producto_id);

CREATE TABLE lote (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id     UUID        NOT NULL REFERENCES producto (id),
    cantidad        INTEGER     NOT NULL CHECK (cantidad >= 0),
    fecha_caducidad DATE,
    costo_unitario  dinero,
    proveedor_id    UUID        REFERENCES proveedor (id),
    oferta_id       UUID        REFERENCES oferta (id),
    recibido_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- FEFO: primero el que caduca antes; sin caducidad al final; empate por antigüedad.
CREATE INDEX ix_lote_fefo ON lote (producto_id, fecha_caducidad NULLS LAST, recibido_en) WHERE cantidad > 0;
CREATE INDEX ix_lote_caducidad ON lote (fecha_caducidad) WHERE cantidad > 0;

CREATE TABLE movimiento_inventario (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo              VARCHAR(16) NOT NULL CHECK (tipo IN ('RECEPCION', 'VENTA', 'MERMA', 'CONTEO',
                                                           'CANCELACION', 'ENTREGA_PEDIDO')),
    producto_id       UUID        NOT NULL REFERENCES producto (id),
    lote_id           UUID        REFERENCES lote (id),
    cantidad          INTEGER     NOT NULL CHECK (cantidad >= 0),
    cantidad_anterior INTEGER     NOT NULL CHECK (cantidad_anterior >= 0),
    cantidad_nueva    INTEGER     NOT NULL CHECK (cantidad_nueva >= 0),
    motivo            VARCHAR(200),
    usuario_id        UUID        NOT NULL REFERENCES usuario_tienda (usuario_id),
    fecha_hora        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_movimiento_producto_fecha ON movimiento_inventario (producto_id, fecha_hora DESC);
CREATE INDEX ix_movimiento_lote ON movimiento_inventario (lote_id);

CREATE TABLE recepcion (
    id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id           UUID    NOT NULL REFERENCES producto (id),
    proveedor_id          UUID    NOT NULL REFERENCES proveedor (id),
    lote_id               UUID    NOT NULL UNIQUE REFERENCES lote (id),
    movimiento_id         UUID    NOT NULL UNIQUE REFERENCES movimiento_inventario (id),
    cantidad              INTEGER NOT NULL CHECK (cantidad >= 1),
    existencia_fisica     INTEGER NOT NULL CHECK (existencia_fisica >= 0),
    existencia_disponible INTEGER NOT NULL CHECK (existencia_disponible >= 0),
    costo_ignorado        BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX ix_recepcion_producto ON recepcion (producto_id);

CREATE TABLE ajuste (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo              VARCHAR(6)   NOT NULL CHECK (tipo IN ('MERMA', 'CONTEO')),
    producto_id       UUID         NOT NULL REFERENCES producto (id),
    lote_id           UUID         REFERENCES lote (id),
    cantidad_anterior INTEGER      NOT NULL CHECK (cantidad_anterior >= 0),
    cantidad_nueva    INTEGER      NOT NULL CHECK (cantidad_nueva >= 0),
    delta             INTEGER      NOT NULL,
    motivo            VARCHAR(200) NOT NULL CHECK (btrim(motivo) <> ''),
    cuenta_para_cdp   BOOLEAN      NOT NULL DEFAULT FALSE,
    marca_descuadre   BOOLEAN      NOT NULL DEFAULT FALSE,
    usuario_id        UUID         NOT NULL REFERENCES usuario_tienda (usuario_id),
    fecha_hora        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_ajuste_delta CHECK (delta = cantidad_nueva - cantidad_anterior),
    -- La merma descuenta de un lote indicado y no cuenta para el CDP (RF-06).
    CONSTRAINT ck_ajuste_merma CHECK (tipo <> 'MERMA' OR (lote_id IS NOT NULL AND delta < 0 AND NOT cuenta_para_cdp))
);
CREATE INDEX ix_ajuste_producto_fecha ON ajuste (producto_id, fecha_hora DESC);

CREATE TABLE alerta (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo                  VARCHAR(10) NOT NULL CHECK (tipo IN ('REORDEN', 'CADUCIDAD')),
    estado                VARCHAR(10) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'RESUELTA')),
    producto_id           UUID        REFERENCES producto (id),
    lote_id               UUID        REFERENCES lote (id),
    existencia_disponible INTEGER     CHECK (existencia_disponible >= 0),
    punto_reorden         INTEGER     CHECK (punto_reorden >= 0),
    cantidad_sugerida     INTEGER     CHECK (cantidad_sugerida >= 0),
    proveedor_sugerido_id UUID        REFERENCES proveedor (id),
    fecha                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_alerta_objetivo CHECK (
        (tipo = 'REORDEN'   AND producto_id IS NOT NULL) OR
        (tipo = 'CADUCIDAD' AND lote_id     IS NOT NULL))
);
-- A lo más una alerta ACTIVA de reorden por producto (RF-09-AC-4) y una de caducidad por lote.
CREATE UNIQUE INDEX ux_alerta_reorden_activa ON alerta (producto_id) WHERE tipo = 'REORDEN' AND estado = 'ACTIVA';
CREATE UNIQUE INDEX ux_alerta_caducidad_activa ON alerta (lote_id) WHERE tipo = 'CADUCIDAD' AND estado = 'ACTIVA';
CREATE INDEX ix_alerta_tipo_estado ON alerta (tipo, estado, fecha DESC);

-- =====================================================================
-- Paquete proveedores (sincronización y compras)
-- =====================================================================

CREATE TABLE sincronizacion (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ejecutada_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- La sincronización nunca cambia precios de venta (RF-10-AC-3).
    precios_venta_modificados INTEGER     NOT NULL DEFAULT 0 CHECK (precios_venta_modificados = 0)
);
CREATE INDEX ix_sincronizacion_fecha ON sincronizacion (ejecutada_en DESC);

CREATE TABLE resultado_proveedor_sync (
    sincronizacion_id           UUID         NOT NULL REFERENCES sincronizacion (id) ON DELETE CASCADE,
    proveedor_id                UUID         NOT NULL REFERENCES proveedor (id),
    ofertas_cargadas            INTEGER      NOT NULL DEFAULT 0 CHECK (ofertas_cargadas >= 0),
    ofertas_rechazadas          INTEGER      NOT NULL DEFAULT 0 CHECK (ofertas_rechazadas >= 0),
    error_conexion              VARCHAR(300),
    ofertas_previas_conservadas BOOLEAN      NOT NULL DEFAULT FALSE,
    PRIMARY KEY (sincronizacion_id, proveedor_id),
    -- Si falló la conexión, las ofertas previas se conservan (RF-10-AC-5).
    CONSTRAINT ck_resultado_error CHECK (error_conexion IS NULL OR ofertas_previas_conservadas)
);

CREATE TABLE rechazo_oferta (
    id                BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sincronizacion_id UUID         NOT NULL,
    proveedor_id      UUID         NOT NULL,
    codigo            VARCHAR(40)  NOT NULL,
    motivo            VARCHAR(200) NOT NULL,
    FOREIGN KEY (sincronizacion_id, proveedor_id)
        REFERENCES resultado_proveedor_sync (sincronizacion_id, proveedor_id) ON DELETE CASCADE
);
CREATE INDEX ix_rechazo_resultado ON rechazo_oferta (sincronizacion_id, proveedor_id);

CREATE TABLE vinculacion_pendiente (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor_id         UUID         NOT NULL REFERENCES proveedor (id),
    codigo_proveedor     VARCHAR(40)  NOT NULL,
    nombre               VARCHAR(150) NOT NULL,
    presentacion         VARCHAR(80)  NOT NULL,
    factor_conversion    INTEGER      CHECK (factor_conversion >= 1),
    costo                dinero,
    existencia_proveedor INTEGER      CHECK (existencia_proveedor >= 0),
    dias_entrega         INTEGER      CHECK (dias_entrega >= 1),
    CONSTRAINT uq_vinculacion_proveedor_codigo UNIQUE (proveedor_id, codigo_proveedor)
);

CREATE TABLE propuesta_compra (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id            UUID        NOT NULL REFERENCES usuario_tienda (usuario_id),
    creada_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- La propuesta no se envía ni mueve existencia (RF-14).
    inventario_modificado BOOLEAN     NOT NULL DEFAULT FALSE CHECK (NOT inventario_modificado),
    enviada_al_proveedor  BOOLEAN     NOT NULL DEFAULT FALSE CHECK (NOT enviada_al_proveedor)
);
CREATE INDEX ix_propuesta_fecha ON propuesta_compra (creada_en DESC);

CREATE TABLE renglon_propuesta (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    propuesta_id        UUID    NOT NULL REFERENCES propuesta_compra (id) ON DELETE CASCADE,
    producto_id         UUID    NOT NULL REFERENCES producto (id),
    cantidad_sugerida   INTEGER NOT NULL CHECK (cantidad_sugerida >= 0),
    cantidad_confirmada INTEGER NOT NULL CHECK (cantidad_confirmada >= 1),
    proveedor_id        UUID    REFERENCES proveedor (id),   -- nulo: "Sin proveedor con existencia"
    costo_estimado      dinero  NOT NULL,
    CONSTRAINT uq_renglon_propuesta_producto UNIQUE (propuesta_id, producto_id)
);

-- =====================================================================
-- Paquete pos
-- =====================================================================

CREATE TABLE corte_caja (
    id                       UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha                    DATE             NOT NULL,
    fecha_hora               TIMESTAMPTZ      NOT NULL DEFAULT now(),
    usuario_id               UUID             NOT NULL REFERENCES usuario_tienda (usuario_id),
    efectivo_esperado        dinero           NOT NULL,
    efectivo_contado         dinero           NOT NULL,
    diferencia               dinero_con_signo NOT NULL,
    total_tarjeta            dinero           NOT NULL,
    ventas_en_linea_excluidas BOOLEAN         NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_corte_diferencia CHECK (diferencia = efectivo_contado - efectivo_esperado)
);
CREATE INDEX ix_corte_fecha ON corte_caja (fecha DESC, fecha_hora DESC);

CREATE TABLE venta (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    folio                  VARCHAR(12) UNIQUE CHECK (folio ~ '^VTA-[0-9]{6,}$'),
    estado                 VARCHAR(10) NOT NULL DEFAULT 'BORRADOR'
                                       CHECK (estado IN ('BORRADOR', 'COMPLETADA', 'CANCELADA')),
    diferida               BOOLEAN     NOT NULL DEFAULT FALSE,
    forma_pago             VARCHAR(16) CHECK (forma_pago IN ('EFECTIVO', 'TARJETA_TERMINAL')),
    total                  dinero      NOT NULL DEFAULT 0,
    monto_recibido         dinero,
    cambio                 dinero,
    usuario_responsable_id UUID        NOT NULL REFERENCES usuario_tienda (usuario_id),
    fecha_hora             TIMESTAMPTZ,
    corte_id               UUID        REFERENCES corte_caja (id),
    -- El borrador no tiene folio, forma de pago ni corte.
    CONSTRAINT ck_venta_borrador CHECK (
        estado <> 'BORRADOR' OR (folio IS NULL AND forma_pago IS NULL AND corte_id IS NULL AND NOT diferida)),
    -- Completada o cancelada: folio, forma de pago y fecha son obligatorios (RF-16, RF-18-AC-4).
    CONSTRAINT ck_venta_confirmada CHECK (
        estado = 'BORRADOR' OR (folio IS NOT NULL AND forma_pago IS NOT NULL AND fecha_hora IS NOT NULL)),
    -- Con tarjeta de la terminal no hay monto recibido ni cambio (RF-16-AC-4).
    CONSTRAINT ck_venta_tarjeta CHECK (
        forma_pago IS DISTINCT FROM 'TARJETA_TERMINAL' OR (monto_recibido IS NULL AND cambio IS NULL)),
    -- En efectivo el recibido cubre el total y el cambio cuadra (RF-16-AC-3).
    CONSTRAINT ck_venta_efectivo CHECK (
        monto_recibido IS NULL OR (monto_recibido >= total AND cambio = monto_recibido - total)),
    CONSTRAINT ck_venta_efectivo_mostrador CHECK (
        estado = 'BORRADOR' OR diferida OR forma_pago <> 'EFECTIVO' OR monto_recibido IS NOT NULL)
);
CREATE INDEX ix_venta_fecha ON venta (fecha_hora DESC) WHERE estado <> 'BORRADOR';
CREATE INDEX ix_venta_corte ON venta (corte_id);
CREATE INDEX ix_venta_sin_corte ON venta (estado) WHERE corte_id IS NULL;
CREATE INDEX ix_venta_responsable ON venta (usuario_responsable_id);

CREATE TABLE renglon_venta (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id        UUID    NOT NULL REFERENCES venta (id) ON DELETE CASCADE,
    producto_id     UUID    NOT NULL REFERENCES producto (id),
    cantidad        INTEGER NOT NULL CHECK (cantidad >= 1),
    precio_unitario dinero  NOT NULL,      -- precio al momento de la venta (RF-17-AC-2)
    subtotal        dinero  NOT NULL,
    CONSTRAINT ck_renglon_venta_subtotal CHECK (subtotal = cantidad * precio_unitario)
);
CREATE INDEX ix_renglon_venta_venta ON renglon_venta (venta_id);
CREATE INDEX ix_renglon_venta_producto ON renglon_venta (producto_id);

CREATE TABLE cancelacion_venta (
    venta_id   UUID         PRIMARY KEY REFERENCES venta (id),   -- 0..1 por venta: la cancelación es única
    motivo     VARCHAR(200) NOT NULL CHECK (btrim(motivo) <> ''),
    usuario_id UUID         NOT NULL REFERENCES usuario_tienda (usuario_id),
    fecha_hora TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE descuadre (
    id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id         UUID    NOT NULL REFERENCES venta (id) ON DELETE CASCADE,
    producto_id      UUID    NOT NULL REFERENCES producto (id),
    solicitado       INTEGER NOT NULL CHECK (solicitado >= 1),
    descontado       INTEGER NOT NULL CHECK (descontado >= 0),
    disponible_antes INTEGER CHECK (disponible_antes >= 0),
    CONSTRAINT ck_descuadre_menor CHECK (descontado < solicitado),
    CONSTRAINT uq_descuadre_venta_producto UNIQUE (venta_id, producto_id)
);

-- =====================================================================
-- Paquete pedidos
-- =====================================================================

-- Un carrito por cliente; vive en el servidor (RF-23-AC-4).
CREATE TABLE carrito (
    cliente_id UUID PRIMARY KEY REFERENCES cliente (usuario_id)
);

CREATE TABLE renglon_carrito (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id  UUID    NOT NULL REFERENCES carrito (cliente_id) ON DELETE CASCADE,
    producto_id UUID    NOT NULL REFERENCES producto (id),
    cantidad    INTEGER NOT NULL CHECK (cantidad >= 1),
    CONSTRAINT uq_renglon_carrito_producto UNIQUE (cliente_id, producto_id)
);

CREATE TABLE pedido (
    id                         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    folio                      VARCHAR(12)   NOT NULL UNIQUE
                                             DEFAULT ('PED-' || lpad(nextval('seq_folio_pedido')::text, 6, '0')),
    cliente_id                 UUID          NOT NULL REFERENCES cliente (usuario_id),
    subtotal                   dinero        NOT NULL,
    modalidad                  VARCHAR(16)   NOT NULL CHECK (modalidad IN ('RECOGER_TIENDA', 'ENVIO_DOMICILIO')),
    direccion                  VARCHAR(200),
    codigo_postal              codigo_postal,
    costo_envio                dinero        NOT NULL DEFAULT 0,   -- copiado de la configuración (RF-28-AC-3)
    total                      dinero        NOT NULL,
    estado                     VARCHAR(28)   NOT NULL DEFAULT 'PENDIENTE_PAGO'
                                             CHECK (estado IN ('PENDIENTE_PAGO', 'PAGADO', 'EXPIRADO', 'EN_PREPARACION',
                                                               'ESPERANDO_RESPUESTA_CLIENTE', 'LISTO_PARA_RECOGER',
                                                               'LISTO_PARA_ENVIAR', 'EN_CAMINO', 'ENTREGADO',
                                                               'NO_RECOGIDO', 'CANCELADO')),
    empleado_asignado_id       UUID          REFERENCES usuario_tienda (usuario_id),
    fecha_entrega_o_recoleccion DATE,
    leyenda_entrega            VARCHAR(200),
    expira_pago_en             TIMESTAMPTZ,
    CONSTRAINT ck_pedido_total CHECK (total = subtotal + costo_envio),
    CONSTRAINT ck_pedido_envio CHECK (
        modalidad <> 'ENVIO_DOMICILIO' OR (direccion IS NOT NULL AND codigo_postal IS NOT NULL)),
    CONSTRAINT ck_pedido_recoger CHECK (modalidad <> 'RECOGER_TIENDA' OR costo_envio = 0),
    CONSTRAINT ck_pedido_pendiente_expira CHECK (estado <> 'PENDIENTE_PAGO' OR expira_pago_en IS NOT NULL)
);
CREATE INDEX ix_pedido_cliente ON pedido (cliente_id, folio DESC);
CREATE INDEX ix_pedido_cola ON pedido (estado, fecha_entrega_o_recoleccion);
CREATE INDEX ix_pedido_por_expirar ON pedido (expira_pago_en) WHERE estado = 'PENDIENTE_PAGO';
CREATE INDEX ix_pedido_asignado ON pedido (empleado_asignado_id);

CREATE TABLE renglon_pedido (
    id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id             UUID    NOT NULL REFERENCES pedido (id) ON DELETE CASCADE,
    producto_id           UUID    NOT NULL REFERENCES producto (id),
    cantidad              INTEGER NOT NULL CHECK (cantidad >= 1),
    precio_unitario       dinero  NOT NULL,
    cantidad_apartada     INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_apartada >= 0),
    cantidad_faltante     INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_faltante >= 0),
    subtotal              dinero  NOT NULL,
    producto_sustituto_id UUID    REFERENCES producto (id),
    CONSTRAINT ck_renglon_pedido_subtotal CHECK (subtotal = cantidad * precio_unitario),
    CONSTRAINT ck_renglon_pedido_reparto CHECK (cantidad_apartada + cantidad_faltante <= cantidad),
    CONSTRAINT ck_renglon_pedido_sustituto CHECK (producto_sustituto_id IS DISTINCT FROM producto_id),
    CONSTRAINT uq_renglon_pedido_producto UNIQUE (pedido_id, producto_id)
);
-- Suma de apartados por producto (existencia disponible).
CREATE INDEX ix_renglon_pedido_producto ON renglon_pedido (producto_id) WHERE cantidad_apartada > 0;

CREATE TABLE historial_estado_pedido (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id  UUID         NOT NULL REFERENCES pedido (id) ON DELETE CASCADE,
    estado     VARCHAR(28)  NOT NULL CHECK (estado IN ('PENDIENTE_PAGO', 'PAGADO', 'EXPIRADO', 'EN_PREPARACION',
                                                       'ESPERANDO_RESPUESTA_CLIENTE', 'LISTO_PARA_RECOGER',
                                                       'LISTO_PARA_ENVIAR', 'EN_CAMINO', 'ENTREGADO',
                                                       'NO_RECOGIDO', 'CANCELADO')),
    usuario_id UUID         REFERENCES usuario (id),   -- nulo cuando lo cambia el worker
    fecha_hora TIMESTAMPTZ  NOT NULL DEFAULT now(),
    comentario VARCHAR(300)
);
CREATE INDEX ix_historial_pedido ON historial_estado_pedido (pedido_id, fecha_hora);

CREATE TABLE resolucion_no_recogido (
    pedido_id  UUID        PRIMARY KEY REFERENCES pedido (id),
    tipo       VARCHAR(8)  NOT NULL CHECK (tipo IN ('TOTAL', 'PARCIAL', 'NINGUNO')),
    monto      dinero,
    usuario_id UUID        NOT NULL REFERENCES usuario_tienda (usuario_id),
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_resolucion_parcial CHECK (tipo <> 'PARCIAL' OR monto > 0),
    CONSTRAINT ck_resolucion_ninguno CHECK (tipo <> 'NINGUNO' OR monto IS NULL)
);

CREATE TABLE pago (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id           UUID        NOT NULL REFERENCES pedido (id),
    monto               dinero      NOT NULL,
    estado              VARCHAR(10) NOT NULL CHECK (estado IN ('APROBADO', 'RECHAZADO')),
    -- data.id de Mercado Pago. Único: un aviso repetido no crea otro pago (RF-23).
    referencia_servicio VARCHAR(64) NOT NULL UNIQUE,
    fecha_hora          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_pago_id_pedido UNIQUE (id, pedido_id)
);
CREATE INDEX ix_pago_pedido ON pago (pedido_id);

CREATE TABLE reembolso (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id           UUID         NOT NULL REFERENCES pedido (id),
    pago_id             UUID         NOT NULL,
    monto               dinero       NOT NULL CHECK (monto > 0),
    motivo              VARCHAR(200) NOT NULL CHECK (btrim(motivo) <> ''),
    estado              VARCHAR(10)  NOT NULL DEFAULT 'SOLICITADO'
                                     CHECK (estado IN ('SOLICITADO', 'CONFIRMADO', 'FALLIDO')),
    referencia_servicio VARCHAR(64)  UNIQUE,
    fecha_hora          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- El pago que se devuelve es del mismo pedido.
    CONSTRAINT fk_reembolso_pago FOREIGN KEY (pago_id, pedido_id) REFERENCES pago (id, pedido_id)
);
CREATE INDEX ix_reembolso_pedido ON reembolso (pedido_id);
CREATE INDEX ix_reembolso_estado ON reembolso (estado, fecha_hora DESC);

-- De qué lote salió cada unidad vendida o entregada (FEFO trazable, RF-18-AC-1).
CREATE TABLE salida_lote (
    id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    renglon_venta_id  UUID    REFERENCES renglon_venta (id) ON DELETE CASCADE,
    renglon_pedido_id UUID    REFERENCES renglon_pedido (id) ON DELETE CASCADE,
    lote_id           UUID    NOT NULL REFERENCES lote (id),
    cantidad          INTEGER NOT NULL CHECK (cantidad >= 1),
    -- {xor}: pertenece a un renglón de venta o a uno de pedido, nunca a ambos.
    CONSTRAINT ck_salida_lote_xor CHECK (num_nonnulls(renglon_venta_id, renglon_pedido_id) = 1)
);
CREATE INDEX ix_salida_renglon_venta ON salida_lote (renglon_venta_id);
CREATE INDEX ix_salida_renglon_pedido ON salida_lote (renglon_pedido_id);
CREATE INDEX ix_salida_lote ON salida_lote (lote_id);

-- =====================================================================
-- Vista de existencias (atributos derivados de Producto)
-- =====================================================================
CREATE VIEW v_existencia_producto AS
SELECT p.id AS producto_id,
       COALESCE(l.fisica, 0)                                         AS existencia_fisica,
       COALESCE(a.apartado, 0)                                       AS apartado,
       GREATEST(COALESCE(l.fisica, 0) - COALESCE(l.caducada, 0) - COALESCE(a.apartado, 0), 0)
                                                                     AS existencia_disponible
FROM producto p
LEFT JOIN (
    SELECT producto_id,
           SUM(cantidad) AS fisica,
           -- Un lote que caduca hoy todavía se vende (RF-07-AC-4).
           SUM(cantidad) FILTER (WHERE fecha_caducidad < (now() AT TIME ZONE 'America/Mexico_City')::date) AS caducada
    FROM lote GROUP BY producto_id
) l ON l.producto_id = p.id
LEFT JOIN (
    SELECT rp.producto_id, SUM(rp.cantidad_apartada) AS apartado
    FROM renglon_pedido rp
    JOIN pedido pe ON pe.id = rp.pedido_id
    WHERE pe.estado NOT IN ('ENTREGADO', 'CANCELADO', 'EXPIRADO', 'NO_RECOGIDO')
    GROUP BY rp.producto_id
) a ON a.producto_id = p.id;

-- =====================================================================
-- Datos que el contrato da por existentes
-- =====================================================================
INSERT INTO configuracion_tienda
    (id, dias_seguridad, pedido_minimo_envio, costo_envio, horario_inicio, horario_fin,
     hora_limite_mismo_dia, dias_aviso_caducidad, plazo_respuesta_faltante_min)
VALUES (1, 2, 150.00, 30.00, '08:00', '21:00', '18:00', 3, 30);

INSERT INTO proveedor (nombre, tipo) VALUES
    ('Proveedor A', 'CON_BD'),
    ('Proveedor B', 'CON_BD'),
    ('Otro (ruta)', 'OTRO_RUTA');

COMMIT;
