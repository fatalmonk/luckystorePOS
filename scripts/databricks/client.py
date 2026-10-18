#!/usr/bin/env python3
"""
Databricks Read-Only Analytics & Discovery Client for Lucky Store / RetailOS.
Enforces read-only discovery guardrails as specified in GEMINI.md.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Auto-load repo-level .env.local if present
repo_root = Path(__file__).resolve().parent.parent.parent
env_local = repo_root / ".env.local"
if env_local.is_file():
    load_dotenv(env_local)

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

# Guardrail: Disallow any mutating SQL commands
MUTATION_PATTERN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|MERGE|GRANT|REVOKE|REPLACE|VACUUM|OPTIMIZE)\b",
    re.IGNORECASE,
)


def get_client() -> WorkspaceClient:
    """Initialize Databricks WorkspaceClient with auto-detected or env credentials."""
    host = os.environ.get("DATABRICKS_HOST")
    token = os.environ.get("DATABRICKS_TOKEN")
    if host and token:
        return WorkspaceClient(host=host, token=token)
    return WorkspaceClient()


def list_warehouses(client: WorkspaceClient) -> list[dict[str, Any]]:
    """List available SQL warehouses."""
    return [
        {
            "id": wh.id,
            "name": wh.name,
            "state": str(wh.state),
            "size": wh.cluster_size,
        }
        for wh in client.warehouses.list()
    ]


def get_default_warehouse_id(client: WorkspaceClient) -> str:
    """Find the first available SQL warehouse or raise an error."""
    warehouses = list(client.warehouses.list())
    if not warehouses:
        raise RuntimeError("No SQL warehouses found in the active Databricks workspace.")
    return warehouses[0].id


def list_catalogs(client: WorkspaceClient) -> list[str]:
    """List accessible Unity Catalog catalogs."""
    return [c.name for c in client.catalogs.list() if c.name]


def list_schemas(client: WorkspaceClient, catalog: str) -> list[str]:
    """List schemas in a specific catalog."""
    return [s.name for s in client.schemas.list(catalog_name=catalog) if s.name]


def list_tables(client: WorkspaceClient, catalog: str, schema: str) -> list[dict[str, Any]]:
    """List tables and views in a specific catalog and schema."""
    tables = client.tables.list(catalog_name=catalog, schema_name=schema)
    return [
        {
            "name": t.name,
            "table_type": str(t.table_type),
            "format": t.data_source_format,
            "comment": t.comment,
        }
        for t in tables
        if t.name
    ]


def execute_read_only_query(
    client: WorkspaceClient,
    statement: str,
    warehouse_id: str | None = None,
    catalog: str | None = None,
    schema: str | None = None,
    wait_timeout: str = "30s",
) -> dict[str, Any]:
    """
    Execute a read-only SQL query against a SQL warehouse.
    Rejects destructive/mutation statements.
    """
    cleaned = statement.strip()
    if MUTATION_PATTERN.search(cleaned):
        raise ValueError(
            "Guardrail Violation: Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are permitted."
        )

    wh_id = warehouse_id or get_default_warehouse_id(client)

    response = client.statement_execution.execute_statement(
        warehouse_id=wh_id,
        statement=cleaned,
        catalog=catalog,
        schema=schema,
        wait_timeout=wait_timeout,
    )

    if response.status.state != StatementState.SUCCEEDED:
        err_msg = response.status.error.message if response.status.error else "Unknown error"
        raise RuntimeError(f"Query failed ({response.status.state}): {err_msg}")

    columns = [col.name for col in response.manifest.schema.columns]
    rows = response.result.data_array or []

    return {
        "statement_id": response.statement_id,
        "columns": columns,
        "rows": rows,
        "row_count": len(rows),
    }


def main():
    parser = argparse.ArgumentParser(description="Lucky Store Databricks Analytics & Discovery Client")
    parser.add_argument("--discover", action="store_true", help="Discover catalogs, schemas, and warehouses")
    parser.add_argument("--tables", metavar="CATALOG.SCHEMA", help="List tables in catalog.schema")
    parser.add_argument("--query", metavar="SQL", help="Execute a read-only SQL query")
    parser.add_argument("--catalog", help="Optional catalog context for query")
    parser.add_argument("--schema", help="Optional schema context for query")
    parser.add_argument("--warehouse", help="Optional warehouse ID")

    args = parser.parse_args()
    client = get_client()

    if args.discover:
        print("=== Databricks Compute Warehouses ===")
        for wh in list_warehouses(client):
            print(f"- {wh['name']} (ID: {wh['id']}, State: {wh['state']}, Size: {wh['size']})")

        print("\n=== Unity Catalogs & Schemas ===")
        for cat in list_catalogs(client):
            try:
                schemas = list_schemas(client, cat)
                print(f"Catalog [{cat}]: {', '.join(schemas)}")
            except Exception as e:
                print(f"Catalog [{cat}]: (Access error: {e})")

    elif args.tables:
        parts = args.tables.split(".")
        if len(parts) != 2:
            print("Error: --tables must be formatted as <catalog>.<schema>", file=sys.stderr)
            sys.exit(1)
        cat, sch = parts
        tables = list_tables(client, cat, sch)
        print(f"=== Tables in {cat}.{sch} ({len(tables)} found) ===")
        for t in tables:
            print(f"- {t['name']} [{t['table_type']}]")

    elif args.query:
        print(f"Executing: {args.query}")
        result = execute_read_only_query(
            client,
            args.query,
            warehouse_id=args.warehouse,
            catalog=args.catalog,
            schema=args.schema,
        )
        print(f"\nResult ({result['row_count']} rows):")
        print(" | ".join(result["columns"]))
        print("-" * 50)
        for r in result["rows"][:25]:
            print(" | ".join(str(val) for val in r))
        if result["row_count"] > 25:
            print(f"... and {result['row_count'] - 25} more rows")
    else:
        # Default action: quick status check
        me = client.current_user.me()
        print(f"Connected to Databricks as: {me.user_name}")
        print("Use --discover to view warehouses and catalogs, or --query '<sql>' to test queries.")


if __name__ == "__main__":
    main()
