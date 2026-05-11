# Privilege Boundaries

- **Database**: RLS (Row Level Security) defines the primary boundary.
- **Service Role**: `SUPABASE_SERVICE_ROLE_KEY` is strictly for server-side/admin operations.
- **Public RPCs**: Restricted to authenticated users with specific roles.
- **Local Access**: Local developer environments are forbidden from using production keys.
