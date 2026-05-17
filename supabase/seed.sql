-- Seed data for Lucky Store POS local development
-- This file is executed after migrations during 'supabase db reset'

-- 1. Create Default Tenant
INSERT INTO public.tenants (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Local Development Tenant', 'local-dev')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Default Store
INSERT INTO public.stores (id, code, name, tenant_id)
VALUES ('00000000-0000-0000-0000-00000000000a', 'LST-LOCAL', 'Lucky Store Local', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Seeded Admin User
-- admin@local.dev / localdev123
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@local.dev',
    crypt('localdev123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Local Admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- 4. Create Identity for the User
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000000', 'admin@local.dev')::jsonb,
    'email',
    '00000000-0000-0000-0000-000000000000',
    now(),
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- 5. Create Public User Profile
INSERT INTO public.users (
    id,
    auth_id,
    email,
    name,
    role,
    store_id,
    tenant_id
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'admin@local.dev',
    'Local Admin',
    'admin',
    '00000000-0000-0000-0000-00000000000a',
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;
