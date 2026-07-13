-- Retiros: comprobante del cajero al pagar por QR (constancia para el cliente)
-- y motivo del rechazo (para el reporte de rechazados).
ALTER TABLE `solicitud_retiro`
  ADD COLUMN `comprobante_pago` VARCHAR(255) NULL,
  ADD COLUMN `motivo_rechazo` VARCHAR(255) NULL;
