  await client.query(`
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'storm-local@example.invalid') THEN
        INSERT INTO auth.users (
          id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), 'authenticated', 'authenticated',
          'storm-local@example.invalid', 'not-used', now(),
          '{"role":"service_role"}'::jsonb, '{}'::jsonb, now(), now()
        );
      END IF;
    END \$\$;
  `);
