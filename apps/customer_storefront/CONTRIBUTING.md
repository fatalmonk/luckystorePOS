# Contributing

1. Fork the repo
2. Create branch: `git checkout -b feat/name`
3. Commit with clear messages
4. Push and open PR
5. Ensure CI passes

## PR Requirements
- TypeScript validation passes (`npm run typecheck --workspace=apps/customer_storefront`)
- Unit tests pass (`npx vitest run --root apps/customer_storefront`)
- Production build succeeds (`npm run build --workspace=apps/customer_storefront`)

