# Frontend State Architecture

## Recommended Stack
| Tool | Purpose |
|------|---------|
| Zustand | local UI state |
| TanStack Query | server cache |
| Context | auth/session only |

## Avoid
- massive useEffect chains
- deep prop drilling
- duplicated fetch logic
- component-owned API orchestration

## Query Standards
Every query must define:
- loading
- empty
- retry
- error
- stale state
