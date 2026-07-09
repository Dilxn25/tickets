-- Solicitud de reserva de grupo grande (cliente -> recepción)
CREATE TABLE `solicitud_grupo` (
  `id_solicitud` INTEGER NOT NULL AUTO_INCREMENT,
  `id_cliente` INTEGER NOT NULL,
  `id_evento` INTEGER NOT NULL,
  `cantidad_personas` INTEGER NOT NULL DEFAULT 1,
  `motivo` VARCHAR(255) NULL,
  `mesas_tentativas` TEXT NULL,
  `estado` VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  `fecha_solicitud` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id_solicitud`),
  INDEX `solicitud_grupo_id_cliente_idx`(`id_cliente`),
  INDEX `solicitud_grupo_id_evento_idx`(`id_evento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `solicitud_grupo` ADD CONSTRAINT `solicitud_grupo_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `solicitud_grupo` ADD CONSTRAINT `solicitud_grupo_id_evento_fkey` FOREIGN KEY (`id_evento`) REFERENCES `evento`(`id_evento`) ON DELETE RESTRICT ON UPDATE CASCADE;
