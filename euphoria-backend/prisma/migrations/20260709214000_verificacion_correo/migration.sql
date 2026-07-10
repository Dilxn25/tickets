-- Verificación de correo: bandera en usuario + tabla de códigos
ALTER TABLE `usuario` ADD COLUMN `correo_verificado` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `codigo_verificacion` (
  `id_codigo` INTEGER NOT NULL AUTO_INCREMENT,
  `id_usuario` INTEGER NOT NULL,
  `codigo` VARCHAR(6) NOT NULL,
  `proposito` VARCHAR(20) NOT NULL,
  `expira` DATETIME(3) NOT NULL,
  `usado` BOOLEAN NOT NULL DEFAULT false,
  `intentos` INTEGER NOT NULL DEFAULT 0,
  `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id_codigo`),
  INDEX `CODIGO_VERIF_id_usuario_fkey`(`id_usuario`),
  CONSTRAINT `CODIGO_VERIF_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
