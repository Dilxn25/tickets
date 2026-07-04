-- Vínculo zona → plantilla de plano: permite avisar al borrar un plano
-- qué eventos lo usan y borrar en cascada si el admin confirma.
ALTER TABLE `zona` ADD COLUMN `id_plantilla` INTEGER NULL;
