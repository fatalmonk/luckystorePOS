-- Enable the HTTP extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create the trigger function for syncing new users to Neon DB
CREATE OR REPLACE FUNCTION public.handle_new_user_sync()
RETURNS trigger AS $$
BEGIN
  -- We use http() to send a POST request with the new user record to our Next.js API.
  -- In a production environment, you might fetch the URL from vault.secrets or similar,
  -- but here we hardcode the URL as per typical local development setups, or rely on a known endpoint.
  -- You should replace this URL with the production URL when deploying.
  PERFORM http((
    'POST',
    'http://host.docker.internal:3000/api/webhooks/supabase-sync',
    ARRAY[http_header('x-webhook-secret', 'my-super-secret-webhook-key')],
    'application/json',
    row_to_json(NEW)::text
  )::http_request);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_sync();
