#!/usr/bin/env bash

# scripts/doctor.sh – Pre‑flight validation for Lucky Store development environment
# --------------------------------------------------------------
# Checks:
#   • Docker daemon is running and version >= 20.10
#   • supabase CLI is installed and version >= 2.0
#   • Required ports (54321‑54324) are free
#   • node, npm, flutter commands are on $PATH
#   • Optional: git status is clean
# --------------------------------------------------------------

set -euo pipefail

# Helper to print status
info() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
error() { echo -e "\033[1;31m[ERROR]\033[0m $*"; }

# 1️⃣ Docker daemon
info "Checking Docker daemon…"
if ! docker info > /dev/null 2>&1; then
  error "Docker is not running or not installed. Please start Docker Desktop."
  exit 1
fi
DOCKER_VERSION=$(docker version --format '{{.Server.Version}}')
info "Docker version $DOCKER_VERSION"
# Require >= 20.10 (semantic compare simplified)
if [[ $(printf "%s\n" "20.10" "$DOCKER_VERSION" | sort -V | head -n1) != "20.10" ]]; then
  error "Docker version must be >= 20.10"
  exit 1
fi

# 2️⃣ Supabase CLI
info "Checking Supabase CLI…"
if ! command -v supabase > /dev/null; then
  error "Supabase CLI not found. Install via brew or npm."
  exit 1
fi
SUPABASE_VER=$(supabase --version | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+')
info "Supabase CLI version $SUPABASE_VER"
if [[ $(printf "%s\n" "2.0.0" "$SUPABASE_VER" | sort -V | head -n1) != "2.0.0" ]]; then
  error "Supabase CLI must be >= 2.0.0"
  exit 1
fi

# 3️⃣ Port availability (54321‑54324 are the default Supabase ports)
info "Checking required ports (54321‑54324)…"
for port in 54321 54322 54323 54324; do
  if lsof -i TCP:$port -s TCP:LISTEN > /dev/null 2>&1; then
    error "Port $port is already in use. Free it before proceeding."
    exit 1
  fi
  info "Port $port is free"
done

# 4️⃣ Node / npm
info "Checking node & npm…"
command -v node > /dev/null || { error "node not found"; exit 1; }
command -v npm > /dev/null || { error "npm not found"; exit 1; }
info "node $(node -v) | npm $(npm -v)"

# 5️⃣ Flutter
info "Checking flutter…"
if ! command -v flutter > /dev/null; then
  error "flutter not found. Install from https://flutter.dev"
  exit 1
fi
info "flutter $(flutter --version | head -n1)"

# 6️⃣ Optional git clean check
if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    info "Uncommitted changes detected. Consider committing or stashing before reset."
  else
    info "Git working tree is clean."
  fi
fi

info "All checks passed. You can now safely run the nuclear reset."
exit 0
