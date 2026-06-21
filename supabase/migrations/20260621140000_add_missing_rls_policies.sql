-- Add missing SELECT policy for registros_atividade
create policy "registros_select"
  on registros_atividade for select
  using (
    auth_perfil() = any (array['admin'::perfil_acesso, 'apoio_lancamento'::perfil_acesso, 'analista'::perfil_acesso])
    or profissional_id = auth.uid()
  );

-- Add missing UPDATE policy for registros_atividade
create policy "registros_update"
  on registros_atividade for update
  using (
    auth_perfil() = any (array['admin'::perfil_acesso, 'apoio_lancamento'::perfil_acesso])
    or profissional_id = auth.uid()
  )
  with check (
    auth_perfil() = any (array['admin'::perfil_acesso, 'apoio_lancamento'::perfil_acesso])
    or profissional_id = auth.uid()
  );

-- Add missing DELETE policy for registros_atividade
create policy "registros_delete"
  on registros_atividade for delete
  using (
    auth_perfil() = any (array['admin'::perfil_acesso, 'apoio_lancamento'::perfil_acesso])
  );

-- Add missing SELECT policy for descritivos_mensais
create policy "descritivos_select"
  on descritivos_mensais for select
  using (
    auth_perfil() = any (array['admin'::perfil_acesso, 'apoio_lancamento'::perfil_acesso])
    or profissional_id = auth.uid()
  );

-- Add missing DELETE policy for descritivos_mensais
create policy "descritivos_delete"
  on descritivos_mensais for delete
  using (
    auth_perfil() = any (array['admin'::perfil_acesso, 'apoio_lancamento'::perfil_acesso])
  );
