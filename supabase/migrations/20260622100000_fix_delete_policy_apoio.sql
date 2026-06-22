-- Fix DELETE policy for registros_atividade to use correct 'apoio' enum value
drop policy if exists "registros_delete" on registros_atividade;

create policy "registros_delete"
  on registros_atividade for delete
  using (
    auth_perfil() = any (array['admin'::perfil_acesso, 'apoio'::perfil_acesso, 'analista'::perfil_acesso])
  );

-- Fix DELETE policy for descritivos_mensais to use correct 'apoio' enum value
drop policy if exists "descritivos_delete" on descritivos_mensais;

create policy "descritivos_delete"
  on descritivos_mensais for delete
  using (
    auth_perfil() = any (array['admin'::perfil_acesso, 'apoio'::perfil_acesso])
  );