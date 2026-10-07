-- CIMIENTO — PRIMER ADMINISTRADOR. Se ejecuta UNA vez, después de las migraciones y semillas.
-- 1) En Supabase: Authentication → Users → "Add user" → "Create new user":
--      Email:    admin@cimiento.app        (si cambiaste VITE_AUTH_EMAIL_DOMAIN, usa ese dominio: usuario@TU-DOMINIO)
--      Password: una contraseña TEMPORAL (en el primer acceso la aplicación te obliga a cambiarla)
--      Marca "Auto Confirm User".
-- 2) Ejecuta este archivo en el SQL Editor. Crea el perfil de Administrador para ese usuario.
-- Sin secretos: no contiene contraseñas.
insert into profiles (id, username, display_name, role, must_change_password)
select id, split_part(email, '@', 1), 'Administrador', 'ADMINISTRADOR', true
from auth.users
where email = 'admin@cimiento.app'
on conflict (id) do nothing;

-- Comprobación: debe devolver 1 fila.
select username, role, active, must_change_password from profiles where role = 'ADMINISTRADOR';
