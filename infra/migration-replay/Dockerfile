# Deterministic Migration Replay Container
# Isolated Postgres environment for reproducible migration verification
# Requirements:
# - fresh Postgres every run
# - deterministic extension state
# - reproducible ordering
# - isolated replay execution
# - CI-safe execution
# - no dependency on developer local drift

FROM supabase/postgres:15

# Install required utilities for replay, schema inspection, and failure extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client-15 \
    jq \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create required directories
RUN mkdir -p /migrations \
    && mkdir -p /replay-scripts \
    && mkdir -p /artifacts \
    && mkdir -p /failure-extraction

# Copy migrations (deterministically ordered by filename)
COPY supabase/migrations /migrations

# Copy replay infrastructure
COPY infra/migration-replay/replay.sh /replay-scripts/replay.sh
COPY infra/migration-replay/replay_single.sh /replay-scripts/replay_single.sh
COPY infra/migration-replay/extract_failure.sh /replay-scripts/extract_failure.sh
COPY infra/migration-replay/schema_snapshot.sh /replay-scripts/schema_snapshot.sh
COPY infra/migration-replay/compare_schema.sh /replay-scripts/compare_schema.sh
COPY infra/migration-replay/classify_migrations.cjs /replay-scripts/classify_migrations.cjs
COPY infra/migration-replay/replay_report.cjs /replay-scripts/replay_report.cjs
COPY infra/migration-replay/build_ownership_graph.cjs /replay-scripts/build_ownership_graph.cjs
COPY infra/migration-replay/build_function_registry.cjs /replay-scripts/build_function_registry.cjs
COPY infra/migration-replay/build_migration_dependencies.cjs /replay-scripts/build_migration_dependencies.cjs

# Make scripts executable
RUN chmod +x /replay-scripts/*.sh \
    && chmod +x /replay-scripts/*.cjs

# Set working directory
WORKDIR /replay-scripts

# Default command: run complete replay with schema verification
CMD ["/replay-scripts/replay.sh"]
