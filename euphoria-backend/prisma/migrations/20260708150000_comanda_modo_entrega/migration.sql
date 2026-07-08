-- Fase C: modo de entrega del pedido del cliente (barra = recoge / llevar = a la mesa).
-- Nullable: para pedidos de mesero/caja no aplica.
ALTER TABLE `comanda` ADD COLUMN `modo_entrega` VARCHAR(20) NULL;
