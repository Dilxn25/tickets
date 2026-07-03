-- Fase 3: tipo de evento + nuevos estados en español

-- Tipo de evento (etiqueta): estandar / especial / externo
ALTER TABLE `evento` ADD COLUMN `tipo_evento` VARCHAR(20) NOT NULL DEFAULT 'estandar';

-- Estado por defecto para nuevos eventos
ALTER TABLE `evento` MODIFY `estado` VARCHAR(20) NOT NULL DEFAULT 'planificacion';

-- Migrar estados antiguos a los nuevos identificadores
UPDATE `evento` SET `estado` = 'planificacion' WHERE `estado` = 'planificado';
UPDATE `evento` SET `estado` = 'promocion'     WHERE `estado` = 'activo';
UPDATE `evento` SET `estado` = 'terminado'     WHERE `estado` = 'finalizado';
