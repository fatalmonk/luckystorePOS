-- Drop the webhook trigger that was syncing Supabase to Neon
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user_sync();
