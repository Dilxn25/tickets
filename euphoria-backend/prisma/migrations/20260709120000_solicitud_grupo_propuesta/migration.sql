-- Contrapropuesta de recepción para solicitudes de grupo grande
ALTER TABLE `solicitud_grupo` ADD COLUMN `mesas_propuestas` TEXT NULL AFTER `mesas_tentativas`;
