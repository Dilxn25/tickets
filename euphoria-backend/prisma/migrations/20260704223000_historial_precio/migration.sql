-- Fase 8: historial de precios.
-- Cada cambio de precio queda registrado: quién, cuándo, de cuánto a cuánto y su origen.
CREATE TABLE `historial_precio` (
    `id_historial` INTEGER NOT NULL AUTO_INCREMENT,
    `id_producto` INTEGER NOT NULL,
    `id_usuario` INTEGER NULL,
    `fecha_hora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tipo` VARCHAR(15) NOT NULL,
    `precio_anterior` DECIMAL(10, 2) NULL,
    `precio_nuevo` DECIMAL(10, 2) NOT NULL,
    `origen` VARCHAR(25) NOT NULL,

    INDEX `historial_precio_id_producto_idx`(`id_producto`),
    INDEX `historial_precio_fecha_hora_idx`(`fecha_hora`),
    PRIMARY KEY (`id_historial`),
    CONSTRAINT `HISTORIAL_PRECIO_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `producto`(`id_producto`) ON DELETE CASCADE,
    CONSTRAINT `HISTORIAL_PRECIO_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Semilla retroactiva: el precio actual de cada producto queda como punto de partida
-- para que el historial no arranque vacío.
INSERT INTO `historial_precio` (`id_producto`, `id_usuario`, `tipo`, `precio_anterior`, `precio_nuevo`, `origen`)
SELECT `id_producto`, NULL, 'base', NULL, `precio_base`, 'registro_inicial' FROM `producto`;

INSERT INTO `historial_precio` (`id_producto`, `id_usuario`, `tipo`, `precio_anterior`, `precio_nuevo`, `origen`)
SELECT `id_producto`, NULL, 'promocion', NULL, `precio_promocion`, 'registro_inicial'
FROM `producto` WHERE `estado_promocion` = 1 AND `precio_promocion` IS NOT NULL;
