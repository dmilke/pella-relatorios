-- Add the new first field used by Lançamento — Descritivo
alter table descritivos_mensais
add column if not exists atividade_desenvolvida text;
