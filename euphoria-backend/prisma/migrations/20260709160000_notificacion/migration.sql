-- Centro de notificaciones por usuario
CREATE TABLE `notificacion` (
  `id_notificacion` INTEGER NOT NULL AUTO_INCREMENT,
  `id_usuario` INTEGER NOT NULL,
  `tipo` VARCHAR(30) NOT NULL,
  `titulo` VARCHAR(120) NOT NULL,
  `mensaje` VARCHAR(255) NOT NULL,
  `url` VARCHAR(120) NULL,
  `leida` BOOLEAN NOT NULL DEFAULT false,
  `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id_notificacion`),
  INDEX `notificacion_id_usuario_idx`(`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `notificacion` ADD CONSTRAINT `notificacion_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
