-- Premio por completar el perfil: null = aún no otorgado, 'pendiente' = por usar, 'usado'
ALTER TABLE `usuario` ADD COLUMN `premio_perfil` VARCHAR(20) NULL;

-- Solicitudes "no recuerdo nada": el cliente deja datos de identidad y el admin valida y resetea
CREATE TABLE `solicitud_recuperacion` (
    `id_solicitud` INTEGER NOT NULL AUTO_INCREMENT,
    `correo` VARCHAR(100) NOT NULL,
    `nombre_contacto` VARCHAR(120) NULL,
    `ci_contacto` VARCHAR(20) NULL,
    `telefono` VARCHAR(20) NULL,
    `mensaje` VARCHAR(400) NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    `fecha_solicitud` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_atencion` DATETIME(3) NULL,

    INDEX `solicitud_recuperacion_estado_idx`(`estado`),
    PRIMARY KEY (`id_solicitud`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
