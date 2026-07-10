-- Solicitudes de retiro de billetera (cliente pide, cajero paga en efectivo)
CREATE TABLE `solicitud_retiro` (
  `id_solicitud` INTEGER NOT NULL AUTO_INCREMENT,
  `id_cliente` INTEGER NOT NULL,
  `mensaje` VARCHAR(400) NULL,
  `metodo` VARCHAR(20) NOT NULL,
  `qr_imagen` VARCHAR(255) NULL,
  `estado` VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  `saldo_al_solicitar` DECIMAL(10,2) NOT NULL,
  `monto_retirado` DECIMAL(10,2) NULL,
  `monto_entregado` DECIMAL(10,2) NULL,
  `diferencia` DECIMAL(10,2) NULL,
  `id_cajero` INTEGER NULL,
  `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `fecha_pago` DATETIME(3) NULL,
  PRIMARY KEY (`id_solicitud`),
  INDEX `RETIRO_id_cliente_fkey`(`id_cliente`),
  INDEX `RETIRO_id_cajero_fkey`(`id_cajero`),
  CONSTRAINT `RETIRO_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RETIRO_id_cajero_fkey` FOREIGN KEY (`id_cajero`) REFERENCES `usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
