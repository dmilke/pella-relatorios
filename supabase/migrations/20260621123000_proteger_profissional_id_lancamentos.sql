-- Force professionals to use their own authenticated user id in launch tables.
create or replace function public.force_profissional_id_for_lancamentos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.auth_perfil() = 'profissional' then
    new.profissional_id := public.auth_usuario_id();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_force_profissional_id_registros_atividade on registros_atividade;
create trigger trg_force_profissional_id_registros_atividade
before insert or update on registros_atividade
for each row execute function public.force_profissional_id_for_lancamentos();

drop trigger if exists trg_force_profissional_id_descritivos_mensais on descritivos_mensais;
create trigger trg_force_profissional_id_descritivos_mensais
before insert or update on descritivos_mensais
for each row execute function public.force_profissional_id_for_lancamentos();
