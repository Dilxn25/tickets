-- Registro de sugerencias de la IA para medir su efectividad REAL:
-- cada recomendación mostrada al mesero se guarda; si la agrega al pedido, se marca aceptada.
CREATE TABLE `sugerencia_ia` (
    `id_sugerencia` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha_hora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `id_producto` INTEGER NOT NULL,
    `nombre_producto` VARCHAR(120) NOT NULL,
    `probabilidad` DECIMAL(5, 4) NULL,
    `id_mesero` INTEGER NULL,
    `aceptada` BOOLEAN NOT NULL DEFAULT false,

    INDEX `sugerencia_ia_fecha_hora_idx`(`fecha_hora`),
    INDEX `sugerencia_ia_id_producto_idx`(`id_producto`),
    PRIMARY KEY (`id_sugerencia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
