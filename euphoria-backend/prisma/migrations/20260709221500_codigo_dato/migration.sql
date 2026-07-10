-- Correo nuevo pendiente al cambiar de correo (se establece al verificar)
ALTER TABLE `codigo_verificacion` ADD COLUMN `dato` VARCHAR(120) NULL;
