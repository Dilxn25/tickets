-- Tabla de configuración del sistema (clave/valor)
-- Primer uso: % de descuento de los combos sugeridos por la IA (antes hardcodeado en 10%)
CREATE TABLE `configuracion` (
    `clave` VARCHAR(60) NOT NULL,
    `valor` VARCHAR(255) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `fecha_actualizacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`clave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Valores iniciales del panel de IA
INSERT INTO `configuracion` (`clave`, `valor`, `descripcion`) VALUES
    ('ia_descuento_combos', '10', 'Porcentaje de descuento aplicado a los combos sugeridos por la IA'),
    ('ia_sugerencias_activas', '1', 'Si las sugerencias de la IA se muestran en la toma de pedidos (1=si, 0=no)');
