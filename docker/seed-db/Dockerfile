# Dockerfile for seeding Supabase database for Lucky Store
# Uses the Supabase CLI to apply an initial data SQL script.
# Build image and run to populate DB in CI or locally.

FROM supabase/cli:latest AS supabase-cli

# Copy the seed script into the image
COPY scripts/seed/initial_data.sql /seed/initial_data.sql

# Entry point runs the Supabase migration against the provided DATABASE_URL.
# The DATABASE_URL env var must be set at runtime.
ENTRYPOINT ["supabase", "db", "reset", "--file", "/seed/initial_data.sql"]
