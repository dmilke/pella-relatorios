-- Fix auth_perfil() enum mismatch for users with perfil = 'apoio'
alter type perfil_acesso add value if not exists 'apoio';
