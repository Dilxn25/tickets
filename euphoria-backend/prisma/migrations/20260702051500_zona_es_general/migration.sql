-- Zona de entrada general / de pie (campo): se vende como entrada general (1 persona)
-- hasta su capacidad, sin asientos en el mapa.
ALTER TABLE `zona` ADD COLUMN `es_general` BOOLEAN NOT NULL DEFAULT false;
