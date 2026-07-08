-- Fase A: cimientos de atencion (vinculo pedido-reserva, origen, prioridad de zona,
-- cliente VIP y asignacion mesa<->mesero). Cambios solo aditivos.

ALTER TABLE `usuario` ADD COLUMN `es_vip` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `zona` ADD COLUMN `prioridad` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `comanda` ADD COLUMN `id_entrada` INTEGER NULL;
ALTER TABLE `comanda` ADD COLUMN `origen` VARCHAR(20) NOT NULL DEFAULT 'mesero';
CREATE INDEX `COMANDA_id_entrada_fkey` ON `comanda`(`id_entrada`);
ALTER TABLE `comanda` ADD CONSTRAINT `COMANDA_id_entrada_fkey`
  FOREIGN KEY (`id_entrada`) REFERENCES `entrada`(`id_entrada`)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `asignacion_mesa` (
  `id_asignacion` INTEGER NOT NULL AUTO_INCREMENT,
  `id_mesa` INTEGER NOT NULL,
  `id_entrada` INTEGER NULL,
  `id_mesero` INTEGER NOT NULL,
  `estado` VARCHAR(20) NOT NULL DEFAULT 'asignada',
  `fecha_asignacion` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id_asignacion`),
  INDEX `ASIGNACION_id_mesa_fkey`(`id_mesa`),
  INDEX `ASIGNACION_id_mesero_fkey`(`id_mesero`),
  INDEX `ASIGNACION_id_entrada_fkey`(`id_entrada`),
  CONSTRAINT `ASIGNACION_id_mesa_fkey` FOREIGN KEY (`id_mesa`) REFERENCES `mesa_espacio`(`id_mesa`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ASIGNACION_id_mesero_fkey` FOREIGN KEY (`id_mesero`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ASIGNACION_id_entrada_fkey` FOREIGN KEY (`id_entrada`) REFERENCES `entrada`(`id_entrada`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
