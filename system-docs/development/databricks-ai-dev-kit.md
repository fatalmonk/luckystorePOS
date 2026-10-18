# Databricks AI Dev Kit for Lucky Store

This repository tracks the Databricks skill policy and installation recipe, not generated skill copies or machine-local CLI state.

## Scope

Databricks is an optional analytics, data-processing, and AI/ML surface. Supabase remains Lucky Store's transactional source of truth.

The workspace uses 17 Databricks skills and 8 MLflow skills:

- Foundations: `databricks-core`, `databricks-docs`, `databricks-python-sdk`, `databricks-unity-catalog`
- Data and analytics: `databricks-data-discovery`, `databricks-dbsql`, `databricks-metric-views`, `databricks-aibi-dashboards`
- Orchestration: `databricks-jobs`, `databricks-dabs`, `databricks-pipelines`, `databricks-lakeflow-connect`
- AI/ML: `databricks-ai-functions`, `databricks-model-serving`, `databricks-vector-search`, `databricks-synthetic-data-gen`, `databricks-unstructured-pdf-generation`
- MLflow: `agent-evaluation`, `analyze-mlflow-chat-session`, `analyze-mlflow-trace`, `instrumenting-with-mlflow-tracing`, `mlflow-onboarding`, `querying-mlflow-metrics`, `retrieving-mlflow-traces`, `searching-mlflow-docs`

## Install

Install Databricks CLI first. From the repository root, install the pinned AI Dev Kit release and selected skills:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/databricks-solutions/ai-dev-kit/main/install.sh) \
  --branch v0.2.30 \
  --tools claude,cursor,copilot,codex,gemini \
  --skills databricks-core,databricks-docs,databricks-python-sdk,databricks-unity-catalog,databricks-data-discovery,databricks-dbsql,databricks-jobs,databricks-dabs,databricks-pipelines,databricks-lakeflow-connect,databricks-metric-views,databricks-aibi-dashboards,databricks-ai-functions,databricks-model-serving,databricks-vector-search,databricks-synthetic-data-gen,databricks-unstructured-pdf-generation,agent-evaluation,analyze-mlflow-chat-session,analyze-mlflow-trace,instrumenting-with-mlflow-tracing,mlflow-onboarding,querying-mlflow-metrics,retrieving-mlflow-traces,searching-mlflow-docs
```

Review upstream installer changes before changing the pinned release. Do not hand-edit vendored skill files.

## Authentication

Authentication is local and must never be committed:

```bash
databricks auth login --profile DEFAULT
databricks auth profiles
```

Verify the active profile and target before any remote write, job run, deployment, or resource creation.

## Update and verify

Check the managed Databricks skills without changing files:

```bash
databricks aitools update --scope project --check --no-new
```

List installed versions:

```bash
databricks aitools list -o json
```

Because the installer also distributes MLflow skills and compatibility copies for multiple agents, rerun the pinned install command to refresh the complete selected set. Do not use an unconstrained update that auto-installs newly published skills.

## Git policy

Track this policy and the corresponding `.gitignore` rules. Keep these generated or machine-local paths out of Git:

- `.ai-dev-kit/`
- `.databricks/`
- `.gemini/`
- `.github/skills/`
- `GEMINI.md`
- Databricks and MLflow skill copies placed beneath the already ignored `.agents/`, `.claude/`, and `.cursor/` trees
- `~/.databrickscfg` and all credentials

Never force-add these paths. A clean checkout should recreate them with the pinned install command.

## Lucky Store guardrails

- Start with read-only discovery.
- Never put secrets, production connection strings, customer data, payment data, or tenant-sensitive records into prompts, notebooks, logs, traces, or generated fixtures.
- Use synthetic or de-identified data for experiments.
- Preserve tenant isolation in every query, dataset, model, and evaluation.
- AI/ML output must not directly authorize financial, pricing, inventory, or other sensitive mutations.
- Follow `AGENTS.md`, repository security controls, and deterministic application validation.
