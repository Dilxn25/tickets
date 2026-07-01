-- CreateTable
CREATE TABLE `billetera` (
    `id_billetera` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `saldo_actual` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `qr_publico` VARCHAR(255) NOT NULL,
    `pin_transaccional` VARCHAR(60) NULL,
    `ultima_actualizacion` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BILLETERA_id_usuario_key`(`id_usuario`),
    UNIQUE INDEX `BILLETERA_qr_publico_key`(`qr_publico`),
    PRIMARY KEY (`id_billetera`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qr_recarga` (
    `id_qr_recarga` INTEGER NOT NULL AUTO_INCREMENT,
    `id_recarga` INTEGER NOT NULL,
    `id_unico_numerico` INTEGER NOT NULL,
    `tipo` VARCHAR(20) NOT NULL,
    `contenido_qr` LONGTEXT NOT NULL,
    `imagen_qr_base64` LONGTEXT NULL,
    `fecha_generacion` DATETIME(3) NOT NULL,

    UNIQUE INDEX `qr_recarga_id_unico_numerico_key`(`id_unico_numerico`),
    INDEX `QR_RECARGA_id_recarga_fkey`(`id_recarga`),
    PRIMARY KEY (`id_qr_recarga`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recarga_billetera` (
    `id_recarga` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `id_billetera` INTEGER NOT NULL,
    `monto_recarga` DECIMAL(10, 2) NOT NULL,
    `estado` VARCHAR(30) NOT NULL,
    `comprobante_url` VARCHAR(255) NULL,
    `numero_transaccion` VARCHAR(100) NULL,
    `fecha_solicitud` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_confirmacion` DATETIME(3) NULL,

    INDEX `RECARGA_BILLETERA_id_usuario_fkey`(`id_usuario`),
    INDEX `RECARGA_BILLETERA_id_billetera_fkey`(`id_billetera`),
    PRIMARY KEY (`id_recarga`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categoria` (
    `id_categoria` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_categoria` VARCHAR(100) NOT NULL,
    `url_icono` VARCHAR(255) NULL,

    PRIMARY KEY (`id_categoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comanda` (
    `id_comanda` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cliente` INTEGER NULL,
    `id_mesero` INTEGER NOT NULL,
    `id_mesa` INTEGER NULL,
    `estado_despacho` VARCHAR(30) NOT NULL,
    `fecha_registro` DATETIME(3) NOT NULL,
    `metodo_pago` VARCHAR(50) NOT NULL DEFAULT 'Efectivo',
    `monto_recibido` DECIMAL(10, 2) NULL,
    `cambio_dado` DECIMAL(10, 2) NULL,
    `comprobante_url` VARCHAR(255) NULL,

    INDEX `COMANDA_id_cliente_fkey`(`id_cliente`),
    INDEX `COMANDA_id_mesa_fkey`(`id_mesa`),
    INDEX `COMANDA_id_mesero_fkey`(`id_mesero`),
    PRIMARY KEY (`id_comanda`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `combo_detalle` (
    `id_detalle_combo` INTEGER NOT NULL AUTO_INCREMENT,
    `id_producto_padre` INTEGER NOT NULL,
    `id_producto_hijo` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,

    INDEX `COMBO_DETALLE_id_producto_hijo_fkey`(`id_producto_hijo`),
    INDEX `COMBO_DETALLE_id_producto_padre_fkey`(`id_producto_padre`),
    PRIMARY KEY (`id_detalle_combo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detalle_comanda` (
    `id_detalle` INTEGER NOT NULL AUTO_INCREMENT,
    `id_comanda` INTEGER NOT NULL,
    `id_producto` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `precio_cobrado` DECIMAL(10, 2) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,

    INDEX `DETALLE_COMANDA_id_comanda_fkey`(`id_comanda`),
    INDEX `DETALLE_COMANDA_id_producto_fkey`(`id_producto`),
    PRIMARY KEY (`id_detalle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entrada` (
    `id_entrada` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `id_zona` INTEGER NOT NULL,
    `qr_acceso` VARCHAR(255) NOT NULL,
    `cantidad_personas` INTEGER NOT NULL DEFAULT 1,
    `estado_validacion` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `ENTRADA_qr_acceso_key`(`qr_acceso`),
    INDEX `ENTRADA_id_usuario_fkey`(`id_usuario`),
    INDEX `ENTRADA_id_zona_fkey`(`id_zona`),
    PRIMARY KEY (`id_entrada`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evento` (
    `id_evento` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_evento` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NULL,
    `url_portada` VARCHAR(255) NULL,
    `fecha_hora_inicio` DATETIME(3) NOT NULL,
    `fecha_hora_fin` DATETIME(3) NULL,
    `estado` VARCHAR(20) NOT NULL,

    PRIMARY KEY (`id_evento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mesa_espacio` (
    `id_mesa` INTEGER NOT NULL AUTO_INCREMENT,
    `id_zona` INTEGER NOT NULL,
    `numero_nombre` VARCHAR(50) NOT NULL,
    `posicion_x` DOUBLE NOT NULL,
    `posicion_y` DOUBLE NOT NULL,
    `capacidad_sillas` INTEGER NOT NULL,
    `estado_ocupacion` VARCHAR(20) NOT NULL,
    `tipo_elemento` VARCHAR(20) NOT NULL,
    `es_seleccionable` BOOLEAN NOT NULL DEFAULT true,

    INDEX `MESA_ESPACIO_id_zona_fkey`(`id_zona`),
    PRIMARY KEY (`id_mesa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prediccion_ia` (
    `id_prediccion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cliente` INTEGER NOT NULL,
    `id_producto` INTEGER NOT NULL,
    `probabilidad_exito` DECIMAL(5, 4) NOT NULL,
    `fecha_generacion` DATETIME(3) NOT NULL,

    INDEX `PREDICCION_IA_id_cliente_fkey`(`id_cliente`),
    INDEX `PREDICCION_IA_id_producto_fkey`(`id_producto`),
    PRIMARY KEY (`id_prediccion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `producto` (
    `id_producto` INTEGER NOT NULL AUTO_INCREMENT,
    `id_categoria` INTEGER NOT NULL,
    `nombre_producto` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NULL,
    `url_imagen` VARCHAR(255) NULL,
    `precio_base` DECIMAL(10, 2) NOT NULL,
    `precio_promocion` DECIMAL(10, 2) NULL,
    `estado_promocion` BOOLEAN NOT NULL DEFAULT false,
    `stock_actual` INTEGER NOT NULL,
    `es_combo` BOOLEAN NOT NULL DEFAULT false,

    INDEX `PRODUCTO_id_categoria_fkey`(`id_categoria`),
    PRIMARY KEY (`id_producto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registro_aforo` (
    `id_registro_aforo` INTEGER NOT NULL AUTO_INCREMENT,
    `id_zona` INTEGER NOT NULL,
    `id_entrada` INTEGER NULL,
    `id_recepcionista` INTEGER NOT NULL,
    `tipo_movimiento` VARCHAR(10) NOT NULL,
    `fecha_hora` DATETIME(3) NOT NULL,

    INDEX `REGISTRO_AFORO_id_entrada_fkey`(`id_entrada`),
    INDEX `REGISTRO_AFORO_id_recepcionista_fkey`(`id_recepcionista`),
    INDEX `REGISTRO_AFORO_id_zona_fkey`(`id_zona`),
    PRIMARY KEY (`id_registro_aforo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rol` (
    `id_rol` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_rol` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`id_rol`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaccion` (
    `id_transaccion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_billetera` INTEGER NOT NULL,
    `id_comanda` INTEGER NULL,
    `id_responsable` INTEGER NOT NULL,
    `tipo_operacion` VARCHAR(30) NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `fecha_hora` DATETIME(3) NOT NULL,

    INDEX `TRANSACCION_id_billetera_fkey`(`id_billetera`),
    INDEX `TRANSACCION_id_comanda_fkey`(`id_comanda`),
    INDEX `TRANSACCION_id_responsable_fkey`(`id_responsable`),
    PRIMARY KEY (`id_transaccion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `id_rol` INTEGER NOT NULL,
    `nombres` VARCHAR(100) NOT NULL,
    `apellidos` VARCHAR(100) NOT NULL,
    `ci_carnet` VARCHAR(20) NULL,
    `telefono` VARCHAR(15) NULL,
    `correo` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `pregunta_seguridad` VARCHAR(150) NULL,
    `respuesta_seguridad` VARCHAR(255) NULL,
    `url_foto_perfil` VARCHAR(255) NULL,
    `estado_cuenta` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `USUARIO_correo_key`(`correo`),
    INDEX `USUARIO_id_rol_fkey`(`id_rol`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zona` (
    `id_zona` INTEGER NOT NULL AUTO_INCREMENT,
    `id_evento` INTEGER NOT NULL,
    `nombre_zona` VARCHAR(50) NOT NULL,
    `capacidad_maxima` INTEGER NOT NULL,
    `precio_entrada_base` DECIMAL(10, 2) NOT NULL,

    INDEX `ZONA_id_evento_fkey`(`id_evento`),
    PRIMARY KEY (`id_zona`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `billetera` ADD CONSTRAINT `BILLETERA_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_recarga` ADD CONSTRAINT `QR_RECARGA_id_recarga_fkey` FOREIGN KEY (`id_recarga`) REFERENCES `recarga_billetera`(`id_recarga`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recarga_billetera` ADD CONSTRAINT `RECARGA_BILLETERA_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recarga_billetera` ADD CONSTRAINT `RECARGA_BILLETERA_id_billetera_fkey` FOREIGN KEY (`id_billetera`) REFERENCES `billetera`(`id_billetera`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comanda` ADD CONSTRAINT `COMANDA_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comanda` ADD CONSTRAINT `COMANDA_id_mesa_fkey` FOREIGN KEY (`id_mesa`) REFERENCES `mesa_espacio`(`id_mesa`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comanda` ADD CONSTRAINT `COMANDA_id_mesero_fkey` FOREIGN KEY (`id_mesero`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `combo_detalle` ADD CONSTRAINT `COMBO_DETALLE_id_producto_hijo_fkey` FOREIGN KEY (`id_producto_hijo`) REFERENCES `producto`(`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `combo_detalle` ADD CONSTRAINT `COMBO_DETALLE_id_producto_padre_fkey` FOREIGN KEY (`id_producto_padre`) REFERENCES `producto`(`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalle_comanda` ADD CONSTRAINT `DETALLE_COMANDA_id_comanda_fkey` FOREIGN KEY (`id_comanda`) REFERENCES `comanda`(`id_comanda`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalle_comanda` ADD CONSTRAINT `DETALLE_COMANDA_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `producto`(`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entrada` ADD CONSTRAINT `ENTRADA_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entrada` ADD CONSTRAINT `ENTRADA_id_zona_fkey` FOREIGN KEY (`id_zona`) REFERENCES `zona`(`id_zona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mesa_espacio` ADD CONSTRAINT `MESA_ESPACIO_id_zona_fkey` FOREIGN KEY (`id_zona`) REFERENCES `zona`(`id_zona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prediccion_ia` ADD CONSTRAINT `PREDICCION_IA_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prediccion_ia` ADD CONSTRAINT `PREDICCION_IA_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `producto`(`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto` ADD CONSTRAINT `PRODUCTO_id_categoria_fkey` FOREIGN KEY (`id_categoria`) REFERENCES `categoria`(`id_categoria`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registro_aforo` ADD CONSTRAINT `REGISTRO_AFORO_id_entrada_fkey` FOREIGN KEY (`id_entrada`) REFERENCES `entrada`(`id_entrada`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registro_aforo` ADD CONSTRAINT `REGISTRO_AFORO_id_recepcionista_fkey` FOREIGN KEY (`id_recepcionista`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registro_aforo` ADD CONSTRAINT `REGISTRO_AFORO_id_zona_fkey` FOREIGN KEY (`id_zona`) REFERENCES `zona`(`id_zona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaccion` ADD CONSTRAINT `TRANSACCION_id_billetera_fkey` FOREIGN KEY (`id_billetera`) REFERENCES `billetera`(`id_billetera`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaccion` ADD CONSTRAINT `TRANSACCION_id_comanda_fkey` FOREIGN KEY (`id_comanda`) REFERENCES `comanda`(`id_comanda`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaccion` ADD CONSTRAINT `TRANSACCION_id_responsable_fkey` FOREIGN KEY (`id_responsable`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `USUARIO_id_rol_fkey` FOREIGN KEY (`id_rol`) REFERENCES `rol`(`id_rol`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zona` ADD CONSTRAINT `ZONA_id_evento_fkey` FOREIGN KEY (`id_evento`) REFERENCES `evento`(`id_evento`) ON DELETE RESTRICT ON UPDATE CASCADE;
