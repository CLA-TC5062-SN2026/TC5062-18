-- Datos de prueba para la Parte 2 y la Parte 3 (Postman).
-- Se cargan después de esquema_bd.sql. La contraseña de los tres es Tienda2026
-- (hash bcrypt, costo 12).
-- Los ids son fijos para usarlos en la colección de Postman.
BEGIN;

INSERT INTO usuario (id, tipo, nombre, correo, password_hash, estado) VALUES
  ('11111111-1111-4111-8111-111111111111', 'TIENDA',  'Rosa Hernández (Dueña)', 'duena@tiendinet.mx',    '$2b$12$.LwOFi4BH26YS7LHMsqobeEb6BN6zUmWYIjkn4lhU/yXw4x56ciBa', 'ACTIVO'),
  ('22222222-2222-4222-8222-222222222222', 'TIENDA',  'Luis Pérez (Empleado)',  'empleado@tiendinet.mx', '$2b$12$.LwOFi4BH26YS7LHMsqobeEb6BN6zUmWYIjkn4lhU/yXw4x56ciBa', 'ACTIVO'),
  ('33333333-3333-4333-8333-333333333333', 'CLIENTE', 'Ana Torres',             'ana@correo.mx',         '$2b$12$.LwOFi4BH26YS7LHMsqobeEb6BN6zUmWYIjkn4lhU/yXw4x56ciBa', 'ACTIVO');

INSERT INTO usuario_tienda (usuario_id, rol, activacion_enviada) VALUES
  ('11111111-1111-4111-8111-111111111111', 'DUENO',    TRUE),
  ('22222222-2222-4222-8222-222222222222', 'EMPLEADO', TRUE);

INSERT INTO cliente (usuario_id, telefono, calle, codigo_postal, aviso_privacidad_aceptado) VALUES
  ('33333333-3333-4333-8333-333333333333', '2221234567', 'Av. Juárez 120, Centro', '72000', TRUE);

INSERT INTO codigo_postal_entrega (codigo) VALUES ('72000'), ('72010');

COMMIT;
