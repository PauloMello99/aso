-- No-op deliberado: o valor original de trial_consumed por linha não foi preservado
-- antes do UP, e restaurar trial_consumed=true em massa recriaria o bug que esta
-- migration corrige. Reversão real (se necessária) é caso a caso via comp manual
-- no painel /admin (super_admin).
SELECT 1;
