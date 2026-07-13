-- Depósitos ACH del correo del banco (segunda validación de recargas)
CREATE TABLE `deposito_correo` (
  `id_deposito` INTEGER NOT NULL AUTO_INCREMENT,
  `orden_ach` VARCHAR(40) NOT NULL,
  `monto` DECIMAL(10, 2) NOT NULL,
  `glosa` VARCHAR(200) NULL,
  `originante` VARCHAR(150) NULL,
  `banco_origen` VARCHAR(100) NULL,
  `fecha_transaccion` DATETIME(3) NOT NULL,
  `usado` BOOLEAN NOT NULL DEFAULT false,
  `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `deposito_correo_orden_ach_key`(`orden_ach`),
  PRIMARY KEY (`id_deposito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
