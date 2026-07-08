-- Cuántas personas entraron/salieron en cada movimiento (para el historial
-- de entradas del cliente: "entraron 4, luego 3"). Default 1 por compatibilidad.
ALTER TABLE `registro_aforo` ADD COLUMN `cantidad` INTEGER NOT NULL DEFAULT 1;
