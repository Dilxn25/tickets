-- Fase E: reasignación por tiempo.
-- fecha_listo: cuándo el bartender marcó el pedido Listo (para medir la espera de recojo).
-- estado_entrega: pendiente | en_pool | entregado (para liberar/tomar del pool).
ALTER TABLE `comanda` ADD COLUMN `fecha_listo` DATETIME(3) NULL;
ALTER TABLE `comanda` ADD COLUMN `estado_entrega` VARCHAR(20) NOT NULL DEFAULT 'pendiente';
