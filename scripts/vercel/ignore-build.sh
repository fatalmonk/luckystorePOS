#!/usr/bin/env bash

# Vercel ignored-build commands run from a project's configured root directory.
# Resolve the repository root so path checks work for either monorepo project.
project="${1:-}"
case "$project" in
  storefront)
    app_path="apps/customer_storefront"
    if [[ "${VERCEL_ENV:-}" == "production" ]]; then
      echo "Skipping customer storefront production on Vercel; Hostinger serves production."
      exit 0
    fi
    ;;
  admin)
    app_path="apps/admin_web"
    ;;
  *)
    echo "Unknown Vercel project kind: ${project:-<empty>}" >&2
    exit 1
    ;;
esac

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "Could not locate the Git repository; allowing the build." >&2
  exit 1
}
cd "$repo_root" || exit 1

base_commit="$(git rev-parse --verify 'HEAD^' 2>/dev/null)" || {
  echo "No parent commit is available; allowing the build."
  exit 1
}
changed_paths="$(git diff --name-only "$base_commit" HEAD)" || {
  echo "Could not compare Git commits; allowing the build." >&2
  exit 1
}

needs_build=0
while IFS= read -r path; do
  case "$path" in
    ''|*.md|*.mdx|*.MD|*.MDX)
      continue
      ;;
  esac

  case "$path" in
    "$app_path"/*|package.json|package-lock.json|npm-shrinkwrap.json|.npmrc|tsconfig.json|packages/*)
      needs_build=1
      break
      ;;
  esac

  if [[ "$project" == "admin" ]]; then
    case "$path" in
      landing/*.html|vercel.json|.vercelignore)
        needs_build=1
        break
        ;;
    esac
  fi
done <<< "$changed_paths"

if [[ "$needs_build" == 1 ]]; then
  echo "Relevant ${project} runtime inputs changed; running the Vercel build."
  exit 1
fi

echo "No relevant ${project} runtime inputs changed; skipping the Vercel build."
exit 0
