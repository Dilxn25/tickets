-- Reserva por tandas (QR multi-uso): cuántas personas ya ingresaron con la entrada
ALTER TABLE `entrada` ADD COLUMN `cantidad_ingresada` INTEGER NOT NULL DEFAULT 0;

-- Aforo total del local por evento (para vender entradas de pie/campo hasta llenar el aforo)
ALTER TABLE `evento` ADD COLUMN `aforo_total` INTEGER NULL;
